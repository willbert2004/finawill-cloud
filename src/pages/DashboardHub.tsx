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
    if (!user) return;
    const fetchOverview = async () => {
      try {
        const [{ count: groups }, { data: recent }] = await Promise.all([
          supabase.from("student_groups").select("*", { count: "exact", head: true }),
          supabase.from("projects").select("id, title, status, is_duplicate, created_at").order("created_at", { ascending: false }).limit(20),
        ]);
        setGroupCount(groups || 0);
        setRecentProjects(recent || []);
      } catch (e) { console.error(e); }
      finally { setLoadingData(false); }
    };
    fetchOverview();
  }, [user]);

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
