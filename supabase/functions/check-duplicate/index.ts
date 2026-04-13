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

// Pre-filter: only send projects above this TF-IDF score to the LLM
const LLM_PREFILTER_THRESHOLD = 20;
// Max projects to send to LLM for semantic verification
const MAX_LLM_CANDIDATES = 8;

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

/** Generate bigrams from tokens for better phrase-level matching */
function bigrams(tokens: string[]): string[] {
  const bi: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bi.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bi;
}

/** Tokenize with both unigrams and bigrams */
function tokenizeWithBigrams(text: string): string[] {
  const unigrams = tokenize(text);
  return [...unigrams, ...bigrams(unigrams)];
}

// ── TF-IDF Engine ──────────────────────────────────────────────────────────────

type TermVector = Map<string, number>;

function buildTF(tokens: string[]): TermVector {
  const tf: TermVector = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  // Normalize by doc length
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
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1); // smoothed IDF
  }
  return idf;
}

function tfidfVector(tf: TermVector, idf: Map<string, number>): TermVector {
  const vec: TermVector = new Map();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) || Math.log(idf.size + 1); // unseen term gets high IDF
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

// ── Weighted field-level similarity ────────────────────────────────────────────

function computeFieldSimilarity(
  newDoc: { title: string; objectives: string; description: string },
  existing: Project[]
): ScoredProject[] {
  if (existing.length === 0) return [];

  // Build corpus for each field separately (better IDF per field)
  const allTitles = existing.map(p => tokenizeWithBigrams(p.title || ''));
  const allObjectives = existing.map(p => tokenizeWithBigrams(p.objectives || ''));
  const allDescriptions = existing.map(p => tokenizeWithBigrams(p.description || ''));

  const newTitleTokens = tokenizeWithBigrams(newDoc.title);
  const newObjTokens = tokenizeWithBigrams(newDoc.objectives);
  const newDescTokens = tokenizeWithBigrams(newDoc.description);

  // Include new doc in IDF computation
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

// ── LLM Semantic Verification (only for top candidates) ────────────────────────

async function semanticVerify(
  newProject: { title: string; objectives: string; description: string },
  candidates: ScoredProject[],
  apiKey: string
): Promise<ScoredProject[]> {
  if (candidates.length === 0) return [];

  const projectList = candidates.map((c, idx) =>
    `Project ${idx + 1}:\nTitle: ${c.project.title}\nObjectives: ${c.project.objectives || 'N/A'}\nDescription: ${c.project.description}`
  ).join('\n\n');

  const prompt = `You are a semantic textual similarity engine for academic project proposals.

Compare the NEW project against each EXISTING project below. For each, provide a similarity score 0-100 based on:
- Whether they address the SAME research problem or topic (most important)
- Methodological overlap
- Domain and objective alignment
- Conceptual similarity beyond surface keywords

Be strict: projects that share keywords but solve different problems should score LOW (<30).
Only genuinely similar research should score HIGH (>60).

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
          { role: 'system', content: 'You are a strict academic similarity scorer. Score only on genuine research overlap.' },
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
      console.error(`LLM verification failed [${response.status}]`);
      return candidates; // Fall back to TF-IDF scores
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) return candidates;

    const parsed = JSON.parse(toolCall.function.arguments);
    const llmScores = new Map<number, number>();
    for (const item of parsed.scores) {
      const idx = (item.project_number || 0) - 1;
      if (idx >= 0 && idx < candidates.length) {
        llmScores.set(idx, Math.min(100, Math.max(0, item.similarity_score)));
      }
    }

    // Blend: 40% TF-IDF + 60% LLM for verified candidates
    return candidates.map((c, i) => {
      const llmScore = llmScores.get(i);
      if (llmScore !== undefined) {
        return { ...c, score: c.score * 0.4 + llmScore * 0.6 };
      }
      return c;
    });
  } catch (error) {
    console.error('LLM semantic verification error:', error);
    return candidates; // Fall back to TF-IDF scores
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

    // ── Phase 1: TF-IDF cosine similarity with weighted fields ──
    const tfidfResults = computeFieldSimilarity(
      { title, objectives, description },
      existingProjects || []
    );

    // Sort by score descending
    tfidfResults.sort((a, b) => b.score - a.score);

    // ── Phase 2: LLM semantic verification on top candidates only ──
    const llmCandidates = tfidfResults
      .filter(r => r.score >= LLM_PREFILTER_THRESHOLD)
      .slice(0, MAX_LLM_CANDIDATES);

    let verifiedResults: ScoredProject[];
    if (llmCandidates.length > 0) {
      verifiedResults = await semanticVerify(
        { title, objectives, description },
        llmCandidates,
        lovableApiKey
      );
      // Merge back: replace LLM-verified scores, keep TF-IDF for the rest
      const verifiedIds = new Set(verifiedResults.map(r => r.project.id));
      const unverified = tfidfResults.filter(r => !verifiedIds.has(r.project.id));
      verifiedResults = [...verifiedResults, ...unverified];
    } else {
      verifiedResults = tfidfResults;
    }

    verifiedResults.sort((a, b) => b.score - a.score);

    // ── Gather profile info ──
    const allUserIds = new Set<string>();
    existingProjects?.forEach(p => {
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

    for (const sp of verifiedResults) {
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
      algorithm: 'tfidf-cosine-llm-hybrid',
      weights: WEIGHTS,
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
        ? `⚠️ Submission blocked: Found similar project(s) in the high-risk range (${thresholds.high.min_score}–${thresholds.high.max_score}%). Highest: ${Math.round(highestMatch!.score)}%.`
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
