import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SIMILARITY_THRESHOLD = 35; // Projects above this % are considered duplicates

interface Project {
  id: string;
  title: string;
  description: string;
  objectives: string;
  student_id: string;
  supervisor_id?: string;
  year?: number;
}

interface SimilarityResult {
  projectId: string;
  score: number;
}

async function computeSemanticSimilarity(
  newProject: { title: string; objectives: string; description: string },
  existingProjects: Project[],
  apiKey: string
): Promise<SimilarityResult[]> {
  if (existingProjects.length === 0) return [];

  const batchSize = 10;
  const allResults: SimilarityResult[] = [];

  for (let i = 0; i < existingProjects.length; i += batchSize) {
    const batch = existingProjects.slice(i, i + batchSize);

    const projectList = batch.map((p, idx) =>
      `Project ${idx + 1} (ID: ${p.id}):\nTitle: ${p.title}\nObjectives: ${p.objectives || 'N/A'}\nDescription: ${p.description}`
    ).join('\n\n');

    const prompt = `You are a semantic textual similarity (STS) engine. Compare the NEW project proposal against each EXISTING project below.

For each existing project, compute a similarity score from 0 to 100 based on:
- Semantic meaning overlap (not just keyword matching)
- Conceptual similarity of the research topics and objectives
- Methodological similarity
- Domain/field overlap
- Objective alignment

NEW PROJECT:
Title: ${newProject.title}
Objectives: ${newProject.objectives}
Description: ${newProject.description}

EXISTING PROJECTS:
${projectList}

Return similarity scores for each project.`;

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
            { role: 'system', content: 'You are a semantic similarity scoring engine.' },
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
                        project_id: { type: 'string' },
                        similarity_score: { type: 'number' },
                        reasoning: { type: 'string' }
                      },
                      required: ['project_id', 'similarity_score', 'reasoning'],
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
        console.error(`AI gateway error [${response.status}]:`, await response.text());
        for (const p of batch) {
          allResults.push({ projectId: p.id, score: fallbackSimilarity(newProject, p) });
        }
        continue;
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        for (const item of parsed.scores) {
          allResults.push({
            projectId: item.project_id,
            score: Math.min(100, Math.max(0, item.similarity_score)),
          });
        }
      } else {
        for (const p of batch) {
          allResults.push({ projectId: p.id, score: fallbackSimilarity(newProject, p) });
        }
      }
    } catch (error) {
      console.error('Error computing semantic similarity:', error);
      for (const p of batch) {
        allResults.push({ projectId: p.id, score: fallbackSimilarity(newProject, p) });
      }
    }
  }

  return allResults;
}

function fallbackSimilarity(p1: { title: string; description: string }, p2: { title: string; description: string }): number {
  const words1 = new Set(`${p1.title} ${p1.description}`.toLowerCase().split(/\s+/));
  const words2 = new Set(`${p2.title} ${p2.description}`.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return (intersection.size / union.size) * 100;
}

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

    // Fetch all existing projects (don't insert anything - just check)
    const { data: existingProjects, error: fetchError } = await adminClient
      .from('projects')
      .select('id, title, objectives, description, student_id, supervisor_id, year');

    if (fetchError) throw fetchError;

    const similarityResults = await computeSemanticSimilarity(
      { title, objectives, description },
      existingProjects || [],
      lovableApiKey
    );

    // Gather profile info for similar projects
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

    // Build results — flag as duplicate if any score > threshold
    const similarities: Array<{ project: Project; score: number }> = [];
    let isDuplicate = false;
    let highestMatch: { project: Project; score: number } | null = null;

    for (const result of similarityResults) {
      const project = existingProjects?.find(p => p.id === result.projectId);
      if (!project) continue;

      if (result.score > SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        similarities.push({ project, score: result.score });
      }

      if (!highestMatch || result.score > highestMatch.score) {
        highestMatch = { project, score: result.score };
      }
    }

    similarities.sort((a, b) => b.score - a.score);

    const response = {
      isDuplicate,
      highestSimilarity: highestMatch ? highestMatch.score : 0,
      similarProjects: similarities.slice(0, 5).map(s => ({
        id: s.project.id,
        title: s.project.title,
        description: s.project.description,
        objectives: s.project.objectives,
        similarity: Math.round(s.score * 10) / 10,
        student_name: profileMap[s.project.student_id] || 'Unknown',
        supervisor_name: s.project.supervisor_id ? (profileMap[s.project.supervisor_id] || 'Not assigned') : 'Not assigned',
        year: s.project.year || new Date(Date.now()).getFullYear(),
      })),
      message: isDuplicate
        ? `⚠️ Submission blocked: Found similar project(s) above ${SIMILARITY_THRESHOLD}% threshold (highest: ${Math.round(highestMatch!.score)}%).`
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
