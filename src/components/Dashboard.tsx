import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, BookOpen, TrendingUp, Clock, CheckCircle, AlertCircle,
  FileText, Calendar, User, Settings, Bell, Upload, Eye, Edit3, UserPlus,
  ArrowRight, BarChart3, Shield, Sparkles, FolderKanban
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const navigate = useNavigate();

  const studentStats = { totalProjects: 45, pendingReview: 12, approved: 28, inProgress: 15 };
  const supervisorStats = { totalSupervised: 23, pendingApproval: 8, activeProjects: 15, completedThisYear: 42 };
  const adminStats = { totalProjects: 156, duplicatesFound: 7, activeSupervisors: 28, systemUptime: "99.9%" };

  const recentProjects = [
    { title: "AI-Powered Learning Management System", student: "John Doe", supervisor: "Dr. Smith", status: "In Progress", progress: 75, deadline: "2024-01-15" },
    { title: "Blockchain-Based Voting System", student: "Jane Wilson", supervisor: "Prof. Johnson", status: "Under Review", progress: 100, deadline: "2024-01-10" },
    { title: "IoT Home Automation System", student: "Mike Brown", supervisor: "Dr. Davis", status: "Approved", progress: 45, deadline: "2024-02-01" }
  ];

  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, string> = {
      "In Progress": "bg-primary/10 text-primary border-primary/20",
      "Under Review": "bg-warning/10 text-warning border-warning/20",
      "Approved": "bg-success/10 text-success border-success/20",
      "Rejected": "bg-destructive/10 text-destructive border-destructive/20"
    };
    return <Badge className={variants[status] || variants["In Progress"]}>{status}</Badge>;
  };

  return (
    <section id="dashboard" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="secondary" className="mx-auto">User Dashboards</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Tailored Interfaces for <span className="text-primary">Every User Role</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience CIIOS through different user perspectives - students, supervisors, and administrators
            each get customized dashboards designed for their specific needs.
          </p>
        </div>

        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="student" className="flex items-center gap-2"><User className="h-4 w-4" />Student Portal</TabsTrigger>
            <TabsTrigger value="supervisor" className="flex items-center gap-2"><Users className="h-4 w-4" />Supervisor Dashboard</TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2"><Settings className="h-4 w-4" />Admin Panel</TabsTrigger>
          </TabsList>

          {/* Student Dashboard */}
          <TabsContent value="student" className="space-y-6">
            {/* Quick Actions FIRST - prominent and visible */}
            <Card className="p-6 gradient-card shadow-card border-2 border-primary/10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start gap-3 h-14 text-base font-semibold gradient-primary text-primary-foreground shadow-elegant hover:scale-[1.02] transition-transform"
                  onClick={() => navigate('/create-project')}
                >
                  <Upload className="h-5 w-5" />
                  Submit New Project
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                  onClick={() => navigate('/student-groups')}
                >
                  <UserPlus className="h-5 w-5 text-secondary" />
                  Manage Groups
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                  onClick={() => navigate('/project-management')}
                >
                  <FileText className="h-5 w-5 text-warning" />
                  Upload Progress Report
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                  onClick={() => navigate('/project-management')}
                >
                  <Calendar className="h-5 w-5 text-success" />
                  View Schedule
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                  onClick={() => navigate('/projects')}
                >
                  <Bell className="h-5 w-5 text-primary" />
                  View Notifications
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
              </div>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "My Projects", value: studentStats.totalProjects, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
                { label: "Pending Review", value: studentStats.pendingReview, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
                { label: "Approved", value: studentStats.approved, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
                { label: "In Progress", value: studentStats.inProgress, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
              ].map((s, i) => (
                <Card key={i} className="p-5 gradient-card shadow-card hover-lift">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${s.bg}`}>
                      <s.icon className={`h-6 w-6 ${s.color}`} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Recent Projects */}
            <Card className="p-6 gradient-card shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Projects</h3>
                <Button variant="outline" size="sm" onClick={() => navigate('/projects')}><Eye className="h-4 w-4 mr-2" />View All</Button>
              </div>
              <div className="space-y-3">
                {recentProjects.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h4 className="font-medium text-sm text-foreground truncate">{project.title}</h4>
                      <p className="text-xs text-muted-foreground">Due: {project.deadline}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <StatusBadge status={project.status} />
                      <span className="text-xs font-medium text-foreground">{project.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Supervisor Dashboard */}
          <TabsContent value="supervisor" className="space-y-6">
            <Card className="p-6 gradient-card shadow-card border-2 border-secondary/10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                Supervisor Tools
              </h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start gap-3 h-14 text-base font-semibold bg-secondary text-secondary-foreground shadow-elegant hover:bg-secondary/90 hover:scale-[1.02] transition-transform"
                  onClick={() => navigate('/projects')}
                >
                  <Users className="h-5 w-5" />
                  Manage Students
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-secondary/5 hover:border-secondary/30 transition-all" onClick={() => navigate('/project-management')}>
                  <FileText className="h-5 w-5 text-primary" />
                  Review Submissions
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-secondary/5 hover:border-secondary/30 transition-all" onClick={() => navigate('/project-management')}>
                  <Calendar className="h-5 w-5 text-warning" />
                  Schedule Meetings
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-secondary/5 hover:border-secondary/30 transition-all" onClick={() => navigate('/analytics')}>
                  <TrendingUp className="h-5 w-5 text-success" />
                  Generate Reports
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Supervised Projects", value: supervisorStats.totalSupervised, icon: Users, color: "text-primary", bg: "bg-primary/10" },
                { label: "Pending Approval", value: supervisorStats.pendingApproval, icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
                { label: "Active Projects", value: supervisorStats.activeProjects, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
                { label: "Completed (2024)", value: supervisorStats.completedThisYear, icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
              ].map((s, i) => (
                <Card key={i} className="p-5 gradient-card shadow-card hover-lift">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground mb-1">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div>
                    <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`h-6 w-6 ${s.color}`} /></div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 gradient-card shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Projects Needing Review</h3>
                <Badge variant="secondary">{supervisorStats.pendingApproval} pending</Badge>
              </div>
              <div className="space-y-3">
                {recentProjects.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <h4 className="font-medium text-sm">{project.title}</h4>
                      <p className="text-xs text-muted-foreground">Student: {project.student}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm"><Edit3 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Admin Dashboard */}
          <TabsContent value="admin" className="space-y-6">
            <Card className="p-6 gradient-card shadow-card border-2 border-primary/10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Admin Tools
              </h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start gap-3 h-14 text-base font-semibold gradient-primary text-primary-foreground shadow-elegant hover:scale-[1.02] transition-transform"
                  onClick={() => navigate('/admin')}
                >
                  <BarChart3 className="h-5 w-5" />
                  System Settings & Analytics
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => navigate('/user-management')}>
                  <Users className="h-5 w-5 text-primary" />
                  User Management
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => navigate('/allocation')}>
                  <Sparkles className="h-5 w-5 text-secondary" />
                  Smart Allocation
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => navigate('/duplicate-detection')}>
                  <Shield className="h-5 w-5 text-destructive" />
                  Duplicate Detection
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium border-2 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => navigate('/repository')}>
                  <FolderKanban className="h-5 w-5 text-warning" />
                  Repository
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Projects", value: adminStats.totalProjects, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
                { label: "Duplicates Found", value: adminStats.duplicatesFound, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
                { label: "Active Supervisors", value: adminStats.activeSupervisors, icon: Users, color: "text-success", bg: "bg-success/10" },
                { label: "System Uptime", value: adminStats.systemUptime, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
              ].map((s, i) => (
                <Card key={i} className="p-5 gradient-card shadow-card hover-lift">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground mb-1">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div>
                    <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`h-6 w-6 ${s.color}`} /></div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 gradient-card shadow-card">
              <h3 className="text-lg font-semibold mb-4">System Overview</h3>
              <div className="space-y-3">
                {[
                  { label: "Database Status", value: "Healthy", badge: true },
                  { label: "API Response Time", value: "127ms" },
                  { label: "Active Users", value: "89 online" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">{item.label}</span>
                    {item.badge ? <Badge variant="secondary" className="bg-success/10 text-success border-success/20">{item.value}</Badge> : <span className="text-sm font-medium">{item.value}</span>}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
