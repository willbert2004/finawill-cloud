import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  description: string;
  objectives: string;
  student_id: string;
  supervisor_id?: string;
  year?: number;
}

interface ScoredProject {
  project: Project;
  score: number;
  titleScore: number;
  objectivesScore: number;
  descriptionScore: number;
}

interface ThresholdRange {
  level: string;
  min_score: number;
  max_score: number;
}

type Thresholds = { high: ThresholdRange; possible: ThresholdRange; low: ThresholdRange };

// ── Weights ────────────────────────────────────────────────────────────────────

const WEIGHTS = { title: 0.40, objectives: 0.30, description: 0.30 } as const;

// Phase 1 TF-IDF: lower threshold to catch more candidates
const TFIDF_PREFILTER_THRESHOLD = 8;
// Max candidates from TF-IDF to consider
const MAX_TFIDF_CANDIDATES = 20;
// Max projects to send to LLM for final semantic scoring
const MAX_LLM_CANDIDATES = 12;

// ── Stop words ─────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'to','of','in','for','on','with','at','by','from','as','into','through',
  'during','before','after','above','below','between','and','but','or','not',
  'no','nor','so','yet','both','either','neither','each','every','all','any',
  'few','more','most','other','some','such','than','too','very','just','about',
  'this','that','these','those','it','its','which','who','whom','what','where',
  'when','why','how','if','then','else','also','only','own','same','them',
  'they','their','up','out','off','using','based','system','project','study',
  'development','design','implementation','analysis','approach','method','research',
]);

// ── Text processing ────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function bigrams(tokens: string[]): string[] {
  const bi: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bi.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bi;
}

function tokenizeWithBigrams(text: string): string[] {
  const unigrams = tokenize(text);
  return [...unigrams, ...bigrams(unigrams)];
}

// ── TF-IDF Engine ──────────────────────────────────────────────────────────────

type TermVector = Map<string, number>;

function buildTF(tokens: string[]): TermVector {
  const tf: TermVector = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const len = tokens.length || 1;
  for (const [k, v] of tf) tf.set(k, v / len);
  return tf;
}

function buildIDF(documents: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  const N = documents.length;
  for (const doc of documents) {
    const seen = new Set(doc);
    for (const term of seen) df.set(term, (df.get(term) || 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  }
  return idf;
}

function tfidfVector(tf: TermVector, idf: Map<string, number>): TermVector {
  const vec: TermVector = new Map();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) || Math.log(idf.size + 1);
    vec.set(term, tfVal * idfVal);
  }
  return vec;
}

