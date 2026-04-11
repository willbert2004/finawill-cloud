import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MAX_PROJECTS = 5;
const ACTIVE_PROJECT_STATUSES = new Set(["approved", "in_progress", "completed", "finalized"]);
const REVIEWABLE_PROJECT_STATUSES = new Set(["pending", "approved", "in_progress"]);

const CATEGORY_ALIASES: Record<string, string[]> = {
  "artificial intelligence": ["ai", "artificial intelligence", "intelligent systems", "expert systems"],
  "machine learning": ["machine learning", "ml", "predictive modeling", "deep learning", "neural networks"],
  "web development": ["web", "website", "frontend", "backend", "full stack", "fullstack", "web app"],
  "mobile development": ["mobile", "android", "ios", "react native", "flutter", "mobile app"],
  "iot internet of things": ["iot", "internet of things", "sensor networks", "smart devices"],
  cybersecurity: ["cybersecurity", "security", "information security", "penetration testing", "digital forensics"],
  "data science": ["data science", "analytics", "data mining", "business intelligence", "visualization"],
  "cloud computing": ["cloud", "distributed systems", "devops", "aws", "azure", "gcp"],
  blockchain: ["blockchain", "distributed ledger", "smart contracts", "crypto"],
  robotics: ["robotics", "automation", "control systems", "mechatronics"],
  "software engineering": ["software engineering", "software design", "systems design", "requirements engineering"],
  networking: ["networking", "computer networks", "network administration", "routing", "switching"],
  "embedded systems": ["embedded systems", "microcontrollers", "firmware", "arduino", "raspberry pi"],
  "game development": ["game development", "gaming", "unity", "unreal engine", "interactive media"],
  other: [],
};

type UserRole = "student" | "supervisor" | "admin" | "moderator" | string;

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  diagnostics?: Record<string, unknown>;
}

interface AllocationMatch {
  supervisor: any;
  profile: any | null;
  score: number;
  reason: string;
  category: string;
}

interface RouteProjectResult {
  allocated: boolean;
  category: string;
  matchedSupervisorNames: string[];
  notifiedSupervisors: number;
  manualAssignmentRequired: boolean;
  topMatchScore?: number;
  topMatchReason?: string;
  message: string;
}

function respond<T>(ok: boolean, payload: Partial<ApiEnvelope<T>> = {}) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function splitTerms(value: string) {
  return uniqueStrings(normalizeText(value).split(" "));
}

function getProjectCategory(project: any) {
  if (typeof project?.category === "string" && project.category.trim()) {
    return project.category.trim();
  }

  if (Array.isArray(project?.keywords) && project.keywords.length > 0) {
    const firstKeyword = String(project.keywords[0] ?? "").trim();
    if (firstKeyword) return firstKeyword;
  }

  return "";
}

function getCategoryAliasTerms(category: string) {
  const normalizedCategory = normalizeText(category);
  const aliases = CATEGORY_ALIASES[normalizedCategory] || [];
  return uniqueStrings([normalizedCategory, ...aliases.flatMap(splitTerms)]);
}

function getSupervisorExpertise(supervisor: any, profile: any | null) {
  return uniqueStrings([
    ...((supervisor?.research_areas as string[] | null) || []),
    ...((profile?.research_areas as string[] | null) || []),
  ]);
}

function scoreCategoryAgainstExpertise(category: string, expertiseArea: string) {
  const normalizedCategory = normalizeText(category);
  const normalizedArea = normalizeText(expertiseArea);
  if (!normalizedCategory || !normalizedArea) {
    return { score: 0, reason: "" };
  }

  if (normalizedArea === normalizedCategory) {
    return {
      score: 100,
      reason: `Expertise \"${expertiseArea}\" exactly matches the project category \"${category}\".`,
    };
  }

  if (normalizedArea.includes(normalizedCategory) || normalizedCategory.includes(normalizedArea)) {
    return {
      score: 92,
      reason: `Expertise \"${expertiseArea}\" closely matches the project category \"${category}\".`,
    };
  }

  const categoryTerms = new Set(getCategoryAliasTerms(category));
  const areaTerms = splitTerms(expertiseArea);
  const overlap = areaTerms.filter((term) => categoryTerms.has(term));

  if (overlap.length > 0) {
    const overlapBonus = Math.min(20, overlap.length * 8);
    return {
      score: 70 + overlapBonus,
      reason: `Expertise \"${expertiseArea}\" overlaps with the project category through ${overlap.join(", ")}.`,
    };
  }

  return { score: 0, reason: "" };
}

