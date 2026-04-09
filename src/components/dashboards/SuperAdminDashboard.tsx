import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban, BarChart3, UserCog, ArrowRight,
  Crown, CheckCircle, Clock, Users, AlertTriangle,
  TrendingUp, Loader2, ShieldCheck, Settings, Database,
} from "lucide-react";

interface SuperAdminDashboardProps {
  user: any;
  projectStats: { total: number; approved: number; pending: number; finalized: number; duplicates: number };
  recentProjects: any[];
  groupCount: number;
  loadingData: boolean;
  greeting: string;
}

export function SuperAdminDashboard({ user, projectStats, recentProjects, groupCount, loadingData, greeting }: SuperAdminDashboardProps) {
  const navigate = useNavigate();

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success/10 text-success border-success/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const commandCenter = [
    { label: "System Dashboard", icon: BarChart3, href: "/admin", desc: "Full system overview", gradient: "from-super-admin to-super-admin-light" },
    { label: "User Management", icon: UserCog, href: "/user-management", desc: "Manage all users & roles", gradient: "from-primary to-primary-light" },
    { label: "Create Admin", icon: ShieldCheck, href: "/user-management?tab=create-admin", desc: "Add new administrators", gradient: "from-secondary to-secondary-light" },
    { label: "All Projects", icon: FolderKanban, href: "/projects", desc: "Every project in the system", gradient: "from-success to-success/70" },
    { label: "Analytics", icon: TrendingUp, href: "/analytics", desc: "Platform-wide insights", gradient: "from-primary-dark to-primary" },
    { label: "Documentation", icon: Database, href: "/documentation", desc: "System docs & schema", gradient: "from-accent-gold to-warning" },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Welcome Banner - Super Admin: Gold/Crown theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-super-admin-dark via-super-admin to-super-admin-light p-6 text-super-admin-foreground shadow-elegant">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="absolute top-0 right-0 w-56 h-56 bg-super-admin-light/30 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full translate-y-10 -translate-x-10 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-7 w-7" />
              <Badge className="bg-super-admin-foreground/20 text-super-admin-foreground border-0 text-xs font-semibold tracking-wide">SUPER ADMINISTRATOR</Badge>
            </div>
            <h1 className="text-2xl font-bold">{greeting}, {user.email?.split("@")[0]} 👑</h1>
            <p className="text-super-admin-foreground/70 text-sm mt-1">Full system control — CIIOS Command Center</p>
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-2xl font-black">{projectStats.total}</span>
              <p className="text-[10px] text-super-admin-foreground/60">Projects</p>
            </div>
            <div>
              <span className="text-2xl font-black">{groupCount}</span>
              <p className="text-[10px] text-super-admin-foreground/60">Groups</p>
            </div>
            <div>
              <span className="text-2xl font-black">{projectStats.duplicates}</span>
              <p className="text-[10px] text-super-admin-foreground/60">Duplicates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats with gold accents */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Projects", value: projectStats.total, icon: FolderKanban, ring: "ring-super-admin/30", accent: "text-super-admin" },
          { label: "Approved", value: projectStats.approved, icon: CheckCircle, ring: "ring-success/30", accent: "text-success" },
          { label: "Pending", value: projectStats.pending, icon: Clock, ring: "ring-warning/30", accent: "text-warning" },
          { label: "Finalized", value: projectStats.finalized, icon: TrendingUp, ring: "ring-primary/30", accent: "text-primary" },
          { label: "Groups", value: groupCount, icon: Users, ring: "ring-secondary/30", accent: "text-secondary" },
        ].map((s, i) => (
          <Card key={i} className={`shadow-card hover-lift ring-1 ${s.ring}`}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <s.icon className={`h-5 w-5 ${s.accent}`} />
              <div>
                <p className="text-xl font-bold leading-none">{loadingData ? "—" : s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Layout: Left (Command Center) | Right (Recent) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Command Center */}
        <Card className="border-super-admin/20">
          <div className="h-1 bg-gradient-to-r from-super-admin-dark via-super-admin to-super-admin-light" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-super-admin animate-rotate-slow" />
              Command Center
            </CardTitle>
            <CardDescription className="text-xs">Full system access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {commandCenter.map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.href)}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-border hover:border-super-admin/30 bg-card hover:bg-super-admin/5 hover:shadow-card transition-all duration-300 cursor-pointer text-left"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${item.gradient} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300 shrink-0`}>
                    <item.icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold group-hover:text-super-admin transition-colors">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">System-wide Projects</CardTitle>
              <CardDescription className="text-xs">All recent submissions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/projects")} className="hover:bg-super-admin hover:text-super-admin-foreground transition-colors">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {recentProjects.slice(0, 15).map((project) => (
                  <div
                    key={project.id}
                    className="group flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-super-admin/5 hover:border-super-admin/20 transition-all duration-200 cursor-pointer"
                    onClick={() => navigate("/projects")}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded-md bg-gradient-to-br from-super-admin to-super-admin-light shadow-sm">
                        <FolderKanban className="h-3.5 w-3.5 text-super-admin-foreground" />
                      </div>
                      <span className="text-sm font-medium truncate group-hover:text-super-admin transition-colors">{project.title}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor(project.is_duplicate ? 'duplicate' : project.status)}`}>
                      {project.is_duplicate ? 'Duplicate' : project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
