import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Plus, Search, AlertTriangle, CheckCircle, Clock, User, MessageSquare, RefreshCw, Loader2, FolderKanban, ShieldCheck, Award, FileText, Calendar, Building, Eye, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string; title: string; description: string; objectives?: string;
  status: string; similarity_score: number; is_duplicate: boolean;
  keywords: string[]; created_at: string; updated_at?: string; student_id: string;
  supervisor_id?: string; rejection_reason?: string; department?: string;
  document_url?: string; year?: number;
}

interface Profile {
  id: string; user_id: string; email: string; user_type: string; full_name: string; department?: string;
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supervisorNames, setSupervisorNames] = useState<Record<string, string>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [studentDepartments, setStudentDepartments] = useState<Record<string, string>>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectProjectId, setRejectProjectId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      let projectsData: Project[] = [];
      if (profileData.user_type === 'student') {
        const { data, error: projErr } = await supabase.from('projects').select('*').eq('student_id', user.id).order('created_at', { ascending: false });
        if (projErr) throw projErr;
        projectsData = data || [];
      } else if (profileData.user_type === 'supervisor') {
        // Get projects directly assigned
        const { data: assigned } = await supabase.from('projects').select('*').eq('supervisor_id', user.id).order('created_at', { ascending: false });
        // Get projects with pending allocation to this supervisor
        const { data: pendingAllocs } = await supabase.from('pending_allocations').select('project_id').eq('supervisor_id', user.id).eq('status', 'pending');
        const pendingProjectIds = (pendingAllocs || []).map(a => a.project_id).filter(Boolean);
        let pendingProjects: Project[] = [];
        if (pendingProjectIds.length > 0) {
          const { data: pp } = await supabase.from('projects').select('*').in('id', pendingProjectIds);
          pendingProjects = pp || [];
        }
        // Merge and deduplicate
        const allProjects = [...(assigned || []), ...pendingProjects];
        const seen = new Set<string>();
        projectsData = allProjects.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
      } else {
        const { data, error: projErr } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (projErr) throw projErr;
        projectsData = data || [];
      }
      setProjects(projectsData || []);

      // Fetch all profiles for student and supervisor IDs
      const supervisorIds = [...new Set((projectsData || []).map(p => p.supervisor_id).filter(Boolean))];
      const studentIds = [...new Set((projectsData || []).map(p => p.student_id).filter(Boolean))];
      const allIds = [...new Set([...supervisorIds, ...studentIds])];
      
      if (allIds.length > 0) {
        const { data: allProfiles } = await supabase.from('profiles').select('user_id, full_name, email, department').in('user_id', allIds);
        const supNames: Record<string, string> = {};
        const stuNames: Record<string, string> = {};
        const stuDepts: Record<string, string> = {};
        allProfiles?.forEach(p => {
          if (supervisorIds.includes(p.user_id)) {
            supNames[p.user_id] = p.full_name || p.email || 'Unknown';
          }
          if (studentIds.includes(p.user_id)) {
            stuNames[p.user_id] = p.full_name || p.email || 'Unknown';
            stuDepts[p.user_id] = p.department || '';
          }
        });
        setSupervisorNames(supNames);
        setStudentNames(stuNames);
        setStudentDepartments(stuDepts);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleApproveProject = async (projectId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('smart-allocation', { body: { action: 'approve_project', projectId } });
      if (error) throw error;
      toast({ title: "Project Approved", description: "The student has been notified." });
      fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  const handleRejectWithFeedback = async () => {
    if (!rejectionReason.trim()) { toast({ title: "Feedback Required", variant: "destructive" }); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('smart-allocation', { body: { action: 'reject_project_with_feedback', projectId: rejectProjectId, rejectionReason } });
      if (error) throw error;
      toast({ title: "Feedback Sent" });
      setRejectDialogOpen(false); setRejectionReason(""); setRejectProjectId(""); fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  const handleResubmit = async (projectId: string) => {
    navigate(`/create-project?resubmit=${projectId}`);
  };

  const handleDeleteProject = async (projectId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      toast({ title: "Project Deleted", description: "The project has been permanently removed." });
      setSelectedProject(null);
      fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  const handleDeleteAllProjects = async () => {
    setDeletingAll(true);
    try {
      const { error } = await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      toast({ title: "All Projects Deleted", description: "All projects have been permanently removed." });
      fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setDeletingAll(false); }
  };

  const handleFinalizeProject = async (projectId: string) => {
    setActionLoading(true);
    try {
      const { data: phases, error: phasesError } = await supabase
        .from('project_phases').select('id, name, status').eq('project_id', projectId);
      if (phasesError) throw phasesError;
      if (!phases || phases.length === 0) {
        toast({ title: "Cannot Finalize", description: "No project phases have been set.", variant: "destructive" });
        setActionLoading(false); return;
      }
      const incompletePhases = phases.filter(p => p.status !== 'completed');
      if (incompletePhases.length > 0) {
        toast({ title: "Cannot Finalize", description: `Incomplete phases: ${incompletePhases.map(p => p.name).join(', ')}`, variant: "destructive" });
        setActionLoading(false); return;
      }
      if (!confirm('All phases are complete. Finalize this project?')) { setActionLoading(false); return; }
      const { error } = await supabase.from('projects').update({ status: 'finalized' }).eq('id', projectId);
      if (error) throw error;
      const project = projects.find(p => p.id === projectId);
      if (project) {
        await supabase.from('notifications').insert({
          user_id: project.student_id, title: '🎓 Project Finalized!',
          message: `Your project "${project.title}" has been finalized. Congratulations!`,
          type: 'finalized', link: '/projects',
        });
      }
      toast({ title: "Project Finalized" }); fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  const getStatusBadge = (status: string, isDuplicate: boolean) => {
    if (isDuplicate) return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Duplicate</Badge>;
    switch (status) {
      case 'pending': return <Badge className="flex items-center gap-1 bg-warning/10 text-warning border border-warning/30 text-[10px]"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved': return <Badge className="flex items-center gap-1 bg-success/10 text-success border border-success/30 text-[10px]"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'in_progress': return <Badge className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/30 text-[10px]"><Clock className="h-3 w-3" />In Progress</Badge>;
      case 'completed': return <Badge className="flex items-center gap-1 bg-secondary/10 text-secondary border border-secondary/30 text-[10px]"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case 'needs_revision': return <Badge className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/30 text-[10px]"><MessageSquare className="h-3 w-3" />Needs Revision</Badge>;
      case 'finalized': return <Badge className="flex items-center gap-1 bg-emerald-600/10 text-emerald-600 border border-emerald-600/30 text-[10px]"><Award className="h-3 w-3" />Finalized</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.keywords && p.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const pendingProjects = filteredProjects.filter(p => p.status === 'pending');
  const approvedProjects = filteredProjects.filter(p => p.status === 'approved');
  const activeProjects = filteredProjects.filter(p => ['in_progress'].includes(p.status));
  const rejectedProjects = filteredProjects.filter(p => p.status === 'rejected');
  const archivedProjects = filteredProjects.filter(p => p.status === 'archived');
  const duplicateProjects = filteredProjects.filter(p => p.is_duplicate);
  const revisionProjects = filteredProjects.filter(p => p.status === 'needs_revision');
  const completedProjects = filteredProjects.filter(p => p.status === 'completed');
  const finalizedProjects = filteredProjects.filter(p => p.status === 'finalized');
  const statusTotal = pendingProjects.length + approvedProjects.length + activeProjects.length + rejectedProjects.length + archivedProjects.length + revisionProjects.length + completedProjects.length + finalizedProjects.length;

  const isAdmin = profile?.user_type === 'admin';

  if (!user) {
    return <AuthenticatedLayout><div className="text-center py-12"><p>Please log in to view projects.</p></div></AuthenticatedLayout>;
  }

  // Helper to get department for a project
  const getProjectDepartment = (project: Project) => {
    return project.department || studentDepartments[project.student_id] || '';
  };

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card onClick={() => setSelectedProject(project)} className={`group hover-lift transition-all duration-300 cursor-pointer border-transparent shadow-card hover:shadow-hover ${project.status === 'needs_revision' ? 'border-l-4 border-l-destructive' : project.status === 'approved' ? 'border-l-4 border-l-success' : project.status === 'pending' ? 'border-l-4 border-l-warning' : project.status === 'finalized' ? 'border-l-4 border-l-emerald-600' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">{project.title}</CardTitle>
          {getStatusBadge(project.status, project.is_duplicate)}
        </div>
        <CardDescription className="line-clamp-2 text-xs">{project.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Student info */}
        <div className="bg-accent/50 rounded-lg p-2.5 flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Student:</span>
          <span className="font-medium">{studentNames[project.student_id] || 'Unknown'}</span>
        </div>

        {/* Supervisor info */}
        <div className="bg-accent/50 rounded-lg p-2.5 flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Supervisor:</span>
          <span className="font-medium">
            {project.supervisor_id && supervisorNames[project.supervisor_id]
              ? supervisorNames[project.supervisor_id]
              : 'Not assigned'}
          </span>
        </div>

        {/* Department */}
        {getProjectDepartment(project) && (
          <div className="bg-accent/50 rounded-lg p-2.5 flex items-center gap-2 text-sm">
            <Building className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Dept:</span>
            <span className="font-medium">{getProjectDepartment(project)}</span>
          </div>
        )}

        {project.objectives && (
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <CheckCircle className="h-3 w-3" /> Objectives
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{project.objectives}</p>
          </div>
        )}

        {project.status === 'needs_revision' && project.rejection_reason && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive mb-1">
              <MessageSquare className="h-3 w-3" /> Supervisor Feedback
            </div>
            <p className="text-xs text-muted-foreground">{project.rejection_reason}</p>
          </div>
        )}

        {project.keywords && project.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.keywords.slice(0, 4).map((kw, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
            ))}
            {project.keywords.length > 4 && <Badge variant="outline" className="text-[10px]">+{project.keywords.length - 4}</Badge>}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          {new Date(project.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>

        {profile?.user_type === 'student' && project.status === 'needs_revision' && (
          <Button onClick={(e) => { e.stopPropagation(); handleResubmit(project.id); }} disabled={actionLoading} size="sm" className="w-full">
            <RefreshCw className="h-3 w-3 mr-1.5" /> Resubmit
          </Button>
        )}

        {profile?.user_type === 'supervisor' && project.status === 'pending' && !project.supervisor_id && !project.is_duplicate && (
          <div className="flex gap-2">
            <Button onClick={(e) => { e.stopPropagation(); handleApproveProject(project.id); }} disabled={actionLoading} size="sm" className="flex-1">
              <CheckCircle className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); setRejectProjectId(project.id); setRejectDialogOpen(true); }} variant="outline" size="sm" className="flex-1">
              <MessageSquare className="h-3 w-3 mr-1" /> Revise
            </Button>
          </div>
        )}

        {profile?.user_type === 'supervisor' && project.supervisor_id === user?.id && ['approved', 'in_progress'].includes(project.status) && (
          <Button onClick={(e) => { e.stopPropagation(); handleFinalizeProject(project.id); }} disabled={actionLoading} size="sm" variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Award className="h-3 w-3 mr-1.5" /> Finalize Project
          </Button>
        )}

        {/* Admin delete per project */}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button onClick={(e) => e.stopPropagation()} variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3 w-3 mr-1.5" /> Delete Project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{project.title}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );

  const ProjectGrid = ({ items }: { items: Project[] }) => (
    items.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground text-sm">No projects in this category</div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map(p => <ProjectCard key={p.id} project={p} />)}</div>
    )
  );

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.user_type === 'supervisor' ? 'Projects for Review' : isAdmin ? 'All Projects' : 'My Projects'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-60" />
            </div>
            {profile?.user_type === 'student' && (
              <Button onClick={() => navigate('/create-project')}><Plus className="h-4 w-4 mr-1.5" /> New</Button>
            )}
            {/* Admin: Delete All button */}
            {isAdmin && projects.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deletingAll}>
                    {deletingAll ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete ALL projects permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {projects.length} projects from the system. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllProjects} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete All Projects
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No projects found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {profile?.user_type === 'student' ? "You haven't submitted any projects yet." : "No projects match your search."}
              </p>
              {profile?.user_type === 'student' && (
                <Button onClick={() => navigate('/create-project')}><Plus className="h-4 w-4 mr-1.5" /> Create Project</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="all">All ({filteredProjects.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingProjects.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedProjects.length})</TabsTrigger>
              {activeProjects.length > 0 && <TabsTrigger value="active">In Progress ({activeProjects.length})</TabsTrigger>}
              {revisionProjects.length > 0 && <TabsTrigger value="revision">Needs Revision ({revisionProjects.length})</TabsTrigger>}
              {completedProjects.length > 0 && <TabsTrigger value="completed">Completed ({completedProjects.length})</TabsTrigger>}
              <TabsTrigger value="finalized">Finalized ({finalizedProjects.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedProjects.length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({archivedProjects.length})</TabsTrigger>
              {duplicateProjects.length > 0 && <TabsTrigger value="duplicates">⚠ Duplicates ({duplicateProjects.length})</TabsTrigger>}
            </TabsList>
            <p className="text-xs text-muted-foreground mt-2">
              Breakdown: Pending ({pendingProjects.length}) + Approved ({approvedProjects.length})
              {activeProjects.length > 0 && ` + In Progress (${activeProjects.length})`}
              {revisionProjects.length > 0 && ` + Revision (${revisionProjects.length})`}
              {completedProjects.length > 0 && ` + Completed (${completedProjects.length})`}
              {` + Finalized (${finalizedProjects.length}) + Rejected (${rejectedProjects.length}) + Archived (${archivedProjects.length})`}
              {` = ${statusTotal}`}
              {duplicateProjects.length > 0 && ` · Duplicates (${duplicateProjects.length}) is a flag that overlaps with statuses above`}
            </p>
            <TabsContent value="all"><ProjectGrid items={filteredProjects} /></TabsContent>
            <TabsContent value="pending"><ProjectGrid items={pendingProjects} /></TabsContent>
            <TabsContent value="approved"><ProjectGrid items={approvedProjects} /></TabsContent>
            <TabsContent value="rejected"><ProjectGrid items={rejectedProjects} /></TabsContent>
            <TabsContent value="archived"><ProjectGrid items={archivedProjects} /></TabsContent>
            <TabsContent value="duplicates"><ProjectGrid items={duplicateProjects} /></TabsContent>
            <TabsContent value="active"><ProjectGrid items={activeProjects} /></TabsContent>
            <TabsContent value="revision"><ProjectGrid items={revisionProjects} /></TabsContent>
            <TabsContent value="completed"><ProjectGrid items={completedProjects} /></TabsContent>
            <TabsContent value="finalized"><ProjectGrid items={finalizedProjects} /></TabsContent>
          </Tabs>
        )}
      </div>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="text-xl">{selectedProject.title}</DialogTitle>
                  {getStatusBadge(selectedProject.status, selectedProject.is_duplicate)}
                </div>
                <DialogDescription className="text-xs">
                  Submitted on {new Date(selectedProject.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {selectedProject.updated_at && selectedProject.updated_at !== selectedProject.created_at && (
                    <> · Updated {new Date(selectedProject.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-3">
                {/* Meta info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-accent/40 rounded-lg p-3 flex items-center gap-2.5">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Student</p>
                      <p className="text-sm font-medium">{studentNames[selectedProject.student_id] || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="bg-accent/40 rounded-lg p-3 flex items-center gap-2.5">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Supervisor</p>
                      <p className="text-sm font-medium">
                        {selectedProject.supervisor_id && supervisorNames[selectedProject.supervisor_id]
                          ? supervisorNames[selectedProject.supervisor_id]
                          : 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-accent/40 rounded-lg p-3 flex items-center gap-2.5">
                    <Building className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Department</p>
                      <p className="text-sm font-medium">{getProjectDepartment(selectedProject) || 'Not specified'}</p>
                    </div>
                  </div>
                  {selectedProject.year && (
                    <div className="bg-accent/40 rounded-lg p-3 flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Year</p>
                        <p className="text-sm font-medium">{selectedProject.year}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> Description
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedProject.description}</p>
                </div>

                {/* Objectives */}
                {selectedProject.objectives && (
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-primary" /> Objectives
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedProject.objectives}</p>
                  </div>
                )}

                {/* Keywords */}
                {selectedProject.keywords && selectedProject.keywords.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProject.keywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document link */}
                {selectedProject.document_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <a href={selectedProject.document_url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80">
                      View Attached Document
                    </a>
                  </div>
                )}

                {/* Supervisor Feedback */}
                {selectedProject.rejection_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-destructive mb-1">
                      <MessageSquare className="h-3 w-3" /> Supervisor Feedback
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedProject.rejection_reason}</p>
                  </div>
                )}

                {/* Similarity */}
                {selectedProject.similarity_score > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Similarity Score: <span className="font-medium">{Math.min(100, Math.round(selectedProject.similarity_score))}%</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {['approved', 'in_progress', 'finalized'].includes(selectedProject.status) && (
                    <Button onClick={() => { setSelectedProject(null); navigate(`/project-management?project=${selectedProject.id}`); }} size="sm" variant="default">
                      <FileText className="h-3 w-3 mr-1.5" /> Open Workspace
                    </Button>
                  )}
                  {profile?.user_type === 'student' && selectedProject.status === 'needs_revision' && (
                    <Button onClick={() => { setSelectedProject(null); handleResubmit(selectedProject.id); }} size="sm">
                      <RefreshCw className="h-3 w-3 mr-1.5" /> Resubmit
                    </Button>
                  )}
                  {profile?.user_type === 'supervisor' && selectedProject.status === 'pending' && !selectedProject.supervisor_id && !selectedProject.is_duplicate && (
                    <>
                      <Button onClick={() => { setSelectedProject(null); handleApproveProject(selectedProject.id); }} size="sm">
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button onClick={() => { setSelectedProject(null); setRejectProjectId(selectedProject.id); setRejectDialogOpen(true); }} variant="outline" size="sm">
                        <MessageSquare className="h-3 w-3 mr-1" /> Request Revision
                      </Button>
                    </>
                  )}
                  {profile?.user_type === 'supervisor' && selectedProject.supervisor_id === user?.id && ['approved', 'in_progress'].includes(selectedProject.status) && (
                    <Button onClick={() => { setSelectedProject(null); handleFinalizeProject(selectedProject.id); }} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Award className="h-3 w-3 mr-1.5" /> Finalize Project
                    </Button>
                  )}
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-3 w-3 mr-1.5" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete "{selectedProject.title}".</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteProject(selectedProject.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelectedProject(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Project Revision</DialogTitle>
            <DialogDescription>Provide specific feedback so the student can improve and resubmit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Describe areas needing improvement..." rows={5} />
            <div className="flex gap-2">
              <Button onClick={handleRejectWithFeedback} disabled={actionLoading} className="flex-1">
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                Send Feedback
              </Button>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
