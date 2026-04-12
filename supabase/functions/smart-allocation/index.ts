import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function ok(data: unknown) {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error: string, diagnostics?: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: false, error, diagnostics }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ─── helpers ─── */

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function getCategory(project: Record<string, unknown>): string {
  // projects table has no "category" column – the category is stored as keywords[0]
  const kw = project.keywords as string[] | null;
  if (Array.isArray(kw) && kw.length > 0 && kw[0]) return kw[0].trim();
  return "";
}

const ALIASES: Record<string, string[]> = {
  "artificial intelligence": ["ai", "intelligent systems", "expert systems"],
  "machine learning": ["ml", "deep learning", "neural networks", "predictive modeling"],
  "web development": ["web", "frontend", "backend", "full stack", "web app"],
  "mobile development": ["mobile", "android", "ios", "flutter", "react native"],
  "iot internet of things": ["iot", "sensor networks", "smart devices"],
  cybersecurity: ["security", "information security", "penetration testing", "digital forensics"],
  "data science": ["data mining", "analytics", "business intelligence"],
  "cloud computing": ["cloud", "devops", "aws", "azure", "distributed systems"],
  blockchain: ["distributed ledger", "smart contracts", "crypto"],
  robotics: ["automation", "control systems", "mechatronics"],
  "software engineering": ["software design", "systems design"],
  networking: ["computer networks", "network administration"],
  "embedded systems": ["microcontrollers", "firmware", "arduino"],
  "game development": ["gaming", "unity", "unreal engine"],
};

function categoryMatchScore(category: string, expertise: string): number {
  const nc = normalize(category);
  const ne = normalize(expertise);
  if (!nc || !ne) return 0;
  if (nc === ne) return 100;
  if (nc.includes(ne) || ne.includes(nc)) return 90;

  // check aliases
  const aliasTerms: string[] = [];
  for (const [key, vals] of Object.entries(ALIASES)) {
    if (normalize(key) === nc || vals.some((v) => normalize(v) === nc)) {
      aliasTerms.push(normalize(key), ...vals.map(normalize));
    }
  }
  if (aliasTerms.length > 0) {
    for (const term of aliasTerms) {
      if (ne === term) return 85;
      if (ne.includes(term) || term.includes(ne)) return 75;
    }
  }

  // token overlap
  const catTokens = new Set(nc.split(" "));
  const expTokens = ne.split(" ");
  const overlap = expTokens.filter((t) => catTokens.has(t));
  if (overlap.length > 0) return 60 + Math.min(overlap.length * 5, 20);

  return 0;
}