function cosineSimilarity(a: TermVector, b: TermVector): number {
  let dot = 0, magA = 0, magB = 0;
  for (const [term, val] of a) {
    magA += val * val;
    const bVal = b.get(term);
    if (bVal !== undefined) dot += val * bVal;
  }
  for (const [, val] of b) magB += val * val;
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ── Weighted field-level TF-IDF similarity ─────────────────────────────────────

function computeFieldSimilarity(
  newDoc: { title: string; objectives: string; description: string },
  existing: Project[]
): ScoredProject[] {
  if (existing.length === 0) return [];

  const allTitles = existing.map(p => tokenizeWithBigrams(p.title || ''));
  const allObjectives = existing.map(p => tokenizeWithBigrams(p.objectives || ''));
  const allDescriptions = existing.map(p => tokenizeWithBigrams(p.description || ''));

  const newTitleTokens = tokenizeWithBigrams(newDoc.title);
  const newObjTokens = tokenizeWithBigrams(newDoc.objectives);
  const newDescTokens = tokenizeWithBigrams(newDoc.description);

  const titleIDF = buildIDF([newTitleTokens, ...allTitles]);
  const objIDF = buildIDF([newObjTokens, ...allObjectives]);
  const descIDF = buildIDF([newDescTokens, ...allDescriptions]);

  const newTitleVec = tfidfVector(buildTF(newTitleTokens), titleIDF);
  const newObjVec = tfidfVector(buildTF(newObjTokens), objIDF);
  const newDescVec = tfidfVector(buildTF(newDescTokens), descIDF);

  return existing.map((project, i) => {
    const titleScore = cosineSimilarity(newTitleVec, tfidfVector(buildTF(allTitles[i]), titleIDF)) * 100;
    const objectivesScore = cosineSimilarity(newObjVec, tfidfVector(buildTF(allObjectives[i]), objIDF)) * 100;
    const descriptionScore = cosineSimilarity(newDescVec, tfidfVector(buildTF(allDescriptions[i]), descIDF)) * 100;

    const score =
      titleScore * WEIGHTS.title +
      objectivesScore * WEIGHTS.objectives +
      descriptionScore * WEIGHTS.description;

    return { project, score, titleScore, objectivesScore, descriptionScore };
  });
}

// ── Phase 1b: LLM Concept Extraction ──────────────────────────────────────────
// Ask the LLM to extract core concepts/themes from the new project.
// Then do a simple text search across all existing projects to find
// semantically related ones that TF-IDF missed (different wording, same meaning).

async function extractConcepts(
  newProject: { title: string; objectives: string; description: string },
  apiKey: string
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'You extract core research concepts from academic project proposals. Return synonyms, related terms, and domain-specific vocabulary that describe the same research area. Be thorough — include alternate phrasings someone might use for the same idea.'
          },
          {
            role: 'user',
            content: `Extract the core research concepts, themes, synonyms, and related technical terms from this project. Include alternate phrasings and domain vocabulary.\n\nTitle: ${newProject.title}\nObjectives: ${newProject.objectives}\nDescription: ${newProject.description}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_concepts',
            description: 'Report extracted concepts and synonyms',
            parameters: {
              type: 'object',
              properties: {
                concepts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 10-25 key concepts, synonyms, and related terms (single words or short phrases)'
                }
              },
              required: ['concepts'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'report_concepts' } }
      }),
    });

    clearTimeout(timeout);
    if (!response.ok) {
      console.error(`Concept extraction failed [${response.status}]`);
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const parsed = JSON.parse(toolCall.function.arguments);
    return (parsed.concepts || []).map((c: string) => c.toLowerCase().trim()).filter(Boolean);
  } catch (error) {
    console.error('Concept extraction error:', error);
    return [];
  }
}

/** Find projects that contain any of the extracted concepts in their text */
function findConceptMatches(
  concepts: string[],
  projects: Project[],
  excludeIds: Set<string>
): Project[] {
  if (concepts.length === 0) return [];

  const matches: { project: Project; hits: number }[] = [];

  for (const project of projects) {
    if (excludeIds.has(project.id)) continue;

    const fullText = `${project.title} ${project.objectives || ''} ${project.description}`.toLowerCase();
    let hits = 0;
    for (const concept of concepts) {
      if (fullText.includes(concept)) hits++;
    }
    // Require at least 2 concept hits to be considered a candidate
    if (hits >= 2) {
      matches.push({ project, hits });
    }
  }

  // Sort by number of hits descending and take top candidates
  matches.sort((a, b) => b.hits - a.hits);
  return matches.slice(0, 10).map(m => m.project);
}

// ── Phase 2: LLM Semantic Scoring ──────────────────────────────────────────────

async function semanticScore(
  newProject: { title: string; objectives: string; description: string },
  candidates: { project: Project; tfidfScore: number }[],
  apiKey: string
): Promise<ScoredProject[]> {
  if (candidates.length === 0) return [];

  const projectList = candidates.map((c, idx) =>
    `Project ${idx + 1}:\nTitle: ${c.project.title}\nObjectives: ${c.project.objectives || 'N/A'}\nDescription: ${c.project.description}`
  ).join('\n\n');

  const prompt = `You are a semantic similarity engine for academic project proposals. Your job is to deeply understand the MEANING and INTENT of each project, not just surface keywords.

Compare the NEW project against each EXISTING project below. For each, provide a similarity score 0-100 based on:
1. Whether they address the SAME core problem or research question (50% weight)
2. Methodological and technical overlap (20% weight)
3. Domain and application area alignment (20% weight)
4. Expected outcomes and deliverables similarity (10% weight)

IMPORTANT scoring guidelines:
- Projects using DIFFERENT words but solving the SAME problem = HIGH score (70+)
  e.g. "crop disease detection" and "plant pathology identification" are the same thing
- Projects in the SAME domain but solving DIFFERENT problems = LOW score (<30)
  e.g. "crop disease detection" and "soil moisture monitoring" share agriculture but differ
- Near-identical projects with minor variations = VERY HIGH (85+)
- Completely unrelated projects = VERY LOW (<10)

NEW PROJECT:
Title: ${newProject.title}
Objectives: ${newProject.objectives}
Description: ${newProject.description}

EXISTING PROJECTS:
${projectList}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a strict academic project similarity scorer. Focus on genuine research overlap in meaning, not just keywords.' },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_similarity_scores',
            description: 'Report semantic similarity scores for each project comparison',
            parameters: {
              type: 'object',
              properties: {
                scores: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      project_number: { type: 'number' },
                      similarity_score: { type: 'number', description: 'Score 0-100' },
                      reasoning: { type: 'string' }
                    },
                    required: ['project_number', 'similarity_score', 'reasoning'],
                    additionalProperties: false
                  }
                }
              },
              required: ['scores'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'report_similarity_scores' } }
      }),
    });

    if (!response.ok) {
      console.error(`LLM scoring failed [${response.status}]`);
      // Fall back to TF-IDF scores
      return candidates.map(c => ({
        project: c.project,
        score: c.tfidfScore,
        titleScore: 0,
        objectivesScore: 0,
        descriptionScore: 0,
      }));
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return candidates.map(c => ({
        project: c.project,
        score: c.tfidfScore,
        titleScore: 0,
        objectivesScore: 0,
        descriptionScore: 0,
      }));
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const llmScores = new Map<number, number>();
    for (const item of parsed.scores) {
      const idx = (item.project_number || 0) - 1;
      if (idx >= 0 && idx < candidates.length) {
        llmScores.set(idx, Math.min(100, Math.max(0, item.similarity_score)));
      }
    }

    // Final score: 30% TF-IDF + 70% LLM (LLM is the primary judge)
    return candidates.map((c, i) => {
      const llmScore = llmScores.get(i);
      const finalScore = llmScore !== undefined
        ? c.tfidfScore * 0.3 + llmScore * 0.7
        : c.tfidfScore;

      return {
        project: c.project,
        score: finalScore,
        titleScore: 0,
        objectivesScore: 0,
        descriptionScore: 0,
      };
    });
  } catch (error) {
    console.error('LLM semantic scoring error:', error);
    return candidates.map(c => ({
      project: c.project,
      score: c.tfidfScore,
      titleScore: 0,
      objectivesScore: 0,
      descriptionScore: 0,
    }));
  }
}

