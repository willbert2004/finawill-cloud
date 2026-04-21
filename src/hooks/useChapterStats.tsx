import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

export interface ChapterStats {
  total: number;
  draft: number;
  submitted: number;
  needs_revision: number;
  approved: number;
  rejected: number;
  /** % of chapters approved (progress) */
  progress: number;
}

const empty: ChapterStats = {
  total: 0, draft: 0, submitted: 0, needs_revision: 0, approved: 0, rejected: 0, progress: 0,
};

/**
 * Aggregates chapter statuses scoped to the current user's role:
 * - student: chapters of their own projects
 * - supervisor: chapters of projects assigned to them
 * - admin/super: all chapters
 */
export function useChapterStats() {
  const { user } = useAuth();
  const { isAdmin, isSupervisor } = useUserRole();
  const [stats, setStats] = useState<ChapterStats>(empty);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get the relevant project IDs for this user
      let projectIds: string[] | null = null;

      if (!isAdmin) {
        const filterCol = isSupervisor ? "supervisor_id" : "student_id";
        const { data: projs } = await supabase
          .from("projects")
          .select("id")
          .eq(filterCol, user.id);
        projectIds = (projs || []).map((p) => p.id);
        if (!projectIds.length) {
          setStats(empty);
          return;
        }
      }

      let query = supabase.from("project_chapters").select("status", { count: "exact" });
      if (projectIds) query = query.in("project_id", projectIds);

      const { data, error } = await query;
      if (error) throw error;

      const counts = { ...empty };
      (data || []).forEach((row: any) => {
        counts.total += 1;
        if (row.status in counts) (counts as any)[row.status] += 1;
      });
      counts.progress = counts.total > 0 ? Math.round((counts.approved / counts.total) * 100) : 0;
      setStats(counts);
    } catch (e) {
      console.error("Error fetching chapter stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Realtime: refresh on any chapter status change scoped to this user
    if (!user) return;
    const channel = supabase
      .channel("chapter-stats-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_chapters" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "chapter_feedback" }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, isSupervisor]);

  return { stats, loading, refetch: fetchStats };
}
