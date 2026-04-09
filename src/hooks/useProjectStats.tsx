import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProjectStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  needs_revision: number;
  in_progress: number;
  completed: number;
  finalized: number;
  duplicates: number; // cross-cutting flag, overlaps with statuses
}

const emptyStats: ProjectStats = {
  total: 0, approved: 0, pending: 0, rejected: 0,
  needs_revision: 0, in_progress: 0, completed: 0, finalized: 0, duplicates: 0,
};

export function useProjectStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProjectStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) return;
    try {
      const [
        { count: total },
        { count: approved },
        { count: pending },
        { count: rejected },
        { count: needs_revision },
        { count: in_progress },
        { count: completed },
        { count: finalized },
        { count: duplicates },
      ] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "needs_revision"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "finalized"),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("is_duplicate", true),
      ]);

      const approvedVal = approved || 0;
      const pendingVal = pending || 0;
      const rejectedVal = rejected || 0;
      const needsRevisionVal = needs_revision || 0;
      const inProgressVal = in_progress || 0;
      const completedVal = completed || 0;
      const finalizedVal = finalized || 0;

      setStats({
        total: total || 0,
        approved: approvedVal,
        pending: pendingVal,
        rejected: rejectedVal,
        needs_revision: needsRevisionVal,
        in_progress: inProgressVal,
        completed: completedVal,
        finalized: finalizedVal,
        duplicates: duplicates || 0,
      });
    } catch (e) {
      console.error("Error fetching project stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  return { stats, loading, refetch: fetchStats };
}
