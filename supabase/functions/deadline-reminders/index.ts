import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get phases with deadlines in the next 3 days that haven't been completed
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const todayStr = now.toISOString().split("T")[0];
    const futureStr = threeDaysFromNow.toISOString().split("T")[0];

    const { data: upcomingPhases, error: phasesError } = await supabase
      .from("project_phases")
      .select("id, name, end_date, project_id")
      .gte("end_date", todayStr)
      .lte("end_date", futureStr)
      .neq("status", "completed");

    if (phasesError) throw phasesError;

    if (!upcomingPhases || upcomingPhases.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming deadlines found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get project details for each phase
    const projectIds = [...new Set(upcomingPhases.map((p) => p.project_id))];

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, title, student_id, supervisor_id")
      .in("id", projectIds);

    if (projectsError) throw projectsError;

    const projectMap = new Map(projects?.map((p) => [p.id, p]) || []);

    let notificationsCreated = 0;

    for (const phase of upcomingPhases) {
      const project = projectMap.get(phase.project_id);
      if (!project) continue;

      const endDate = new Date(phase.end_date!);
      const daysLeft = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency = daysLeft <= 1 ? "🔴" : daysLeft <= 2 ? "🟡" : "🟢";
      const daysText =
        daysLeft === 0
          ? "today"
          : daysLeft === 1
          ? "tomorrow"
          : `in ${daysLeft} days`;

      // Check if we already sent a notification for this phase today
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", project.student_id)
        .eq("type", "deadline")
        .gte("created_at", todayStr)
        .like("message", `%${phase.id}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Notify student
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: project.student_id,
          title: `${urgency} Deadline Approaching`,
          message: `Phase "${phase.name}" for project "${project.title}" is due ${daysText}. [phase:${phase.id}]`,
          type: "deadline",
          link: "/project-management",
        });

      if (!notifError) notificationsCreated++;

      // Also notify supervisor if assigned
      if (project.supervisor_id) {
        const { data: existingSup } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", project.supervisor_id)
          .eq("type", "deadline")
          .gte("created_at", todayStr)
          .like("message", `%${phase.id}%`)
          .limit(1);

        if (!existingSup || existingSup.length === 0) {
          const { error: supNotifError } = await supabase
            .from("notifications")
            .insert({
              user_id: project.supervisor_id,
              title: `${urgency} Student Deadline Approaching`,
              message: `Phase "${phase.name}" for project "${project.title}" is due ${daysText}. [phase:${phase.id}]`,
              type: "deadline",
              link: "/project-management",
            });

          if (!supNotifError) notificationsCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${upcomingPhases.length} upcoming deadlines, created ${notificationsCreated} notifications`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
