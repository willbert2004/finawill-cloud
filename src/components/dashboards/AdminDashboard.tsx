import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban, Shield, Sparkles, Archive, BarChart3,
  ArrowRight, Briefcase, CheckCircle, Clock, Users,
  AlertTriangle, TrendingUp, Loader2,
} from "lucide-react";

interface AdminDashboardProps {
  user: any;
  projectStats: { total: number; approved: number; pending: number; finalized: number; duplicates: number };
  recentProjects: any[];
  groupCount: number;
  loadingData: boolean;
  greeting: string;
}

export function AdminDashboard({ user, projectStats, recentProjects, groupCount, loadingData, greeting }: AdminDashboardProps) {
  const navigate = useNavigate();

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success/10 text-success border-success/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const navCards = [
    { label: "Admin Dashboard", desc: "System overview & metrics", icon: BarChart3, href: "/admin", gradient: "from-primary to-primary-light", iconColor: "text-primary-foreground" },
    { label: "All Projects", desc: "Manage submissions", icon: FolderKanban, href: "/projects", gradient: "from-secondary to-secondary-light", iconColor: "text-secondary-foreground" },
    { label: "Orchestration", desc: "Workflow management", icon: Shield, href: "/project-management", gradient: "from-accent-gold to-warning", iconColor: "text-accent-gold-foreground" },
    { label: "Duplicate Detection", desc: "Identify duplicates", icon: AlertTriangle, href: "/duplicate-detection", gradient: "from-destructive to-destructive/70", iconColor: "text-destructive-foreground" },
    { label: "Smart Allocation", desc: "Auto-assign supervisors", icon: Sparkles, href: "/allocation", gradient: "from-success to-success/70", iconColor: "text-success-foreground" },
    { label: "Analytics", desc: "Data & insights", icon: TrendingUp, href: "/analytics", gradient: "from-primary-dark to-primary", iconColor: "text-primary-foreground" },
    { label: "Repository", desc: "All project files", icon: Archive, href: "/repository", gradient: "from-secondary-dark to-secondary", iconColor: "text-secondary-foreground" },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Welcome Banner - Admin: Deep blue/indigo theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-dark via-primary to-secondary-dark p-6 text-primary-foreground shadow-elegant">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-6 w-6" />
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">Administrator</Badge>
          </div>
          <h1 className="text-2xl font-bold">{greeting}, {user.email?.split("@")[0]} 👋</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">Manage the entire CIIOS platform</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: projectStats.total, icon: FolderKanban, color: "text-primary", bg: "bg-primary/10" },
          { label: "Approved", value: projectStats.approved, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
          { label: "Pending", value: projectStats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Groups", value: groupCount, icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "Duplicates", value: projectStats.duplicates, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <Card key={i} className="shadow-card hover-lift">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{loadingData ? "—" : s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Layout: Top (nav cards) | Bottom (left: projects, right: shortcuts) */}
      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {navCards.map((card, i) => (
          <Card
            key={i}
            className="interactive-card group overflow-hidden cursor-pointer"
            onClick={() => navigate(card.href)}
          >
            <CardContent className="p-4 flex flex-col gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} shadow-md w-fit group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{card.label}</p>
                <p className="text-[11px] text-muted-foreground">{card.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System-wide chapter progress */}
      <ChapterProgressCard
        title="System Chapter Activity"
        description="All projects across departments"
      />

      {/* Recent Projects - Full Width Bottom */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Recent Submissions</CardTitle>
            <CardDescription className="text-xs">Latest projects across all departments</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/projects")} className="hover:bg-primary hover:text-primary-foreground transition-colors">
            All Projects <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recentProjects.slice(0, 12).map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate("/projects")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-gradient-to-br from-primary to-secondary shadow-sm">
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
  );
}