// ── Threshold helpers ──────────────────────────────────────────────────────────

async function loadThresholds(adminClient: any): Promise<Thresholds> {
  const { data, error } = await adminClient
    .from('duplication_thresholds')
    .select('level, min_score, max_score');

  const defaults: Thresholds = {
    high: { level: 'high', min_score: 70, max_score: 100 },
    possible: { level: 'possible', min_score: 35, max_score: 69 },
    low: { level: 'low', min_score: 0, max_score: 34 },
  };

  if (error || !data || data.length === 0) return defaults;

  const map: Record<string, ThresholdRange> = {};
  for (const row of data) map[row.level] = row;

  return {
    high: map.high || defaults.high,
    possible: map.possible || defaults.possible,
    low: map.low || defaults.low,
  };
}

function classifyScore(score: number, thresholds: Thresholds): string {
  if (score >= thresholds.high.min_score && score <= thresholds.high.max_score) return 'high';
  if (score >= thresholds.possible.min_score && score <= thresholds.possible.max_score) return 'possible';
  return 'low';
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { title, objectives, description } = await req.json();

    if (!title || !objectives || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, objectives, and description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load thresholds & existing projects in parallel
    const [thresholds, { data: existingProjects, error: fetchError }] = await Promise.all([
      loadThresholds(adminClient),
      adminClient
        .from('projects')
        .select('id, title, objectives, description, student_id, supervisor_id, year'),
    ]);

    if (fetchError) throw fetchError;
    const allProjects: Project[] = existingProjects || [];

    console.log(`[check-duplicate] ${allProjects.length} existing projects, ${concepts.length} concepts extracted`);

    // ── Phase 1a: TF-IDF cosine similarity ──
    const tfidfResults = computeFieldSimilarity({ title, objectives, description }, allProjects);
    tfidfResults.sort((a, b) => b.score - a.score);

    // Get TF-IDF candidates above threshold
    const tfidfCandidateIds = new Set<string>();
    const tfidfCandidates = tfidfResults
      .filter(r => r.score >= TFIDF_PREFILTER_THRESHOLD)
      .slice(0, MAX_TFIDF_CANDIDATES);
    tfidfCandidates.forEach(c => tfidfCandidateIds.add(c.project.id));

    // ── Phase 1b: Concept-based candidates (catches what TF-IDF missed) ──
    const conceptMatches = findConceptMatches(concepts, allProjects, tfidfCandidateIds);
    console.log(`[check-duplicate] TF-IDF candidates: ${tfidfCandidates.length}, Concept candidates: ${conceptMatches.length}`);

    // ── Merge candidates for LLM scoring ──
    const mergedCandidates: { project: Project; tfidfScore: number }[] = [];

    // Add TF-IDF candidates with their scores
    for (const c of tfidfCandidates) {
      mergedCandidates.push({ project: c.project, tfidfScore: c.score });
    }

    // Add concept-matched candidates (with tfidfScore = 0 since TF-IDF missed them)
    for (const p of conceptMatches) {
      mergedCandidates.push({ project: p, tfidfScore: 0 });
    }

    // Limit total candidates sent to LLM
    const llmCandidates = mergedCandidates.slice(0, MAX_LLM_CANDIDATES);

    // ── Phase 2: LLM Semantic Scoring ──
    let scoredResults: ScoredProject[];
    if (llmCandidates.length > 0) {
      scoredResults = await semanticScore(
        { title, objectives, description },
        llmCandidates,
        lovableApiKey
      );

      // Add remaining projects that weren't sent to LLM (with TF-IDF scores only)
      const scoredIds = new Set(scoredResults.map(r => r.project.id));
      for (const r of tfidfResults) {
        if (!scoredIds.has(r.project.id)) {
          scoredResults.push(r);
        }
      }
    } else {
      scoredResults = tfidfResults;
    }

    scoredResults.sort((a, b) => b.score - a.score);

    // ── Gather profile info ──
    const allUserIds = new Set<string>();
    allProjects.forEach(p => {
      if (p.student_id) allUserIds.add(p.student_id);
      if (p.supervisor_id) allUserIds.add(p.supervisor_id);
    });

    let profileMap: Record<string, string> = {};
    if (allUserIds.size > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', [...allUserIds]);
      profiles?.forEach(p => {
        profileMap[p.user_id] = p.full_name || p.email || 'Unknown';
      });
    }

    // ── Build response ──
    let isDuplicate = false;
    let highestMatch: ScoredProject | null = null;
    const similarities: ScoredProject[] = [];

    for (const sp of scoredResults) {
      const classification = classifyScore(sp.score, thresholds);
      if (classification === 'high') {
        isDuplicate = true;
        similarities.push(sp);
      } else if (classification === 'possible') {
        similarities.push(sp);
      }
      if (!highestMatch || sp.score > highestMatch.score) {
        highestMatch = sp;
      }
    }

    similarities.sort((a, b) => b.score - a.score);

    const highestClassification = highestMatch ? classifyScore(highestMatch.score, thresholds) : 'low';

    const response = {
      isDuplicate,
      highestSimilarity: highestMatch ? Math.round(highestMatch.score * 10) / 10 : 0,
      thresholds: {
        high: { min: thresholds.high.min_score, max: thresholds.high.max_score },
        possible: { min: thresholds.possible.min_score, max: thresholds.possible.max_score },
        low: { min: thresholds.low.min_score, max: thresholds.low.max_score },
      },
      algorithm: 'tfidf-concept-extraction-llm-semantic',
      weights: WEIGHTS,
      conceptsExtracted: concepts.length,
      similarProjects: similarities.slice(0, 5).map(s => {
        const classification = classifyScore(s.score, thresholds);
        return {
          id: s.project.id,
          title: s.project.title,
          description: s.project.description,
          objectives: s.project.objectives,
          similarity: Math.round(s.score * 10) / 10,
          titleSimilarity: Math.round(s.titleScore * 10) / 10,
          objectivesSimilarity: Math.round(s.objectivesScore * 10) / 10,
          descriptionSimilarity: Math.round(s.descriptionScore * 10) / 10,
          classification,
          student_name: profileMap[s.project.student_id] || 'Unknown',
          supervisor_name: s.project.supervisor_id ? (profileMap[s.project.supervisor_id] || 'Not assigned') : 'Not assigned',
          year: s.project.year || new Date().getFullYear(),
        };
      }),
      message: isDuplicate
        ? `⚠️ Submission blocked: Found semantically similar project(s) in the high-risk range (${thresholds.high.min_score}–${thresholds.high.max_score}%). Highest: ${Math.round(highestMatch!.score)}%.`
        : highestClassification === 'possible'
          ? `⚠️ Possible duplication detected (highest: ${Math.round(highestMatch!.score)}%), but within the allowed range. You may proceed with caution.`
          : `✅ No significant duplicates found (highest similarity: ${highestMatch ? Math.round(highestMatch.score) : 0}%). You may proceed.`,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-duplicate function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