function getSupervisorCapacity(supervisor: any, profile: any | null) {
  return {
    maxProjects: Number(supervisor?.max_projects ?? profile?.max_projects ?? DEFAULT_MAX_PROJECTS) || DEFAULT_MAX_PROJECTS,
    currentProjects: Number(supervisor?.current_projects ?? profile?.current_projects ?? 0) || 0,
  };
}

function scoreSupervisor(project: any, supervisor: any, profile: any | null): AllocationMatch | null {
  const category = getProjectCategory(project);
  if (!category) return null;

  const { maxProjects, currentProjects } = getSupervisorCapacity(supervisor, profile);
  if (currentProjects >= maxProjects) return null;

  const expertiseAreas = getSupervisorExpertise(supervisor, profile);
  if (expertiseAreas.length === 0) return null;

  let best = { score: 0, reason: "" };
  let matchedArea = "";

  for (const area of expertiseAreas) {
    const scored = scoreCategoryAgainstExpertise(category, area);
    if (scored.score > best.score) {
      best = scored;
      matchedArea = area;
    }
  }

  if (best.score <= 0) return null;

  const normalizedProjectDepartment = normalizeText(project?.department);
  const normalizedSupervisorDepartment = normalizeText(supervisor?.department || profile?.department);
  let departmentBonus = 0;
  let departmentReason = "";

  if (normalizedProjectDepartment && normalizedSupervisorDepartment) {
    if (normalizedProjectDepartment === normalizedSupervisorDepartment) {
      departmentBonus = 10;
      departmentReason = ` Department alignment also matches (${project.department}).`;
    } else if (
      splitTerms(project.department).some((term) => splitTerms(supervisor?.department || profile?.department || "").includes(term))
    ) {
      departmentBonus = 5;
      departmentReason = ` Department overlap supports this match.`;
    }
  }

  const capacityScore = Math.max(1, Math.round(((maxProjects - currentProjects) / Math.max(maxProjects, 1)) * 10));

  return {
    supervisor,
    profile,
    category,
    score: best.score + departmentBonus + capacityScore,
    reason: `${best.reason}${departmentReason} ${maxProjects - currentProjects} supervision slot(s) are currently available.`.trim(),
  };
}

async function getUserContext(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? anonKey;
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("user_id, user_type, full_name, email, research_areas, department, max_projects, current_projects")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.user_type) {
    throw new Error("User profile not found.");
  }

  return {
    authClient,
    adminClient,
    user: userData.user,
    role: profile.user_type as UserRole,
    profile,
  };
}

function ensureRole(role: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(role)) {
    throw new Error(`Unauthorized action for role: ${role}`);
  }
}

async function fetchSupervisorDirectory(adminClient: any) {
  const [{ data: supervisors, error: supervisorsError }, { data: profiles, error: profilesError }] = await Promise.all([
    adminClient.from("supervisors").select("user_id, department, research_areas, max_projects, current_projects"),
    adminClient
      .from("profiles")
      .select("user_id, full_name, email, user_type, research_areas, department, max_projects, current_projects")
      .eq("user_type", "supervisor"),
  ]);

  if (supervisorsError) throw new Error(supervisorsError.message);
  if (profilesError) throw new Error(profilesError.message);

  const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));

  return {
    supervisors: (supervisors || []).filter((supervisor: any) => profileMap.has(supervisor.user_id)),
    profileMap,
  };
}

async function notifyUsers(adminClient: any, notifications: any[]) {
  if (!notifications.length) return;
  const { error } = await adminClient.from("notifications").insert(notifications);
  if (error) throw new Error(error.message);
}

async function syncSupervisorCounts(adminClient: any, supervisorIds: Array<string | null | undefined>) {
  const ids = uniqueStrings(supervisorIds);
  for (const supervisorId of ids) {
    const { data: projects, error: projectsError } = await adminClient
      .from("projects")
      .select("id, status")
      .eq("supervisor_id", supervisorId);

    if (projectsError) throw new Error(projectsError.message);

    const currentProjects = (projects || []).filter((project: any) => ACTIVE_PROJECT_STATUSES.has(project.status)).length;

    const [supUpdate, profileUpdate] = await Promise.all([
      adminClient.from("supervisors").update({ current_projects: currentProjects }).eq("user_id", supervisorId),
      adminClient.from("profiles").update({ current_projects: currentProjects }).eq("user_id", supervisorId),
    ]);

    if (supUpdate.error) throw new Error(supUpdate.error.message);
    if (profileUpdate.error) throw new Error(profileUpdate.error.message);
  }
}

