import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectStats } from "@/hooks/useProjectStats";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { SupervisorDashboard } from "@/components/dashboards/SupervisorDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";

const DashboardHub = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isSuperAdmin, isSupervisor, isStudent, loading: roleLoading } = useUserRole();
  const { stats: projectStats, loading: projectStatsLoading } = useProjectStats();
  const [groupCount, setGroupCount] = useState(0);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user || roleLoading) return;
    const fetchOverview = async () => {
      try {
        if (isSupervisor) {
          const [{ count: groups }, { data: assigned }, { data: pendingAllocations }] = await Promise.all([
            supabase.from("group_allocations").select("*", { count: "exact", head: true }).eq("supervisor_id", user.id).in("status", ["pending", "accepted"]),
            supabase.from("projects").select("id, title, status, is_duplicate, created_at, supervisor_id").eq("supervisor_id", user.id).order("created_at", { ascending: false }).limit(20),
            supabase.from("pending_allocations").select("project_id").eq("supervisor_id", user.id).eq("status", "pending"),
          ]);

          const pendingProjectIds = [...new Set((pendingAllocations || []).map((allocation) => allocation.project_id).filter(Boolean))];
          let pendingProjects: any[] = [];

          if (pendingProjectIds.length > 0) {
            const { data } = await supabase
              .from("projects")
              .select("id, title, status, is_duplicate, created_at, supervisor_id")
              .in("id", pendingProjectIds);
            pendingProjects = data || [];
          }

          const mergedProjects = [...(assigned || []), ...pendingProjects]
            .reduce<any[]>((acc, project) => {
              if (acc.some((existing) => existing.id === project.id)) return acc;
              acc.push(project);
              return acc;
            }, [])
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          setGroupCount(groups || 0);
          setRecentProjects(mergedProjects.slice(0, 20));
          return;
        }

        if (isStudent) {
          const [{ count: groups }, { data: recent }] = await Promise.all([
            supabase.from("student_groups").select("*", { count: "exact", head: true }).eq("created_by", user.id),
            supabase.from("projects").select("id, title, status, is_duplicate, created_at, supervisor_id").eq("student_id", user.id).order("created_at", { ascending: false }).limit(20),
          ]);

          setGroupCount(groups || 0);
          setRecentProjects(recent || []);
          return;
        }

        const [{ count: groups }, { data: recent }] = await Promise.all([
          supabase.from("student_groups").select("*", { count: "exact", head: true }),
          supabase.from("projects").select("id, title, status, is_duplicate, created_at, supervisor_id").order("created_at", { ascending: false }).limit(20),
        ]);

        setGroupCount(groups || 0);
        setRecentProjects(recent || []);
      } catch (e) { console.error(e); }
      finally { setLoadingData(false); }
    };
    fetchOverview();
  }, [user, roleLoading, isSupervisor, isStudent]);

  if (loading || roleLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const sharedProps = {
    user,
    projectStats,
    recentProjects,
    groupCount,
    loadingData,
    greeting: getGreeting(),
  };

  return (
    <AuthenticatedLayout>
      {isSuperAdmin ? (
        <SuperAdminDashboard {...sharedProps} />
      ) : isAdmin ? (
        <AdminDashboard {...sharedProps} />
      ) : isSupervisor ? (
        <SupervisorDashboard {...sharedProps} />
      ) : (
        <StudentDashboard {...sharedProps} />
      )}
    </AuthenticatedLayout>
  );
};

export default DashboardHub;
