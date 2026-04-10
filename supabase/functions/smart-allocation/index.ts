import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── NLP & Similarity Utilities ────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','can','this',
  'that','these','those','i','you','he','she','it','we','they','me','him',
  'her','us','them','my','your','his','its','our','their','what','which',
  'who','whom','how','when','where','why','not','no','nor','so','if','then',
  'than','too','very','just','about','above','after','again','all','also',
  'am','any','because','before','between','both','each','few','from','further',
  'get','got','here','into','more','most','no','only','other','out','over',
  'own','same','some','such','there','through','under','until','up','while',
]);

/** Tokenize text into normalized terms, removing stop words */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/** Generate character n-grams for fuzzy matching */
function ngrams(word: string, n = 3): Set<string> {
  const padded = `$$${word}$$`;
  const grams = new Set<string>();
  for (let i = 0; i <= padded.length - n; i++) {
    grams.add(padded.slice(i, i + n));
  }
  return grams;
}

/** Jaccard similarity between two n-gram sets (0-1) */
function ngramSimilarity(a: string, b: string): number {
  const ga = ngrams(a.toLowerCase());
  const gb = ngrams(b.toLowerCase());
  let intersection = 0;
  for (const g of ga) if (gb.has(g)) intersection++;
  const union = ga.size + gb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getProjectCategory(project: any): string {
  if (typeof project?.category === 'string' && project.category.trim()) {
    return project.category.trim();
  }

  if (Array.isArray(project?.keywords) && project.keywords.length > 0) {
    return String(project.keywords[0] || '').trim();
  }

  return '';
}

function researchAreaMatchesCategory(category: string, researchArea: string): boolean {
  const normalizedCategory = normalizeLabel(category);
  const normalizedArea = normalizeLabel(researchArea);

  if (!normalizedCategory || !normalizedArea) return false;
  if (normalizedArea.includes(normalizedCategory) || normalizedCategory.includes(normalizedArea)) return true;

  const categoryTerms = normalizedCategory.split(' ').filter(term => term.length > 2);
  const areaTerms = normalizedArea.split(' ').filter(term => term.length > 2);

  if (categoryTerms.some(term => areaTerms.includes(term))) return true;

  return ngramSimilarity(normalizedArea, normalizedCategory) > 0.45;
}

function getMatchingSupervisors(project: any, supervisors: any[], maxProjectsDefault: number) {
  const projectCategory = getProjectCategory(project);

  if (!projectCategory) {
    return { projectCategory, matchingSupervisors: [] as any[] };
  }

  const matchingSupervisors = supervisors.filter((supervisor) => {
    const maxAllowed = supervisor.max_projects || maxProjectsDefault;
    if ((supervisor.current_projects || 0) >= maxAllowed) return false;

    const researchAreas = Array.isArray(supervisor.research_areas) ? supervisor.research_areas : [];
    if (researchAreas.length === 0) return false;

    return researchAreas.some((area: string) => researchAreaMatchesCategory(projectCategory, area));
  });

  return { projectCategory, matchingSupervisors };
}

/** Build TF-IDF vectors from a corpus of documents */
function buildTfIdf(documents: string[][]): { vectors: Map<string, number>[]; idf: Map<string, number> } {
  const N = documents.length;
  const df = new Map<string, number>();

  // Document frequency
  for (const doc of documents) {
    const seen = new Set(doc);
    for (const term of seen) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  // IDF with smoothing
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
  }

  // TF-IDF vectors
  const vectors = documents.map(doc => {
    const tf = new Map<string, number>();
    for (const term of doc) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    const vec = new Map<string, number>();
    for (const [term, count] of tf) {
      vec.set(term, (count / doc.length) * (idf.get(term) || 1));
    }
    return vec;
  });

  return { vectors, idf };
}

/** Cosine similarity between two TF-IDF vectors (0-1) */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  for (const [term, val] of a) {
    magA += val * val;
    if (b.has(term)) dot += val * b.get(term)!;
  }
  for (const [, val] of b) magB += val * val;
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
}

// ─── Hungarian Algorithm for Optimal Bipartite Matching ────────────────────────

/**
 * Solves the assignment problem using the Hungarian (Kuhn-Munkres) algorithm.
 * costMatrix[i][j] = cost of assigning project i to supervisor j.
 * We convert similarity scores to costs by subtracting from max.
 * Returns array of [projectIdx, supervisorIdx] pairs.
 */