async function getProject(adminClient: any, projectId: string) {
  const { data, error } = await adminClient.from("projects").select("*").eq("id", projectId).single();
  if (error || !data) throw new Error(error?.message || "Project not found.");
  return data;
}

async function getPendingAllocationForSupervisor(adminClient: any, projectId: string, supervisorId: string) {
  const { data, error } = await adminClient
    .from("pending_allocations")
    .select("id, status, match_reason, match_score")
    .eq("project_id", projectId)
    .eq("supervisor_id", supervisorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function notifyAdminsForManualAssignment(adminClient: any, project: any, category: string, message: string) {
  const { data: admins, error } = await adminClient
    .from("profiles")
    .select("user_id")
    .eq("user_type", "admin");

  if (error) throw new Error(error.message);

  await notifyUsers(
    adminClient,
    (admins || []).map((admin: any) => ({
      user_id: admin.user_id,
      title: "Manual Supervisor Assignment Needed",
      message: `Project \"${project.title}\" requires manual assignment. ${message}`,
      type: "allocation",
      link: `/projects/${project.id}`,
    })),
  );
}

async function routeProjectToSupervisors(adminClient: any, projectId: string, options?: { notifyStudent?: boolean }) {
  const notifyStudent = options?.notifyStudent ?? true;
  const project = await getProject(adminClient, projectId);
  const category = getProjectCategory(project);

  const { supervisors, profileMap } = await fetchSupervisorDirectory(adminClient);

  const matches = supervisors
    .map((supervisor: any) => scoreSupervisor(project, supervisor, profileMap.get(supervisor.user_id) || null))
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score) as AllocationMatch[];

  const { error: cleanupError } = await adminClient.from("pending_allocations").delete().eq("project_id", projectId);
  if (cleanupError) throw new Error(cleanupError.message);

  const { error: resetError } = await adminClient
    .from("projects")
    .update({ supervisor_id: null, status: "pending" })
    .eq("id", projectId);
  if (resetError) throw new Error(resetError.message);

  if (!category || matches.length === 0) {
    const message = !category
      ? "The submitted project has no category, so expertise matching could not run."
      : `No supervisor currently matches the category \"${category}\".`;

    await notifyAdminsForManualAssignment(adminClient, project, category, message);

    if (notifyStudent) {
      await notifyUsers(adminClient, [
        {
          user_id: project.student_id,
          title: "Project submitted for manual review",
          message: !category
            ? `Your project \"${project.title}\" was submitted, but a category is required before matching can run.`
            : `Your project \"${project.title}\" was submitted, but no supervisor currently matches the category \"${category}\". An admin has been notified for manual assignment.`,
          type: "allocation",
          link: `/projects/${projectId}`,
        },
      ]);
    }

    return {
      allocated: false,
      category,
      matchedSupervisorNames: [],
      notifiedSupervisors: 0,
      manualAssignmentRequired: true,
      message: !category
        ? "Project category is missing, so smart allocation could not run."
        : `No supervisor currently matches the category \"${category}\". Admin has been notified for manual assignment.`,
    } satisfies RouteProjectResult;
  }

  const pendingRows = matches.map((match) => ({
    project_id: projectId,
    supervisor_id: match.supervisor.user_id,
    match_score: match.score,
    match_reason: match.reason,
    status: "pending",
  }));

  const { error: insertPendingError } = await adminClient.from("pending_allocations").insert(pendingRows);
  if (insertPendingError) throw new Error(insertPendingError.message);

  const supervisorNotifications = matches.map((match) => ({
    user_id: match.supervisor.user_id,
    title: "New Project Submission",
    message: `A ${category} project titled \"${project.title}\" matches your expertise. Open the project to accept, reject, or request revision.`,
    type: "allocation",
    link: `/projects/${projectId}`,
  }));

  const matchedSupervisorNames = matches.map((match) => match.profile?.full_name || match.profile?.email || "Unknown Supervisor");

  const notifications = [...supervisorNotifications];

  if (notifyStudent) {
    notifications.push({
      user_id: project.student_id,
      title: "Project submitted successfully",
      message: `Your project \"${project.title}\" was submitted to ${matchedSupervisorNames.join(", ")} for review.`,
      type: "allocation",
      link: `/projects/${projectId}`,
    });
  }

  await notifyUsers(adminClient, notifications);

  return {
    allocated: true,
    category,
    matchedSupervisorNames,
    notifiedSupervisors: matchedSupervisorNames.length,
    manualAssignmentRequired: false,
    topMatchScore: matches[0]?.score,
    topMatchReason: matches[0]?.reason,
    message: `Project submitted to ${matchedSupervisorNames.join(", ")} for review.`,
  } satisfies RouteProjectResult;
}

async function getAssignableSupervisor(adminClient: any, project: any, fallbackSupervisorId?: string) {
  const existingPending = await adminClient
    .from("pending_allocations")
    .select("supervisor_id, match_score")
    .eq("project_id", project.id)
    .eq("status", "pending")
    .order("match_score", { ascending: false })
    .limit(1);

  if (existingPending.error) throw new Error(existingPending.error.message);

  if (fallbackSupervisorId) {
    return fallbackSupervisorId;
  }

  if (existingPending.data?.[0]?.supervisor_id) {
    return existingPending.data[0].supervisor_id;
  }

  const reroute = await routeProjectToSupervisors(adminClient, project.id, { notifyStudent: false });
  if (!reroute.allocated) {
    return null;
  }

  const { data: topPending, error } = await adminClient
    .from("pending_allocations")
    .select("supervisor_id")
    .eq("project_id", project.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return topPending?.supervisor_id || null;
}

async function handleApproveProject(adminClient: any, projectId: string, actorId: string, role: UserRole, supervisorId?: string) {
  const project = await getProject(adminClient, projectId);
  if (!REVIEWABLE_PROJECT_STATUSES.has(project.status)) {
    throw new Error("This project can no longer be reviewed.");
  }

  let assignedSupervisorId = supervisorId || null;

  if (role === "supervisor") {
    const pendingAllocation = await getPendingAllocationForSupervisor(adminClient, projectId, actorId);
    if (!pendingAllocation && project.supervisor_id !== actorId) {
      throw new Error("This project is not awaiting your review.");
    }
    assignedSupervisorId = actorId;
  }

  if (role === "admin" && !assignedSupervisorId) {
    assignedSupervisorId = await getAssignableSupervisor(adminClient, project);
    if (!assignedSupervisorId) {
      throw new Error("No matching supervisor is available for this project.");
    }
  }

  if (!assignedSupervisorId) {
    throw new Error("Supervisor assignment could not be determined.");
  }

  const { data: assignedProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", assignedSupervisorId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  const { error: projectUpdateError } = await adminClient
    .from("projects")
    .update({ supervisor_id: assignedSupervisorId, status: "approved", rejection_reason: null })
    .eq("id", projectId);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  const { error: pendingAcceptError } = await adminClient
    .from("pending_allocations")
    .update({ status: "rejected" })
    .eq("project_id", projectId);
  if (pendingAcceptError) throw new Error(pendingAcceptError.message);

  const { error: specificPendingError } = await adminClient
    .from("pending_allocations")
    .update({ status: "accepted" })
    .eq("project_id", projectId)
    .eq("supervisor_id", assignedSupervisorId);
  if (specificPendingError) throw new Error(specificPendingError.message);

  await syncSupervisorCounts(adminClient, [assignedSupervisorId]);

  await notifyUsers(adminClient, [
    {
      user_id: project.student_id,
      title: "Project approved",
      message: `Your project \"${project.title}\" has been approved and assigned to ${assignedProfile?.full_name || assignedProfile?.email || "your supervisor"}.`,
      type: "project",
      link: `/projects/${projectId}`,
    },
  ]);

  return {
    projectId,
    supervisorId: assignedSupervisorId,
    supervisorName: assignedProfile?.full_name || assignedProfile?.email || "Assigned Supervisor",
  };
}

async function handleProjectFeedback(adminClient: any, projectId: string, actorId: string, role: UserRole, feedback: string, outcome: "needs_revision" | "rejected") {
  const project = await getProject(adminClient, projectId);

  if (!feedback.trim()) {
    throw new Error("Feedback is required.");
  }

  if (role === "supervisor") {
    const pendingAllocation = await getPendingAllocationForSupervisor(adminClient, projectId, actorId);
    if (!pendingAllocation && project.supervisor_id !== actorId) {
      throw new Error("This project is not awaiting your review.");
    }
  }

  const previousSupervisorId = project.supervisor_id;

  const { error: projectUpdateError } = await adminClient
    .from("projects")
    .update({
      status: outcome,
      rejection_reason: feedback.trim(),
      supervisor_id: null,
    })
    .eq("id", projectId);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  const { error: pendingUpdateError } = await adminClient
    .from("pending_allocations")
    .update({ status: "rejected" })
    .eq("project_id", projectId);
  if (pendingUpdateError) throw new Error(pendingUpdateError.message);

  if (previousSupervisorId) {
    await syncSupervisorCounts(adminClient, [previousSupervisorId]);
  }

  await notifyUsers(adminClient, [
    {
      user_id: project.student_id,
      title: outcome === "needs_revision" ? "Project needs revision" : "Project rejected",
      message:
        outcome === "needs_revision"
          ? `Your project \"${project.title}\" needs revision: ${feedback.trim()}`
          : `Your project \"${project.title}\" has been rejected: ${feedback.trim()}`,
      type: "project",
      link: `/projects/${projectId}`,
    },
  ]);

  return {
    projectId,
    status: outcome,
  };
}

async function validateSupervisorCapacity(adminClient: any, supervisorId: string) {
  const [{ data: supervisor, error: supervisorError }, { data: profile, error: profileError }] = await Promise.all([
    adminClient.from("supervisors").select("user_id, max_projects, current_projects").eq("user_id", supervisorId).maybeSingle(),
    adminClient.from("profiles").select("full_name, email, max_projects, current_projects").eq("user_id", supervisorId).maybeSingle(),
  ]);

  if (supervisorError) throw new Error(supervisorError.message);
  if (profileError) throw new Error(profileError.message);
  if (!supervisor) throw new Error("Supervisor not found.");

  const { maxProjects, currentProjects } = getSupervisorCapacity(supervisor, profile);
  if (currentProjects >= maxProjects) {
    throw new Error(`This supervisor has reached the maximum of ${maxProjects} active projects.`);
  }

  return { supervisor, profile };
}

async function handleManualAssign(adminClient: any, projectId: string, actorId: string, role: UserRole, supervisorId?: string) {
  const project = await getProject(adminClient, projectId);
  const targetSupervisorId = role === "supervisor" ? actorId : supervisorId;
  if (!targetSupervisorId) {
    throw new Error("Supervisor is required for manual assignment.");
  }

  const previousSupervisorId = project.supervisor_id;
  const { profile } = await validateSupervisorCapacity(adminClient, targetSupervisorId);

  const { error: projectUpdateError } = await adminClient
    .from("projects")
    .update({ supervisor_id: targetSupervisorId, status: "approved", rejection_reason: null })
    .eq("id", projectId);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  const { error: pendingDeleteError } = await adminClient.from("pending_allocations").delete().eq("project_id", projectId);
  if (pendingDeleteError) throw new Error(pendingDeleteError.message);

  await syncSupervisorCounts(adminClient, [previousSupervisorId, targetSupervisorId]);

  const notifications = [
    {
      user_id: project.student_id,
      title: "Supervisor assigned",
      message: `Your project \"${project.title}\" has been assigned to ${profile?.full_name || profile?.email || "your supervisor"}.`,
      type: "project",
      link: `/projects/${projectId}`,
    },
  ];

  if (role === "admin" && targetSupervisorId !== actorId) {
    notifications.push({
      user_id: targetSupervisorId,
      title: "Project assigned to you",
      message: `You have been assigned to supervise \"${project.title}\".`,
      type: "allocation",
      link: `/projects/${projectId}`,
    });
  }

  await notifyUsers(adminClient, notifications);

  return {
    projectId,
    supervisorId: targetSupervisorId,
    supervisorName: profile?.full_name || profile?.email || "Assigned Supervisor",
  };
}

async function handleReassign(adminClient: any, projectId: string, newSupervisorId: string) {
  const project = await getProject(adminClient, projectId);
  const oldSupervisorId = project.supervisor_id;
  const { profile } = await validateSupervisorCapacity(adminClient, newSupervisorId);

  const { error: projectUpdateError } = await adminClient
    .from("projects")
    .update({ supervisor_id: newSupervisorId, status: "approved", rejection_reason: null })
    .eq("id", projectId);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  const { error: pendingDeleteError } = await adminClient.from("pending_allocations").delete().eq("project_id", projectId);
  if (pendingDeleteError) throw new Error(pendingDeleteError.message);

  await syncSupervisorCounts(adminClient, [oldSupervisorId, newSupervisorId]);

  await notifyUsers(adminClient, [
    {
      user_id: project.student_id,
      title: "Supervisor changed",
      message: `Your project \"${project.title}\" is now assigned to ${profile?.full_name || profile?.email || "your supervisor"}.`,
      type: "project",
      link: `/projects/${projectId}`,
    },
    {
      user_id: newSupervisorId,
      title: "Project reassigned to you",
      message: `You are now supervising \"${project.title}\".`,
      type: "allocation",
      link: `/projects/${projectId}`,
    },
  ]);

  return { projectId, supervisorId: newSupervisorId };
}

async function handleUnassign(adminClient: any, projectId: string) {
  const project = await getProject(adminClient, projectId);
  const oldSupervisorId = project.supervisor_id;

  const { error: projectUpdateError } = await adminClient
    .from("projects")
    .update({ supervisor_id: null, status: "pending" })
    .eq("id", projectId);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  const { error: pendingDeleteError } = await adminClient.from("pending_allocations").delete().eq("project_id", projectId);
  if (pendingDeleteError) throw new Error(pendingDeleteError.message);

  await syncSupervisorCounts(adminClient, [oldSupervisorId]);

  return { projectId };
}

async function handleBulkProjectRouting(adminClient: any) {
  const { data: projects, error } = await adminClient
    .from("projects")
    .select("id, supervisor_id, status")
    .is("supervisor_id", null)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  let allocated = 0;
  let manualReviewCount = 0;

  for (const project of projects || []) {
    const result = await routeProjectToSupervisors(adminClient, project.id, { notifyStudent: false });
    if (result.allocated) allocated += 1;
    if (result.manualAssignmentRequired) manualReviewCount += 1;
  }

  return {
    allocated,
    total: (projects || []).length,
    manualReviewCount,
    message:
      allocated > 0
        ? `Queued ${allocated} project(s) for supervisor review.`
        : "No pending projects could be matched to available supervisors.",
  };
}

async function scoreGroupForSupervisor(group: any, supervisor: any, profile: any | null) {
  const projectType = String(group?.project_type || "").trim();
  const pseudoProject = { ...group, keywords: projectType ? [projectType] : [] };
  return scoreSupervisor(pseudoProject, supervisor, profile);
}

async function handleAllocateGroup(adminClient: any, groupId: string) {
  const { data: group, error: groupError } = await adminClient
    .from("student_groups")
    .select("id, name, department, project_type, created_by")
    .eq("id", groupId)
    .single();
  if (groupError || !group) throw new Error(groupError?.message || "Group not found.");

  const { supervisors, profileMap } = await fetchSupervisorDirectory(adminClient);
  const matches = supervisors
    .map((supervisor: any) => scoreGroupForSupervisor(group, supervisor, profileMap.get(supervisor.user_id) || null))
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score) as AllocationMatch[];

  if (!matches.length) {
    throw new Error("No matching supervisor is available for this group.");
  }

  const bestMatch = matches[0];

  await adminClient.from("group_allocations").delete().eq("group_id", groupId).eq("status", "pending");

  const { error: insertError } = await adminClient.from("group_allocations").insert({
    group_id: groupId,
    supervisor_id: bestMatch.supervisor.user_id,
    match_score: bestMatch.score,
    match_reason: bestMatch.reason,
    status: "pending",
  });
  if (insertError) throw new Error(insertError.message);

  await notifyUsers(adminClient, [
    {
      user_id: bestMatch.supervisor.user_id,
      title: "New Group Supervision Request",
      message: `Student group \"${group.name}\" matches your expertise. Open the allocation page to review it.`,
      type: "allocation",
      link: "/allocation",
    },
  ]);

  return {
    groupId,
    supervisorId: bestMatch.supervisor.user_id,
    supervisorName: bestMatch.profile?.full_name || bestMatch.profile?.email || "Assigned Supervisor",
  };
}

async function handleGroupAllocationDecision(adminClient: any, allocationId: string, supervisorId: string, status: "accepted" | "rejected") {
  const { data: allocation, error } = await adminClient
    .from("group_allocations")
    .select("id, group_id, supervisor_id, student_groups:group_id (id, name, created_by)")
    .eq("id", allocationId)
    .eq("supervisor_id", supervisorId)
    .single();

  if (error || !allocation) throw new Error(error?.message || "Group allocation not found.");

  const { error: updateError } = await adminClient
    .from("group_allocations")
    .update({ status })
    .eq("id", allocationId);
  if (updateError) throw new Error(updateError.message);

  const groupInfo = Array.isArray(allocation.student_groups) ? allocation.student_groups[0] : allocation.student_groups;
  const creatorId = groupInfo?.created_by;
  if (creatorId) {
    await notifyUsers(adminClient, [
      {
        user_id: creatorId,
        title: status === "accepted" ? "Group supervision accepted" : "Group supervision declined",
        message:
          status === "accepted"
            ? `Your group \"${groupInfo?.name || "your group"}\" has been accepted by a supervisor.`
            : `Your group \"${groupInfo?.name || "your group"}\" has been declined by a supervisor.`,
        type: "allocation",
        link: "/student-groups",
      },
    ]);
  }

  return { allocationId, status };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const { adminClient, user, role } = await getUserContext(req);
    const body = await req.json();
    const action = String(body?.action || "").trim();

    if (!action) {
      return respond(false, {
        error: "Action is required.",
        diagnostics: { error_stage: "validation", processing_time_ms: Date.now() - startedAt },
      });
    }

    if (action === "auto_allocate_project") {
      ensureRole(role, ["student", "admin"]);
      const data = await routeProjectToSupervisors(adminClient, String(body.projectId || ""), { notifyStudent: true });
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "approve_project") {
      ensureRole(role, ["supervisor", "admin"]);
      const data = await handleApproveProject(
        adminClient,
        String(body.projectId || ""),
        user.id,
        role,
        body.supervisorId ? String(body.supervisorId) : undefined,
      );
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "request_revision") {
      ensureRole(role, ["supervisor", "admin"]);
      const data = await handleProjectFeedback(
        adminClient,
        String(body.projectId || ""),
        user.id,
        role,
        String(body.rejectionReason || ""),
        "needs_revision",
      );
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "reject_project_with_feedback") {
      ensureRole(role, ["supervisor", "admin"]);
      const data = await handleProjectFeedback(
        adminClient,
        String(body.projectId || ""),
        user.id,
        role,
        String(body.rejectionReason || ""),
        "rejected",
      );
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "manual_assign") {
      ensureRole(role, ["supervisor", "admin"]);
      const data = await handleManualAssign(
        adminClient,
        String(body.projectId || ""),
        user.id,
        role,
        body.supervisorId ? String(body.supervisorId) : undefined,
      );
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "reassign") {
      ensureRole(role, ["admin"]);
      const data = await handleReassign(adminClient, String(body.projectId || ""), String(body.newSupervisorId || ""));
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "unassign") {
      ensureRole(role, ["admin"]);
      const data = await handleUnassign(adminClient, String(body.projectId || ""));
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "generate_suggestions" || action === "bulk_auto_allocate") {
      ensureRole(role, ["admin"]);
      const data = await handleBulkProjectRouting(adminClient);
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "allocate_group") {
      ensureRole(role, ["student", "admin"]);
      const data = await handleAllocateGroup(adminClient, String(body.groupId || ""));
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "accept_group_allocation") {
      ensureRole(role, ["supervisor", "admin"]);
      const data = await handleGroupAllocationDecision(adminClient, String(body.allocationId || ""), user.id, "accepted");
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    if (action === "reject_group_allocation") {
      ensureRole(role, ["supervisor", "admin"]);
      const data = await handleGroupAllocationDecision(adminClient, String(body.allocationId || ""), user.id, "rejected");
      return respond(true, { data, diagnostics: { action, processing_time_ms: Date.now() - startedAt } });
    }

    return respond(false, {
      error: `Unsupported action: ${action}`,
      diagnostics: { error_stage: "action_dispatch", processing_time_ms: Date.now() - startedAt },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("smart-allocation error", message);
    return respond(false, {
      error: message,
      diagnostics: {
        error_stage: "handler",
        processing_time_ms: Date.now() - startedAt,
      },
    });
  }
});