/* ─── main handler ─── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!supabaseUrl || !serviceKey) {
      return fail("Server configuration error: missing env vars");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return fail("Unauthorized");
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return fail("Unauthorized");

    // Admin client bypasses RLS
    const admin = createClient(supabaseUrl, serviceKey);

    // Get caller profile
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("user_id, user_type, full_name, email")
      .eq("user_id", user.id)
      .single();

    if (!callerProfile) return fail("Profile not found");
    const role = callerProfile.user_type;

    const body = await req.json();
    const action = String(body?.action ?? "");

    console.log(`[smart-allocation] action=${action} user=${user.id} role=${role}`);

    /* ═══════════════════════════════════════════
       ACTION: auto_allocate_project
       Called after student submits a project.
       Matches category (keywords[0]) to supervisor research_areas.
       ═══════════════════════════════════════════ */
    if (action === "auto_allocate_project") {
      if (role !== "student" && role !== "admin") return fail("Unauthorized role");
      const projectId = String(body.projectId ?? "");
      if (!projectId) return fail("projectId is required");

      // Fetch the project
      const { data: project, error: projErr } = await admin
        .from("projects").select("*").eq("id", projectId).single();
      if (projErr || !project) return fail("Project not found: " + (projErr?.message ?? ""));

      const category = getCategory(project);
      console.log(`[smart-allocation] project=${projectId} category="${category}"`);

      if (!category) {
        return ok({
          allocated: false,
          category: "",
          matchedSupervisorNames: [],
          notifiedSupervisors: 0,
          manualAssignmentRequired: true,
          message: "No category set on the project – cannot match supervisors.",
        });
      }

      // Fetch all supervisors with their profiles
      const { data: supervisors } = await admin
        .from("supervisors")
        .select("user_id, research_areas, department, max_projects, current_projects");

      const { data: supProfiles } = await admin
        .from("profiles")
        .select("user_id, full_name, email, research_areas, department, max_projects, current_projects")
        .eq("user_type", "supervisor");

      const profileMap = new Map((supProfiles ?? []).map((p: any) => [p.user_id, p]));

      // Score each supervisor
      const matches: Array<{ userId: string; name: string; score: number; reason: string }> = [];

      for (const sup of supervisors ?? []) {
        const profile = profileMap.get(sup.user_id);
        if (!profile) continue;

        // Combine research_areas from both tables
        const areas: string[] = [
          ...((sup.research_areas as string[]) ?? []),
          ...((profile.research_areas as string[]) ?? []),
        ];
        const uniqueAreas = [...new Set(areas.filter(Boolean))];
        if (uniqueAreas.length === 0) continue;

        // Capacity check
        const maxP = Number(sup.max_projects ?? profile.max_projects ?? 5) || 5;
        const curP = Number(sup.current_projects ?? profile.current_projects ?? 0) || 0;
        if (curP >= maxP) continue;

        // Find best matching area
        let bestScore = 0;
        let bestArea = "";
        for (const area of uniqueAreas) {
          const s = categoryMatchScore(category, area);
          if (s > bestScore) {
            bestScore = s;
            bestArea = area;
          }
        }

        if (bestScore > 0) {
          matches.push({
            userId: sup.user_id,
            name: profile.full_name || profile.email || "Supervisor",
            score: bestScore,
            reason: `Expertise "${bestArea}" matches category "${category}" (score: ${bestScore})`,
          });
        }
      }

      matches.sort((a, b) => b.score - a.score);
      console.log(`[smart-allocation] found ${matches.length} matching supervisors`);

      if (matches.length === 0) {
        // Notify admins for manual assignment
        const { data: admins } = await admin
          .from("profiles").select("user_id").eq("user_type", "admin");

        if (admins && admins.length > 0) {
          await admin.from("notifications").insert(
            admins.map((a: any) => ({
              user_id: a.user_id,
              title: "Manual Assignment Needed",
              message: `Project "${project.title}" (category: ${category}) has no matching supervisor.`,
              type: "allocation",
              link: `/projects/${projectId}`,
            }))
          );
        }

        return ok({
          allocated: false,
          category,
          matchedSupervisorNames: [],
          notifiedSupervisors: 0,
          manualAssignmentRequired: true,
          message: `No supervisor matches the category "${category}". Admin has been notified.`,
        });
      }

      // Auto-assign to the best matching supervisor directly
      const best = matches[0];

      // Clean old pending_allocations for this project
      await admin.from("pending_allocations").delete().eq("project_id", projectId);

      // Force-assign project
      await admin.from("projects").update({
        supervisor_id: best.userId,
        status: "approved",
        rejection_reason: null,
      }).eq("id", projectId);

      // Update supervisor project counts
      const { data: activeProjects } = await admin
        .from("projects").select("id").eq("supervisor_id", best.userId).in("status", ["approved", "in_progress"]);
      const count = activeProjects?.length ?? 0;
      await admin.from("supervisors").update({ current_projects: count }).eq("user_id", best.userId);
      await admin.from("profiles").update({ current_projects: count }).eq("user_id", best.userId);

      // Notify supervisor and student
      await admin.from("notifications").insert([
        {
          user_id: best.userId,
          title: "New Project Assigned",
          message: `Project "${project.title}" (${category}) has been assigned to you based on your expertise.`,
          type: "allocation",
          link: `/projects/${projectId}`,
        },
        {
          user_id: project.student_id,
          title: "Project Submitted & Assigned",
          message: `Your project "${project.title}" has been assigned to ${best.name}.`,
          type: "project",
          link: `/projects/${projectId}`,
        },
      ]);

      return ok({
        allocated: true,
        category,
        matchedSupervisorNames: [best.name],
        notifiedSupervisors: 1,
        manualAssignmentRequired: false,
        topMatchScore: best.score,
        topMatchReason: best.reason,
        message: `Project assigned to ${best.name}.`,
      });
    }

    /* ═══════════════════════════════════════════
       ACTION: approve_project
       Supervisor accepts a project.
       ═══════════════════════════════════════════ */
    if (action === "approve_project") {
      if (role !== "supervisor" && role !== "admin") return fail("Unauthorized role");
      const projectId = String(body.projectId ?? "");
      if (!projectId) return fail("projectId is required");

      const { data: project, error: projErr } = await admin
        .from("projects").select("*").eq("id", projectId).single();
      if (projErr || !project) return fail("Project not found");

      const supervisorId = role === "supervisor" ? user.id : (body.supervisorId ?? user.id);

      // Get supervisor name
      const { data: supProfile } = await admin
        .from("profiles").select("full_name, email").eq("user_id", supervisorId).single();

      // Update project
      const { error: updateErr } = await admin.from("projects").update({
        supervisor_id: supervisorId,
        status: "approved",
        rejection_reason: null,
      }).eq("id", projectId);
      if (updateErr) return fail("Failed to update project: " + updateErr.message);

      // Clean up pending_allocations
      await admin.from("pending_allocations").update({ status: "rejected" }).eq("project_id", projectId);
      await admin.from("pending_allocations").update({ status: "accepted" }).eq("project_id", projectId).eq("supervisor_id", supervisorId);

      // Update supervisor project count
      const { data: activeProjects } = await admin
        .from("projects").select("id").eq("supervisor_id", supervisorId).in("status", ["approved", "in_progress"]);
      const count = activeProjects?.length ?? 0;
      await admin.from("supervisors").update({ current_projects: count }).eq("user_id", supervisorId);
      await admin.from("profiles").update({ current_projects: count }).eq("user_id", supervisorId);

      // Notify student
      const supName = supProfile?.full_name || supProfile?.email || "your supervisor";
      await admin.from("notifications").insert({
        user_id: project.student_id,
        title: "Project Approved!",
        message: `Your project "${project.title}" has been approved and assigned to ${supName}.`,
        type: "project",
        link: `/projects/${projectId}`,
      });

      return ok({
        projectId,
        supervisorId,
        supervisorName: supName,
      });
    }

    /* ═══════════════════════════════════════════
       ACTION: reject_project_with_feedback
       ═══════════════════════════════════════════ */
    if (action === "reject_project_with_feedback") {
      if (role !== "supervisor" && role !== "admin") return fail("Unauthorized role");
      const projectId = String(body.projectId ?? "");
      const feedback = String(body.rejectionReason ?? "").trim();
      if (!projectId) return fail("projectId is required");
      if (!feedback) return fail("Feedback is required");

      const { data: project } = await admin.from("projects").select("*").eq("id", projectId).single();
      if (!project) return fail("Project not found");

      await admin.from("projects").update({
        status: "rejected",
        rejection_reason: feedback,
        supervisor_id: null,
      }).eq("id", projectId);

      await admin.from("pending_allocations").update({ status: "rejected" }).eq("project_id", projectId);

      await admin.from("notifications").insert({
        user_id: project.student_id,
        title: "Project Rejected",
        message: `Your project "${project.title}" was rejected: ${feedback}`,
        type: "project",
        link: `/projects/${projectId}`,
      });

      return ok({ projectId, status: "rejected" });
    }

    /* ═══════════════════════════════════════════
       ACTION: request_revision
       ═══════════════════════════════════════════ */
    if (action === "request_revision") {
      if (role !== "supervisor" && role !== "admin") return fail("Unauthorized role");
      const projectId = String(body.projectId ?? "");
      const feedback = String(body.rejectionReason ?? "").trim();
      if (!projectId) return fail("projectId is required");
      if (!feedback) return fail("Feedback is required");

      const { data: project } = await admin.from("projects").select("*").eq("id", projectId).single();
      if (!project) return fail("Project not found");

      await admin.from("projects").update({
        status: "needs_revision",
        rejection_reason: feedback,
        supervisor_id: null,
      }).eq("id", projectId);

      await admin.from("pending_allocations").update({ status: "rejected" }).eq("project_id", projectId);

      await admin.from("notifications").insert({
        user_id: project.student_id,
        title: "Project Needs Revision",
        message: `Your project "${project.title}" needs revision: ${feedback}`,
        type: "project",
        link: `/projects/${projectId}`,
      });

      return ok({ projectId, status: "needs_revision" });
    }

    /* ═══════════════════════════════════════════
       ACTION: manual_assign
       Admin manually assigns a supervisor
       ═══════════════════════════════════════════ */
    if (action === "manual_assign") {
      if (role !== "admin" && role !== "supervisor") return fail("Unauthorized role");
      const projectId = String(body.projectId ?? "");
      const supervisorId = role === "supervisor" ? user.id : String(body.supervisorId ?? "");
      if (!projectId || !supervisorId) return fail("projectId and supervisorId required");

      const { data: project } = await admin.from("projects").select("*").eq("id", projectId).single();
      if (!project) return fail("Project not found");

      const { data: supProfile } = await admin.from("profiles").select("full_name, email").eq("user_id", supervisorId).single();

      await admin.from("projects").update({
        supervisor_id: supervisorId,
        status: "approved",
        rejection_reason: null,
      }).eq("id", projectId);

      await admin.from("pending_allocations").delete().eq("project_id", projectId);

      const supName = supProfile?.full_name || supProfile?.email || "Supervisor";
      await admin.from("notifications").insert({
        user_id: project.student_id,
        title: "Supervisor Assigned",
        message: `Your project "${project.title}" has been assigned to ${supName}.`,
        type: "project",
        link: `/projects/${projectId}`,
      });

      return ok({ projectId, supervisorId, supervisorName: supName });
    }

    /* ═══════════════════════════════════════════
       ACTION: bulk_auto_allocate / generate_suggestions
       Admin force-assigns all unassigned pending projects
       to their best matching supervisor (no accept/reject).
       Supervisors at max capacity are skipped.
       ═══════════════════════════════════════════ */
    if (action === "bulk_auto_allocate" || action === "generate_suggestions") {
      if (role !== "admin") return fail("Unauthorized role");

      const { data: pendingProjects } = await admin
        .from("projects").select("*").is("supervisor_id", null).eq("status", "pending");

      if (!pendingProjects || pendingProjects.length === 0) {
        return ok({ allocated: 0, total: 0, skipped: 0, message: "No pending projects to allocate." });
      }

      // Fetch all supervisors + profiles once
      const { data: sups } = await admin.from("supervisors").select("user_id, research_areas, max_projects, current_projects");
      const { data: profs } = await admin.from("profiles").select("user_id, full_name, email, research_areas, max_projects, current_projects").eq("user_type", "supervisor");
      const pm = new Map((profs ?? []).map((pr: any) => [pr.user_id, pr]));

      // Build a mutable capacity tracker so we don't over-allocate in one batch
      const capacityMap = new Map<string, { current: number; max: number }>();
      for (const sup of sups ?? []) {
        const prof = pm.get(sup.user_id);
        const maxP = Number(sup.max_projects ?? prof?.max_projects ?? 5) || 5;
        const curP = Number(sup.current_projects ?? prof?.current_projects ?? 0) || 0;
        capacityMap.set(sup.user_id, { current: curP, max: maxP });
      }

      let allocated = 0;
      let skipped = 0;
      const allNotifications: any[] = [];

      for (const project of pendingProjects) {
        try {
          const category = getCategory(project);
          if (!category) { skipped++; continue; }

          // Score all supervisors for this project
          type Match = { userId: string; name: string; score: number; reason: string };
          const matches: Match[] = [];

          for (const sup of sups ?? []) {
            const prof = pm.get(sup.user_id);
            if (!prof) continue;
            const cap = capacityMap.get(sup.user_id)!;
            if (cap.current >= cap.max) continue; // at capacity

            const areas = [...((sup.research_areas as string[]) ?? []), ...((prof.research_areas as string[]) ?? [])];
            const uniqueAreas = [...new Set(areas.filter(Boolean))];

            let bestScore = 0;
            let bestArea = "";
            for (const area of uniqueAreas) {
              const s = categoryMatchScore(category, area);
              if (s > bestScore) { bestScore = s; bestArea = area; }
            }

            if (bestScore > 0) {
              matches.push({
                userId: sup.user_id,
                name: prof.full_name || prof.email || "Supervisor",
                score: bestScore,
                reason: `Expertise "${bestArea}" matches category "${category}" (score: ${bestScore})`,
              });
            }
          }

          matches.sort((a, b) => b.score - a.score);

          if (matches.length === 0) { skipped++; continue; }

          const best = matches[0];

          // Force-assign project to best supervisor
          await admin.from("projects").update({
            supervisor_id: best.userId,
            status: "approved",
            rejection_reason: null,
          }).eq("id", project.id);

          // Clean up any pending allocations
          await admin.from("pending_allocations").delete().eq("project_id", project.id);

          // Update capacity tracker
          const cap = capacityMap.get(best.userId)!;
          cap.current++;

          // Update supervisor counts in DB
          await admin.from("supervisors").update({ current_projects: cap.current }).eq("user_id", best.userId);
          await admin.from("profiles").update({ current_projects: cap.current }).eq("user_id", best.userId);

          // Queue notifications
          allNotifications.push({
            user_id: best.userId,
            title: "Project Assigned to You",
            message: `Admin has assigned project "${project.title}" (${category}) to you based on your expertise.`,
            type: "allocation",
            link: `/projects/${project.id}`,
          });
          allNotifications.push({
            user_id: project.student_id,
            title: "Supervisor Assigned",
            message: `Your project "${project.title}" has been assigned to ${best.name}.`,
            type: "project",
            link: `/projects/${project.id}`,
          });

          allocated++;
        } catch (e) {
          console.error("[bulk] error for project", project.id, e);
          skipped++;
        }
      }

      // Send all notifications in one batch
      if (allNotifications.length > 0) {
        await admin.from("notifications").insert(allNotifications);
      }

      return ok({
        allocated,
        total: pendingProjects.length,
        skipped,
        message: allocated > 0
          ? `Force-assigned ${allocated} project(s) to matching supervisors.`
          : "No pending projects could be matched to available supervisors.",
      });
    }

    /* ═══════════════════════════════════════════
       ACTION: allocate_group
       ═══════════════════════════════════════════ */
    if (action === "allocate_group") {
      if (role !== "student" && role !== "admin") return fail("Unauthorized role");
      const groupId = String(body.groupId ?? "");
      if (!groupId) return fail("groupId is required");

      const { data: group } = await admin.from("student_groups")
        .select("id, name, department, project_type, created_by").eq("id", groupId).single();
      if (!group) return fail("Group not found");

      const category = String(group.project_type ?? "").trim();
      if (!category) return fail("Group has no project type set");

      const { data: sups } = await admin.from("supervisors").select("user_id, research_areas, max_projects, current_projects");
      const { data: profs } = await admin.from("profiles").select("user_id, full_name, email, research_areas, max_projects, current_projects").eq("user_type", "supervisor");
      const pm = new Map((profs ?? []).map((p: any) => [p.user_id, p]));

      let bestSup: any = null;
      let bestScore = 0;
      let bestName = "";

      for (const sup of sups ?? []) {
        const prof = pm.get(sup.user_id);
        if (!prof) continue;
        const areas = [...((sup.research_areas as string[]) ?? []), ...((prof.research_areas as string[]) ?? [])];
        const maxP = Number(sup.max_projects ?? prof.max_projects ?? 5) || 5;
        const curP = Number(sup.current_projects ?? prof.current_projects ?? 0) || 0;
        if (curP >= maxP) continue;
        for (const area of areas) {
          const s = categoryMatchScore(category, area);
          if (s > bestScore) {
            bestScore = s;
            bestSup = sup;
            bestName = prof.full_name || prof.email || "Supervisor";
          }
        }
      }

      if (!bestSup) return fail("No matching supervisor available for this group.");

      await admin.from("group_allocations").delete().eq("group_id", groupId).eq("status", "pending");
      await admin.from("group_allocations").insert({
        group_id: groupId,
        supervisor_id: bestSup.user_id,
        match_score: bestScore,
        match_reason: `Matched on "${category}"`,
        status: "pending",
      });

      await admin.from("notifications").insert({
        user_id: bestSup.user_id,
        title: "New Group Supervision Request",
        message: `Student group "${group.name}" matches your expertise.`,
        type: "allocation",
        link: "/allocation",
      });

      return ok({
        groupId,
        supervisorId: bestSup.user_id,
        supervisorName: bestName,
      });
    }

    /* ═══════════════════════════════════════════
       ACTION: accept_group_allocation / reject_group_allocation
       ═══════════════════════════════════════════ */
    if (action === "accept_group_allocation" || action === "reject_group_allocation") {
      if (role !== "supervisor" && role !== "admin") return fail("Unauthorized role");
      const allocationId = String(body.allocationId ?? "");
      const status = action === "accept_group_allocation" ? "accepted" : "rejected";

      const { data: alloc } = await admin.from("group_allocations")
        .select("id, group_id, supervisor_id").eq("id", allocationId).single();
      if (!alloc) return fail("Allocation not found");

      await admin.from("group_allocations").update({ status }).eq("id", allocationId);

      const { data: group } = await admin.from("student_groups")
        .select("name, created_by").eq("id", alloc.group_id).single();

      if (group?.created_by) {
        await admin.from("notifications").insert({
          user_id: group.created_by,
          title: status === "accepted" ? "Group Accepted" : "Group Declined",
          message: `Your group "${group.name}" has been ${status} by a supervisor.`,
          type: "allocation",
          link: "/student-groups",
        });
      }

      return ok({ allocationId, status });
    }

    /* ═══════════════════════════════════════════
       ACTION: reassign
       ═══════════════════════════════════════════ */
    if (action === "reassign") {
      if (role !== "admin") return fail("Unauthorized role");
      const projectId = String(body.projectId ?? "");
      const newSupId = String(body.newSupervisorId ?? "");
      if (!projectId || !newSupId) return fail("projectId and newSupervisorId required");

      const { data: project } = await admin.from("projects").select("*").eq("id", projectId).single();
      if (!project) return fail("Project not found");

      const { data: supProfile } = await admin.from("profiles").select("full_name, email").eq("user_id", newSupId).single();

      await admin.from("projects").update({ supervisor_id: newSupId, status: "approved" }).eq("id", projectId);
      await admin.from("pending_allocations").delete().eq("project_id", projectId);

      const supName = supProfile?.full_name || supProfile?.email || "Supervisor";
      await admin.from("notifications").insert([
        { user_id: project.student_id, title: "Supervisor Changed", message: `Your project "${project.title}" is now assigned to ${supName}.`, type: "project", link: `/projects/${projectId}` },
        { user_id: newSupId, title: "Project Assigned", message: `You are now supervising "${project.title}".`, type: "allocation", link: `/projects/${projectId}` },
      ]);

      return ok({ projectId, supervisorId: newSupId });
    }

    /* ═══════════════════════════════════════════
       ACTION: unassign
       ═══════════════════════════════════════════ */
    if (action === "unassign") {
      if (role !== "admin") return fail("Unauthorized role");
      const projectId = String(body.projectId ?? "");
      await admin.from("projects").update({ supervisor_id: null, status: "pending" }).eq("id", projectId);
      await admin.from("pending_allocations").delete().eq("project_id", projectId);
      return ok({ projectId });
    }

    return fail(`Unknown action: ${action}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[smart-allocation] FATAL:", msg);
    return fail(msg);
  }
});