function hungarianAlgorithm(scoreMatrix: number[][]): [number, number][] {
  const n = scoreMatrix.length;
  const m = scoreMatrix[0]?.length || 0;
  if (n === 0 || m === 0) return [];

  // Pad to square matrix
  const size = Math.max(n, m);
  const maxVal = Math.max(...scoreMatrix.flat(), 1);
  
  // Convert to cost matrix (maximize → minimize)
  const cost: number[][] = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) =>
      i < n && j < m ? maxVal - scoreMatrix[i][j] : maxVal
    )
  );

  // Hungarian algorithm
  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);

  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);

    do {
      used[j0] = true;
      let i0 = p[j0];
      let delta = Infinity;
      let j1 = -1;

      for (let j = 1; j <= size; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= size; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  // Extract assignments (only original rows/cols)
  const result: [number, number][] = [];
  for (let j = 1; j <= size; j++) {
    if (p[j] > 0 && p[j] - 1 < n && j - 1 < m) {
      const projIdx = p[j] - 1;
      const supIdx = j - 1;
      if (scoreMatrix[projIdx][supIdx] > 0) {
        result.push([projIdx, supIdx]);
      }
    }
  }
  return result;
}

// ─── Smart Scoring Engine ──────────────────────────────────────────────────────

interface ScoringResult {
  score: number;
  reasons: string[];
  breakdown: {
    tfidfSimilarity: number;
    keywordMatch: number;
    fuzzyMatch: number;
    departmentMatch: number;
    workloadBalance: number;
  };
}

/**
 * Modern multi-factor scoring for project-supervisor matching.
 * Weights: TF-IDF (35%) | Keywords (25%) | Fuzzy (10%) | Department (15%) | Workload (15%)
 */
function scoreMatch(
  project: any,
  supervisor: any,
  projectVector: Map<string, number> | null,
  supervisorVector: Map<string, number> | null,
  currentLoad: number,
  maxProjects: number
): ScoringResult {
  const reasons: string[] = [];
  let tfidfScore = 0, keywordScore = 0, fuzzyScore = 0, deptScore = 0, workloadScore = 0;
  const projectCategory = getProjectCategory(project);

  // 1. TF-IDF Cosine Similarity (0-35 points)
  if (projectVector && supervisorVector) {
    const sim = cosineSimilarity(projectVector, supervisorVector);
    tfidfScore = sim * 35;
    if (sim > 0.1) {
      reasons.push(`Semantic similarity: ${(sim * 100).toFixed(0)}%`);
    }
  }

  // 2. Exact & partial keyword matching (0-25 points)
  const projectKeywords = ((project.keywords && project.keywords.length > 0)
    ? project.keywords
    : (projectCategory ? [projectCategory] : [])).map((k: string) => k.toLowerCase());
  const researchAreas = (supervisor.research_areas || []).map((a: string) => a.toLowerCase());

  if (projectKeywords.length > 0 && researchAreas.length > 0) {
    let exactMatches: string[] = [];
    for (const kw of projectKeywords) {
      for (const area of researchAreas) {
        if (area.includes(kw) || kw.includes(area)) {
          exactMatches.push(kw);
          break;
        }
      }
    }
    const matchRatio = exactMatches.length / Math.max(projectKeywords.length, 1);
    keywordScore = matchRatio * 25;
    if (exactMatches.length > 0) {
      reasons.push(`Keyword matches: ${[...new Set(exactMatches)].join(', ')}`);
    }
  }

  // 3. Fuzzy n-gram matching for partial/misspelled terms (0-10 points)
  if (projectKeywords.length > 0 && researchAreas.length > 0) {
    let bestFuzzyScores: number[] = [];
    for (const kw of projectKeywords) {
      let best = 0;
      for (const area of researchAreas) {
        // Check individual words in multi-word areas
        const areaWords = area.split(/\s+/);
        for (const word of areaWords) {
          best = Math.max(best, ngramSimilarity(kw, word));
        }
        best = Math.max(best, ngramSimilarity(kw, area));
      }
      bestFuzzyScores.push(best);
    }
    const avgFuzzy = bestFuzzyScores.reduce((a, b) => a + b, 0) / bestFuzzyScores.length;
    fuzzyScore = avgFuzzy * 10;
    if (avgFuzzy > 0.3) {
      reasons.push(`Fuzzy expertise match: ${(avgFuzzy * 100).toFixed(0)}%`);
    }
  }

  // 4. Department match (0-15 points)
  if (project.department && supervisor.department) {
    const projDept = project.department.toLowerCase();
    const supDept = supervisor.department.toLowerCase();
    if (projDept === supDept) {
      deptScore = 15;
      reasons.push('Department match');
    } else if (ngramSimilarity(projDept, supDept) > 0.5) {
      deptScore = 8;
      reasons.push('Similar department');
    }
  }

  // 5. Workload balance — prefer supervisors with more capacity (0-15 points)
  const availableSlots = maxProjects - currentLoad;
  const capacityRatio = availableSlots / Math.max(maxProjects, 1);
  workloadScore = capacityRatio * 15;
  if (availableSlots > 0) {
    reasons.push(`Capacity: ${availableSlots}/${maxProjects} slots free`);
  }

  const total = tfidfScore + keywordScore + fuzzyScore + deptScore + workloadScore;

  return {
    score: Math.round(total),
    reasons,
    breakdown: {
      tfidfSimilarity: Math.round(tfidfScore * 10) / 10,
      keywordMatch: Math.round(keywordScore * 10) / 10,
      fuzzyMatch: Math.round(fuzzyScore * 10) / 10,
      departmentMatch: Math.round(deptScore * 10) / 10,
      workloadBalance: Math.round(workloadScore * 10) / 10,
    },
  };
}

/**
 * Build a text corpus document from a project for TF-IDF.
 */
function projectToDocument(project: any): string[] {
  const parts = [
    project.title || '',
    project.description || '',
    ...(project.keywords || []),
    project.department || '',
    getProjectCategory(project),
  ];
  return tokenize(parts.join(' '));
}

/**
 * Build a text corpus document from a supervisor for TF-IDF.
 */
function supervisorToDocument(supervisor: any): string[] {
  const parts = [
    ...(supervisor.research_areas || []),
    supervisor.department || '',
  ];
  return tokenize(parts.join(' '));
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('User profile:', profile);

    if (!profile) throw new Error('User profile not found');
    if (!profile.user_type) throw new Error('User type not set in profile. Please contact administrator.');

    const body = await req.json();
    const { action, projectId, supervisorId, newSupervisorId, name, description, department, project_type, members, groupId, allocationId, rejectionReason } = body;

    console.log('Action:', action, 'User type:', profile.user_type);

    // Authorization
    if (action === 'create_group' || action === 'allocate_group' || action === 'auto_allocate_project') {
      if (!['student', 'admin'].includes(profile.user_type)) {
        throw new Error(`Unauthorized: Only students can perform this action. Your user type: ${profile.user_type}`);
      }
    } else if (action === 'accept_group_allocation' || action === 'reject_group_allocation' || action === 'approve_project' || action === 'reject_project_with_feedback') {
      if (!['supervisor', 'admin'].includes(profile.user_type)) {
        throw new Error(`Unauthorized: Only supervisors can accept or reject. Your user type: ${profile.user_type}`);
      }
    } else {
      if (!['admin', 'supervisor'].includes(profile.user_type)) {
        throw new Error(`Unauthorized: This action requires admin or supervisor role. Your user type: ${profile.user_type}`);
      }
    }

    // ─── Generate Suggestions (TF-IDF + Greedy) ─────────────────────────────────
    if (action === 'generate_suggestions') {
      console.log('Generate suggestions: auto-assigning with Hungarian algorithm');

      const { data: projects } = await supabaseClient
        .from('projects')
        .select('*')
        .is('supervisor_id', null);

      const { data: supervisors } = await supabaseClient
        .from('supervisors')
        .select('*');

      const { data: rules } = await supabaseClient
        .from('allocation_rules')
        .select('*');

      const maxProjectsDefault = rules?.find(r => r.rule_name === 'max_projects_per_supervisor')?.rule_value || 5;

      if (!projects?.length || !supervisors?.length) {
        return new Response(
          JSON.stringify({ success: true, suggestions_count: 0, allocated: 0, message: 'No unassigned projects or no supervisors available.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Expand supervisors into slots (one slot per available capacity)
      const supervisorSlots: { supervisor: any; slotIndex: number }[] = [];
      for (const sup of supervisors) {
        const maxAllowed = sup.max_projects || maxProjectsDefault;
        const current = sup.current_projects || 0;
        const available = Math.max(0, maxAllowed - current);
        for (let s = 0; s < available; s++) {
          supervisorSlots.push({ supervisor: sup, slotIndex: s });
        }
      }

      if (supervisorSlots.length === 0) {
        return new Response(
          JSON.stringify({ success: true, suggestions_count: 0, allocated: 0, message: 'All supervisors at capacity.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build TF-IDF corpus
      const projDocs = projects.map(p => projectToDocument(p));
      const uniqueSupDocs = supervisors.map(s => supervisorToDocument(s));
      const { vectors } = buildTfIdf([...projDocs, ...uniqueSupDocs]);
      const projVectors = vectors.slice(0, projects.length);

      const supVectorMap = new Map<string, number>();
      supervisors.forEach((s, i) => supVectorMap.set(s.user_id, i));

      // Build score matrix: projects × supervisor slots
      const scoreMatrix: number[][] = [];
      const scoreDetails: ScoringResult[][] = [];

      for (let pi = 0; pi < projects.length; pi++) {
        const row: number[] = [];
        const detailRow: ScoringResult[] = [];
        for (let si = 0; si < supervisorSlots.length; si++) {
          const { supervisor, slotIndex } = supervisorSlots[si];
          const supVecIdx = supVectorMap.get(supervisor.user_id)!;
          const supVector = vectors[projects.length + supVecIdx];
          const loadPenalty = slotIndex * 0.5;

          const result = scoreMatch(
            projects[pi], supervisor,
            projVectors[pi], supVector,
            (supervisor.current_projects || 0) + slotIndex,
            supervisor.max_projects || maxProjectsDefault
          );

          row.push(Math.max(0, result.score - loadPenalty));
          detailRow.push(result);
        }
        scoreMatrix.push(row);
        scoreDetails.push(detailRow);
      }

      // Run Hungarian algorithm for globally optimal assignment
      const assignments = hungarianAlgorithm(scoreMatrix);

      // Apply assignments - directly update projects
      const projectCounts: Record<string, number> = {};
      for (const sup of supervisors) {
        projectCounts[sup.user_id] = sup.current_projects || 0;
      }

      let allocated = 0;
      const results: any[] = [];

      for (const [projIdx, slotIdx] of assignments) {
        const project = projects[projIdx];
        const { supervisor } = supervisorSlots[slotIdx];
        const detail = scoreDetails[projIdx][slotIdx];
        if (detail.score <= 0) continue;

        const { error: assignError } = await supabaseClient
          .from('projects')
          .update({ supervisor_id: supervisor.user_id, status: 'approved' })
          .eq('id', project.id);

        if (!assignError) {
          projectCounts[supervisor.user_id] = (projectCounts[supervisor.user_id] || 0) + 1;
          allocated++;
          results.push({
            project_id: project.id,
            project_title: project.title,
            supervisor_id: supervisor.user_id,
            match_score: detail.score,
            match_reason: detail.reasons.join(', '),
          });

          // Notify the student
          if (project.student_id) {
            await supabaseClient.from('notifications').insert({
              user_id: project.student_id,
              title: 'Supervisor Assigned! 🎉',
              message: `A supervisor has been assigned to your project "${project.title}" based on expertise matching.`,
              type: 'allocation',
              link: `/projects/${project.id}`
            });
          }
        }
      }

      // Sync supervisor counts
      for (const sup of supervisors) {
        if (projectCounts[sup.user_id] !== (sup.current_projects || 0)) {
          await supabaseClient
            .from('supervisors')
            .update({ current_projects: projectCounts[sup.user_id] })
            .eq('user_id', sup.user_id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, suggestions_count: allocated, allocated, total: projects.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Manual Assign ──────────────────────────────────────────────────────────
    if (action === 'manual_assign') {
      const { count: currentCount } = await supabaseClient
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', supervisorId)
        .not('status', 'in', '("archived","rejected")');

      const { data: supData } = await supabaseClient
        .from('supervisors')
        .select('max_projects')
        .eq('user_id', supervisorId)
        .single();

      const maxAllowed = supData?.max_projects || 5;
      if ((currentCount || 0) >= maxAllowed) {
        return new Response(
          JSON.stringify({ error: `Supervisor has reached maximum capacity of ${maxAllowed} projects.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabaseClient
        .from('projects')
        .update({ supervisor_id: supervisorId, status: 'in_progress' })
        .eq('id', projectId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Reassign ───────────────────────────────────────────────────────────────
    if (action === 'reassign') {
      const { error } = await supabaseClient
        .from('projects')
        .update({ supervisor_id: newSupervisorId, status: 'in_progress' })
        .eq('id', projectId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Unassign ───────────────────────────────────────────────────────────────
    if (action === 'unassign') {
      const { error } = await supabaseClient
        .from('projects')
        .update({ supervisor_id: null, status: 'pending' })
        .eq('id', projectId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Create Group ───────────────────────────────────────────────────────────
    if (action === 'create_group') {
      if (!name || name.trim().length === 0 || name.trim().length > 100) {
        throw new Error('Invalid group name');
      }
      if (!members || members.length === 0) {
        throw new Error('At least one group member is required');
      }

      for (const member of members) {
        if (!member.full_name || member.full_name.trim().length === 0 || member.full_name.trim().length > 100) {
          throw new Error('Invalid member name');
        }
        if (!member.reg_number || member.reg_number.trim().length === 0 || member.reg_number.trim().length > 50) {
          throw new Error('Invalid registration number');
        }
      }

      const { data: group, error: groupError } = await supabaseClient
        .from('student_groups')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          department: department?.trim() || null,
          project_type: project_type || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const memberInfo = members.map((m: any) =>
        `${m.full_name.trim()} (${m.reg_number.trim()})`
      ).join(', ');

      await supabaseClient
        .from('student_groups')
        .update({
          description: description?.trim()
            ? `${description.trim()}\n\nMembers: ${memberInfo}`
            : `Members: ${memberInfo}`
        })
        .eq('id', group.id);

      return new Response(JSON.stringify({ success: true, group }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Allocate Group (TF-IDF scoring) ────────────────────────────────────────
    if (action === 'allocate_group') {
      const { data: group, error: groupError } = await supabaseClient
        .from('student_groups')
        .select('*, group_members(student_id)')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      const { data: supervisors, error: supervisorsError } = await supabaseClient
        .from('supervisors')
        .select('*');

      if (supervisorsError) throw supervisorsError;

      // Build documents for TF-IDF
      const groupDoc = tokenize([group.project_type || '', group.department || '', group.description || ''].join(' '));
      const supDocs = (supervisors || []).map(s => supervisorToDocument(s));
      const allDocs = [groupDoc, ...supDocs];
      const { vectors } = buildTfIdf(allDocs);
      const groupVector = vectors[0];

      let bestMatch: any = null;
      let bestScore = 0;

      for (let si = 0; si < (supervisors || []).length; si++) {
        const supervisor = supervisors![si];
        if ((supervisor.current_projects || 0) >= (supervisor.max_projects || 5)) continue;

        let score = 0;
        const reasons: string[] = [];

        // TF-IDF similarity (40 points)
        const sim = cosineSimilarity(groupVector, vectors[si + 1]);
        score += sim * 40;
        if (sim > 0.1) reasons.push(`Semantic match: ${(sim * 100).toFixed(0)}%`);

        // Project type match (25 points)
        if (group.project_type && supervisor.research_areas?.some((area: string) =>
          area.toLowerCase().includes(group.project_type.toLowerCase()) ||
          group.project_type.toLowerCase().includes(area.toLowerCase())
        )) {
          score += 25;
          reasons.push(`Research area matches project type`);
        }

        // Department match (15 points)
        if (group.department && supervisor.department &&
            group.department.toLowerCase() === supervisor.department.toLowerCase()) {
          score += 15;
          reasons.push('Department match');
        }

        // Workload balance (20 points)
        const available = (supervisor.max_projects || 5) - (supervisor.current_projects || 0);
        score += (available / Math.max(supervisor.max_projects || 5, 1)) * 20;
        reasons.push(`${available} slots available`);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { supervisor, score: Math.round(score), reason: reasons.join('; ') };
        }
      }

      if (!bestMatch) {
        return new Response(
          JSON.stringify({ error: 'No available supervisors found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: allocation, error: allocationError } = await supabaseClient
        .from('group_allocations')
        .insert({
          group_id: groupId,
          supervisor_id: bestMatch.supervisor.user_id,
          match_score: bestMatch.score,
          match_reason: bestMatch.reason,
          status: 'pending',
        })
        .select()
        .single();

      if (allocationError) throw allocationError;

      return new Response(
        JSON.stringify({ success: true, allocation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Accept/Reject Group Allocation ─────────────────────────────────────────
    if (action === 'accept_group_allocation') {
      const { data: allocation, error: fetchError } = await supabaseClient
        .from('group_allocations')
        .select('supervisor_id')
        .eq('id', allocationId)
        .eq('supervisor_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!allocation) throw new Error('Allocation not found or not assigned to you');

      const { error: updateError } = await supabaseClient
        .from('group_allocations')
        .update({ status: 'accepted' })
        .eq('id', allocationId);

      if (updateError) throw updateError;

      const { data: supervisor } = await supabaseClient
        .from('supervisors')
        .select('current_projects')
        .eq('user_id', allocation.supervisor_id)
        .single();

      if (supervisor) {
        await supabaseClient
          .from('supervisors')
          .update({ current_projects: (supervisor.current_projects || 0) + 1 })
          .eq('user_id', allocation.supervisor_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject_group_allocation') {
      const { data: allocation, error: fetchError } = await supabaseClient
        .from('group_allocations')
        .select('supervisor_id')
        .eq('id', allocationId)
        .eq('supervisor_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!allocation) throw new Error('Allocation not found or not assigned to you');

      const { error } = await supabaseClient
        .from('group_allocations')
        .update({ status: 'rejected' })
        .eq('id', allocationId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Auto-Allocate Single Project (TF-IDF + Best Match) ─────────────────────
    if (action === 'auto_allocate_project') {
      console.log('Auto-allocating project:', projectId);

      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const { data: supervisorsData, error: supervisorsError } = await supabaseClient
        .from('supervisors')
        .select('*');

      if (supervisorsError) throw supervisorsError;

      const { data: rules } = await supabaseClient
        .from('allocation_rules')
        .select('*');

      const maxProjects = rules?.find(r => r.rule_name === 'max_projects_per_supervisor')?.rule_value || 5;

      const { projectCategory, matchingSupervisors } = getMatchingSupervisors(project, supervisorsData || [], maxProjects);

      await supabaseClient
        .from('pending_allocations')
        .delete()
        .eq('project_id', projectId);

      if (!projectCategory || matchingSupervisors.length === 0) {
        // No supervisors available — notify admin for manual assignment
        const { data: admins } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .eq('user_type', 'admin');

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await supabaseClient.from('notifications').insert({
              user_id: admin.user_id,
              title: 'Manual Assignment Needed',
              message: !projectCategory
                ? `Project "${project.title}" is missing a category, so expertise-based allocation could not run. Please assign manually.`
                : `Project "${project.title}" could not be auto-assigned because no supervisor matches the ${projectCategory} expertise. Please assign manually.`,
              type: 'allocation',
              link: `/projects/${projectId}`,
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true, allocated: false, message: !projectCategory ? 'Project category is missing, so expertise matching could not run.' : 'No supervisor with matching expertise was found. Admin has been notified for manual assignment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build TF-IDF for scoring
      const projDoc = projectToDocument(project);
      const supDocs = matchingSupervisors.map(s => supervisorToDocument(s));
      const { vectors } = buildTfIdf([projDoc, ...supDocs]);

      let bestMatch: any = null;
      let bestScore = 0;
      for (let si = 0; si < matchingSupervisors.length; si++) {
        const supervisor = matchingSupervisors[si];

        const result = scoreMatch(
          project, supervisor,
          vectors[0], vectors[si + 1],
          supervisor.current_projects || 0,
          supervisor.max_projects || maxProjects
        );

        if (result.score > bestScore) {
          bestScore = result.score;
          bestMatch = { supervisor, ...result };
        }
      }

      // Create pending allocation for best match
      if (bestMatch) {
        const { error: allocError } = await supabaseClient
          .from('pending_allocations')
          .insert({
            project_id: projectId,
            supervisor_id: bestMatch.supervisor.user_id,
            match_score: bestMatch.score,
            match_reason: bestMatch.reasons.join(', '),
            status: 'pending',
          });

        if (allocError) throw allocError;

        await supabaseClient
          .from('notifications')
          .insert({
            user_id: bestMatch.supervisor.user_id,
            title: 'New Project Submission',
            message: `A new ${projectCategory} project "${project.title}" matches your expertise (${bestMatch.score}% match). Please review it.`,
            type: 'allocation',
            link: `/projects/${projectId}`
          });
      }

      return new Response(
        JSON.stringify({
          success: true,
          allocated: !!bestMatch,
          supervisorName: bestMatch?.supervisor.user_id,
          matchScore: bestMatch?.score || 0,
          matchReason: bestMatch?.reasons.join(', ') || '',
          breakdown: bestMatch?.breakdown,
          notifiedSupervisors: bestMatch ? 1 : 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Approve Project ────────────────────────────────────────────────────────
    if (action === 'approve_project') {
      console.log('Approving project:', projectId);

      const isSupervisor = profile.user_type === 'supervisor';

      let assignedSupervisorId: string | null = null;
      let assignedSupervisorName = 'a supervisor';

      if (isSupervisor) {
        // Supervisor approving → assign to themselves
        const { data: supervisorCheck } = await supabaseClient
          .from('supervisors')
          .select('current_projects, max_projects')
          .eq('user_id', user.id)
          .single();

        const { data: rules } = await supabaseClient
          .from('allocation_rules')
          .select('*');
        const maxProjectsRule = rules?.find(r => r.rule_name === 'max_projects_per_supervisor')?.rule_value || 5;
        const maxAllowed = supervisorCheck?.max_projects || maxProjectsRule;

        const { count: actualCount } = await supabaseClient
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('supervisor_id', user.id)
          .not('status', 'in', '("archived","rejected")');

        if ((actualCount || 0) >= maxAllowed) {
          return new Response(
            JSON.stringify({ error: `You have reached your maximum capacity of ${maxAllowed} projects.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        assignedSupervisorId = user.id;
        const { data: supProfile } = await supabaseClient
          .from('profiles').select('full_name').eq('user_id', user.id).single();
        assignedSupervisorName = supProfile?.full_name || 'your supervisor';

      } else {
        // Admin approving → auto-assign best matching supervisor
        const { data: project } = await supabaseClient
          .from('projects').select('*').eq('id', projectId).single();
        const { data: allSupervisors } = await supabaseClient
          .from('supervisors').select('*');
        const { data: rules } = await supabaseClient
          .from('allocation_rules').select('*');
        const maxProjectsDefault = rules?.find(r => r.rule_name === 'max_projects_per_supervisor')?.rule_value || 5;

        if (project && allSupervisors?.length) {
          const { projectCategory, matchingSupervisors } = getMatchingSupervisors(project, allSupervisors, maxProjectsDefault);

          if (!projectCategory) {
            return new Response(
              JSON.stringify({ error: 'Project category is required before approval can assign a supervisor.' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (matchingSupervisors.length === 0) {
            return new Response(
              JSON.stringify({ error: `No supervisor with matching expertise was found for ${projectCategory}. Please use manual assignment.` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const projDoc = projectToDocument(project);
          const supDocs = matchingSupervisors.map(s => supervisorToDocument(s));
          const { vectors } = buildTfIdf([projDoc, ...supDocs]);

          let bestMatch: any = null;
          let bestScore = 0;

          for (let si = 0; si < matchingSupervisors.length; si++) {
            const supervisor = matchingSupervisors[si];

            const result = scoreMatch(
              project, supervisor,
              vectors[0], vectors[si + 1],
              supervisor.current_projects || 0,
              supervisor.max_projects || maxProjectsDefault
            );

            if (result.score > bestScore) {
              bestScore = result.score;
              bestMatch = { supervisor, ...result };
            }
          }

          if (bestMatch) {
            assignedSupervisorId = bestMatch.supervisor.user_id;
            const { data: supProfile } = await supabaseClient
              .from('profiles').select('full_name').eq('user_id', assignedSupervisorId).single();
            assignedSupervisorName = supProfile?.full_name || 'a matched supervisor';
          }
        }
      }

      // Update the project
      const { error: projectError } = await supabaseClient
        .from('projects')
        .update({
          supervisor_id: assignedSupervisorId,
          status: 'approved',
          rejection_reason: null
        })
        .eq('id', projectId);

      if (projectError) throw projectError;

      // Update supervisor counts if assigned
      if (assignedSupervisorId) {
        await supabaseClient
          .from('pending_allocations')
          .update({ status: 'accepted' })
          .eq('project_id', projectId)
          .eq('supervisor_id', assignedSupervisorId);

        const { count: newCount } = await supabaseClient
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('supervisor_id', assignedSupervisorId)
          .not('status', 'in', '("archived","rejected")');

        await supabaseClient
          .from('supervisors')
          .update({ current_projects: newCount || 0 })
          .eq('user_id', assignedSupervisorId);

        await supabaseClient
          .from('profiles')
          .update({ current_projects: newCount || 0 })
          .eq('user_id', assignedSupervisorId);
      }

      // Notify student
      const { data: project } = await supabaseClient
        .from('projects')
        .select('title, student_id')
        .eq('id', projectId)
        .single();

      if (project) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: project.student_id,
            title: 'Project Approved! 🎉',
            message: `Your project "${project.title}" has been approved${assignedSupervisorId ? ` and assigned to ${assignedSupervisorName}` : ''}.`,
            type: 'project',
            link: `/projects/${projectId}`
          });
      }

      return new Response(JSON.stringify({ success: true, supervisor_assigned: !!assignedSupervisorId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Reject Project with Feedback ───────────────────────────────────────────
    if (action === 'reject_project_with_feedback') {
      const { rejectionReason } = body;
      console.log('Rejecting project with feedback:', projectId);

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error('Please provide feedback on areas that need improvement');
      }

      const { error: projectError } = await supabaseClient
        .from('projects')
        .update({ status: 'needs_revision', rejection_reason: rejectionReason.trim(), supervisor_id: null })
        .eq('id', projectId);

      if (projectError) throw projectError;

      await supabaseClient
        .from('pending_allocations')
        .update({ status: 'rejected' })
        .eq('project_id', projectId)
        .eq('supervisor_id', user.id);

      const { data: project } = await supabaseClient
        .from('projects')
        .select('title, student_id')
        .eq('id', projectId)
        .single();

      const { data: supProfile } = await supabaseClient
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (project) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: project.student_id,
            title: 'Project Needs Revision',
            message: `${supProfile?.full_name || 'Your supervisor'} has requested revisions on "${project.title}": ${rejectionReason.trim()}`,
            type: 'project',
            link: `/projects/${projectId}`
          });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Bulk Auto-Allocate (Hungarian Algorithm for Optimal Assignment) ────────
    if (action === 'bulk_auto_allocate') {
      console.log('Bulk auto-allocating with Hungarian algorithm');

      const { data: unassignedProjects, error: projError } = await supabaseClient
        .from('projects')
        .select('*')
        .is('supervisor_id', null);

      if (projError) throw projError;

      if (!unassignedProjects || unassignedProjects.length === 0) {
        return new Response(
          JSON.stringify({ success: true, allocated: 0, total: 0, message: 'No unassigned projects found.', algorithm: 'hungarian' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: allSupervisors, error: supError } = await supabaseClient
        .from('supervisors')
        .select('*');

      if (supError) throw supError;
      if (!allSupervisors?.length) {
        return new Response(
          JSON.stringify({ success: true, allocated: 0, total: unassignedProjects.length, message: 'No supervisors available.', algorithm: 'hungarian' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: rules } = await supabaseClient
        .from('allocation_rules')
        .select('*');
      const maxProjectsDefault = rules?.find(r => r.rule_name === 'max_projects_per_supervisor')?.rule_value || 5;

      // Expand supervisors into slots (one slot per available capacity)
      const supervisorSlots: { supervisor: any; slotIndex: number }[] = [];
      for (const sup of allSupervisors) {
        const maxAllowed = sup.max_projects || maxProjectsDefault;
        const current = sup.current_projects || 0;
        const available = Math.max(0, maxAllowed - current);
        for (let s = 0; s < available; s++) {
          supervisorSlots.push({ supervisor: sup, slotIndex: s });
        }
      }

      if (supervisorSlots.length === 0) {
        return new Response(
          JSON.stringify({ success: true, allocated: 0, total: unassignedProjects.length, message: 'All supervisors at capacity.', algorithm: 'hungarian' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build TF-IDF corpus across all projects + unique supervisors
      const projDocs = unassignedProjects.map(p => projectToDocument(p));
      const uniqueSupDocs = allSupervisors.map(s => supervisorToDocument(s));
      const { vectors } = buildTfIdf([...projDocs, ...uniqueSupDocs]);
      const projVectors = vectors.slice(0, unassignedProjects.length);

      // Map supervisor user_id → vector index
      const supVectorMap = new Map<string, number>();
      allSupervisors.forEach((s, i) => supVectorMap.set(s.user_id, i));

      // Build score matrix: projects × supervisor slots
      const scoreMatrix: number[][] = [];
      const scoreDetails: ScoringResult[][] = [];

      // Track projected load per supervisor for workload scoring
      for (let pi = 0; pi < unassignedProjects.length; pi++) {
        const row: number[] = [];
        const detailRow: ScoringResult[] = [];

        for (let si = 0; si < supervisorSlots.length; si++) {
          const { supervisor, slotIndex } = supervisorSlots[si];
          const supVecIdx = supVectorMap.get(supervisor.user_id)!;
          const supVector = vectors[unassignedProjects.length + supVecIdx];

          // Penalize later slots slightly to prefer less-loaded supervisors
          const loadPenalty = slotIndex * 0.5;

          const result = scoreMatch(
            unassignedProjects[pi], supervisor,
            projVectors[pi], supVector,
            (supervisor.current_projects || 0) + slotIndex,
            supervisor.max_projects || maxProjectsDefault
          );

          const adjustedScore = Math.max(0, result.score - loadPenalty);
          row.push(adjustedScore);
          detailRow.push(result);
        }

        scoreMatrix.push(row);
        scoreDetails.push(detailRow);
      }

      // Run Hungarian algorithm for globally optimal assignment
      const assignments = hungarianAlgorithm(scoreMatrix);

      // Apply assignments
      const projectCounts: Record<string, number> = {};
      for (const sup of allSupervisors) {
        projectCounts[sup.user_id] = sup.current_projects || 0;
      }

      let allocated = 0;
      const results: any[] = [];

      for (const [projIdx, slotIdx] of assignments) {
        const project = unassignedProjects[projIdx];
        const { supervisor } = supervisorSlots[slotIdx];
        const detail = scoreDetails[projIdx][slotIdx];

        if (detail.score <= 0) continue;

        const { error: assignError } = await supabaseClient
          .from('projects')
          .update({ supervisor_id: supervisor.user_id, status: 'in_progress' })
          .eq('id', project.id);

        if (!assignError) {
          projectCounts[supervisor.user_id] = (projectCounts[supervisor.user_id] || 0) + 1;
          allocated++;
          results.push({
            project_id: project.id,
            project_title: project.title,
            supervisor_id: supervisor.user_id,
            match_score: detail.score,
            match_reason: detail.reasons.join(', '),
            breakdown: detail.breakdown,
          });
        }
      }

      // Sync supervisor counts
      for (const sup of allSupervisors) {
        if (projectCounts[sup.user_id] !== (sup.current_projects || 0)) {
          await supabaseClient
            .from('supervisors')
            .update({ current_projects: projectCounts[sup.user_id] })
            .eq('user_id', sup.user_id);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          allocated,
          total: unassignedProjects.length,
          algorithm: 'hungarian',
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
