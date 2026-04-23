import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban, ClipboardList, Users, Archive, ArrowRight,
  BookOpen, GraduationCap, Target, TrendingUp, Loader2,
} from "lucide-react";
import { StudentSupervisorDetails } from "@/components/StudentSupervisorDetails";
import { UpcomingMeetings } from "@/components/UpcomingMeetings";
import { ChapterProgressCard } from "@/components/ChapterProgressCard";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface StudentDashboardProps {
  user: any;
  projectStats: { total: number; approved: number; pending: number; finalized: number; duplicates: number };
  recentProjects: any[];
  groupCount: number;
  loadingData: boolean;
  greeting: string;
}

export function StudentDashboard({ user, projectStats, recentProjects, groupCount, loadingData, greeting }: StudentDashboardProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading: notifLoading, markAsRead, markAllAsRead } = useNotifications();

  const quickLinks = [
    { label: "My Projects", icon: FolderKanban, href: "/projects", color: "bg-primary text-primary-foreground" },
    { label: "Create Project", icon: ClipboardList, href: "/create-project", color: "bg-secondary text-secondary-foreground" },
    { label: "My Groups", icon: Users, href: "/student-groups", color: "bg-success text-success-foreground" },
    { label: "Repository", icon: Archive, href: "/repository", color: "bg-accent-gold text-accent-gold-foreground" },
  ];

  const progressPercent = projectStats.total > 0 ? Math.round((projectStats.approved / projectStats.total) * 100) : 0;

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success/10 text-success border-success/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Welcome Banner - Student: Teal/Green theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary-dark via-secondary to-secondary-light p-6 text-secondary-foreground shadow-elegant">
        <div className="absolute top-0 right-0 w-40 h-40 bg-secondary-light/20 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full translate-y-8 -translate-x-8 blur-xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-6 w-6" />
              <Badge className="bg-secondary-foreground/20 text-secondary-foreground border-0 text-xs">Student Portal</Badge>
            </div>
            <h1 className="text-2xl font-bold">{greeting}, {user.email?.split("@")[0]} 👋</h1>
            <p className="text-secondary-foreground/80 text-sm mt-1">Track your projects and collaborate with your team</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 text-right">
            <span className="text-3xl font-black">{projectStats.total}</span>
            <span className="text-xs text-secondary-foreground/70">Total Projects</span>
          </div>
        </div>
      </div>

      {/* Main Layout: Left panel (progress + supervisor) | Right panel (quick actions + recent) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT PANEL */}
        <div className="lg:col-span-1 space-y-4">
          {/* Progress Card */}
          <Card className="border-secondary/20 shadow-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-secondary to-secondary-light" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-secondary" />
                My Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-semibold text-secondary">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-secondary [&>div]:to-secondary-light" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-secondary/10 p-3 text-center">
                  <p className="text-xl font-bold text-secondary">{projectStats.approved}</p>
                  <p className="text-[10px] text-muted-foreground">Approved</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-3 text-center">
                  <p className="text-xl font-bold text-warning">{projectStats.pending}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Groups:</span>
                <span className="text-sm font-bold">{loadingData ? "—" : groupCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Chapter progress across this student's projects */}
          <ChapterProgressCard
            title="My Chapter Progress"
            description="Submissions, revisions and approvals"
            compact
          />

          {/* Supervisor Info */}
          <StudentSupervisorDetails />
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Actions */}
          <Card className="border-secondary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickLinks.map((link, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(link.href)}
                    className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border hover:border-secondary/40 bg-card hover:bg-secondary/5 hover:shadow-card transition-all duration-300 cursor-pointer"
                  >
                    <div className={`p-2.5 rounded-xl ${link.color} shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                      <link.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{link.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <UpcomingMeetings />

          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">My Recent Projects</CardTitle>
                <CardDescription className="text-xs">Your latest submissions</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/projects")} className="hover:bg-secondary hover:text-secondary-foreground transition-colors">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : recentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No projects yet. Start by creating one!</p>
                  <Button size="sm" className="mt-3 bg-secondary hover:bg-secondary-dark" onClick={() => navigate("/create-project")}>
                    <ClipboardList className="h-3 w-3 mr-1" /> Create Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProjects.slice(0, 8).map((project) => (
                    <div
                      key={project.id}
                      className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-secondary/5 hover:border-secondary/20 transition-all duration-200 cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-md bg-gradient-to-br from-secondary to-secondary-light shadow-sm">
                          <FolderKanban className="h-3.5 w-3.5 text-secondary-foreground" />
                        </div>
                        <span className="text-sm font-medium truncate group-hover:text-secondary transition-colors">{project.title}</span>
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
    </div>
  );
}
