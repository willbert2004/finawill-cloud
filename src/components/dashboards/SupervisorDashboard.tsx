import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban, ClipboardList, Shield, Sparkles, Archive,
  ArrowRight, UserCheck, Eye, AlertTriangle, Loader2,
  Users, CheckCircle, Clock, TrendingUp,
} from "lucide-react";
import { MeetingScheduler } from "@/components/MeetingScheduler";
import { SupervisorAllocatedGroups } from "@/components/SupervisorAllocatedGroups";

interface SupervisorDashboardProps {
  user: any;
  projectStats: { total: number; approved: number; pending: number; finalized: number; duplicates: number };
  recentProjects: any[];
  groupCount: number;
  loadingData: boolean;
  greeting: string;
}

export function SupervisorDashboard({ user, projectStats, recentProjects, groupCount, loadingData, greeting }: SupervisorDashboardProps) {
  const navigate = useNavigate();

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success/10 text-success border-success/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const actions = [
    { label: "Assigned Projects", icon: FolderKanban, href: "/projects", color: "bg-primary text-primary-foreground" },
    { label: "Orchestration", icon: ClipboardList, href: "/project-management", color: "bg-secondary text-secondary-foreground" },
    { label: "Duplicates", icon: Shield, href: "/duplicate-detection", color: "bg-destructive text-destructive-foreground" },
    { label: "Allocation", icon: Sparkles, href: "/allocation", color: "bg-accent-gold text-accent-gold-foreground" },
    { label: "Repository", icon: Archive, href: "/repository", color: "bg-success text-success-foreground" },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Welcome Banner - Supervisor: Royal Blue theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-dark via-primary to-primary-light p-6 text-primary-foreground shadow-elegant">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-light/20 rounded-full -translate-y-12 translate-x-12 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-36 h-36 bg-secondary/10 rounded-full translate-y-10 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-6 w-6" />
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">Supervisor Panel</Badge>
            </div>
            <h1 className="text-2xl font-bold">{greeting}, {user.email?.split("@")[0]} 👋</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">Oversee projects and guide your students</p>
          </div>
          <div className="hidden sm:flex gap-4">
            <div className="text-center">
              <span className="text-3xl font-black">{projectStats.total}</span>
              <p className="text-[10px] text-primary-foreground/60">Projects</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-black">{groupCount}</span>
              <p className="text-[10px] text-primary-foreground/60">Groups</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Approved", value: projectStats.approved, icon: CheckCircle, border: "border-success/30", text: "text-success", bg: "bg-success/10" },
          { label: "Pending Review", value: projectStats.pending, icon: Clock, border: "border-warning/30", text: "text-warning", bg: "bg-warning/10" },
          { label: "Finalized", value: projectStats.finalized, icon: TrendingUp, border: "border-primary/30", text: "text-primary", bg: "bg-primary/10" },
          { label: "Duplicates", value: projectStats.duplicates, icon: AlertTriangle, border: "border-destructive/30", text: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <Card key={i} className={`${s.border} shadow-card hover-lift`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.text}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{loadingData ? "—" : s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Layout: Left (Actions + Projects) | Right (Groups + Meetings) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT */}
        <div className="lg:col-span-3 space-y-4">
          {/* Quick Actions */}
          <Card className="border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Supervisor Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(action.href)}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 bg-card hover:bg-primary/5 hover:shadow-card transition-all duration-300 cursor-pointer"
                  >
                    <div className={`p-2 rounded-lg ${action.color} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Assigned Projects</CardTitle>
                <CardDescription className="text-xs">Projects under your supervision</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/projects")} className="hover:bg-primary hover:text-primary-foreground transition-colors">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No assigned projects yet</p>
              ) : (
                <div className="space-y-2">
                  {recentProjects.slice(0, 10).map((project) => (
                    <div
                      key={project.id}
                      className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-md bg-gradient-to-br from-primary to-primary-light shadow-sm">
                          <FolderKanban className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.title}</span>
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

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-4">
          <SupervisorAllocatedGroups />
          <MeetingScheduler />
        </div>
      </div>
    </div>
  );
}
