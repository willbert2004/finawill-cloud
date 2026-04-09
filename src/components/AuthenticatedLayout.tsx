import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, GraduationCap, UserCog, Loader2, Crown, ArrowLeft, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/create-project": "Create Project",
  "/student-groups": "Student Groups",
  "/repository": "Repository",
  "/supervisor-profile": "Supervisor Profile",
  "/project-management": "Project Orchestration",
  "/duplicate-detection": "Duplicate Detection",
  "/allocation": "Smart Allocation",
  "/admin": "Admin Dashboard",
  "/user-management": "User Orchestration",
  "/analytics": "Analytics",
  "/my-profile": "My Profile",
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isSupervisor, isStudent, loading } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = routeTitles[location.pathname] || "Dashboard";
  const isDashboard = location.pathname === "/dashboard";

  const roleBadge = () => {
    if (loading) return <Loader2 className="h-3 w-3 animate-spin" />;
    if (isSuperAdmin) return (
      <Badge className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gradient-to-r from-super-admin to-super-admin-light text-super-admin-foreground border-0 shadow-md">
        <Crown className="h-3 w-3" /> Super Admin
      </Badge>
    );
    if (isAdmin) return (
      <Badge className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-primary text-primary-foreground border-0">
        <Shield className="h-3 w-3" /> Admin
      </Badge>
    );
    if (isSupervisor) return (
      <Badge className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground border-0">
        <UserCog className="h-3 w-3" /> Supervisor
      </Badge>
    );
    if (isStudent) return (
      <Badge variant="secondary" className="flex items-center gap-1 text-[10px] px-2 py-0.5">
        <GraduationCap className="h-3 w-3" /> Student
      </Badge>
    );
    return null;
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col relative bg-content">
          {/* Dark header bar that flows from sidebar */}
          <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-content-header sticky top-0 z-40 shadow-md">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-content-header-foreground/70 hover:text-content-header-foreground" />
              <div className="hidden sm:block h-5 w-px bg-content-header-foreground/15" />
              {isDashboard ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-content-header-foreground/60 hover:text-content-header-foreground hover:bg-content-header-foreground/10 active:scale-95 active:bg-content-header-foreground/15 transition-all duration-150"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline text-xs">Home</span>
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-content-header-foreground/60 hover:text-content-header-foreground hover:bg-content-header-foreground/10 active:scale-95 active:bg-content-header-foreground/15 transition-all duration-150"
                    onClick={() => navigate(-1)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">Back</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-content-header-foreground/60 hover:text-primary-light hover:bg-primary/10 active:scale-90 active:bg-primary/20 transition-all duration-150"
                    onClick={() => navigate("/dashboard")}
                    title="Go to Dashboard"
                  >
                    <Home className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <div className="hidden sm:block h-5 w-px bg-content-header-foreground/15" />
              <h2 className="hidden sm:block text-sm font-semibold text-content-header-foreground">{pageTitle}</h2>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              {roleBadge()}
              <span className="hidden md:block text-xs text-content-header-foreground/50">
                {greeting()}, <span className="font-medium text-content-header-foreground">{displayName}</span>
              </span>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
