import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Search, Upload, Eye, Archive, FileText, Calendar, Loader2, AlertTriangle, CheckCircle2, ShieldAlert, Lightbulb, Users, ArchiveRestore, Trash2, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { exportToCSV } from "@/lib/csvExport";

interface Project {
  id: string; title: string; description: string; status: string;
  department: string | null; year: number | null; keywords: string[] | null;
  similarity_score: number; is_duplicate: boolean; created_at: string;
  student_id: string; supervisor_id: string | null; document_url: string | null;
  objectives: string | null;
}

interface ProjectDocument {
  id: string; file_name: string; file_path?: string; document_type: string; created_at: string;
}

interface Feedback {
  id: string; title: string; content: string; feedback_type: string; rating: number | null; created_at: string;
}

interface Profile { user_id: string; email: string; user_type: string; full_name: string | null; }

export default function Repository() {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [supervisorNames, setSupervisorNames] = useState<Record<string, string>>({});
  const [projectDocs, setProjectDocs] = useState<Record<string, ProjectDocument[]>>({});
  const [projectFeedback, setProjectFeedback] = useState<Record<string, Feedback[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportData, setBulkImportData] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  useEffect(() => { if (!user) { navigate('/auth'); return; } fetchData(); }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      if (profileError) throw profileError;
      setProfile(profileData);
      let query = supabase.from('projects').select('*');
      if (profileData.user_type === 'student') query = query.eq('student_id', user?.id);
      const { data: projectsData, error: projectsError } = await query.order('created_at', { ascending: false });
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch supervisor names for assigned projects
      const supervisorIds = [...new Set((projectsData || []).map(p => p.supervisor_id).filter(Boolean))] as string[];
      if (supervisorIds.length > 0) {
        const { data: supervisorProfiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', supervisorIds);
        const names: Record<string, string> = {};
        supervisorProfiles?.forEach(s => { names[s.user_id] = s.full_name || 'Unknown'; });
        setSupervisorNames(names);
      }

      // Fetch documents and feedback for finalized/approved projects
      const completedProjects = (projectsData || []).filter(p => ['finalized', 'approved'].includes(p.status));
      if (completedProjects.length > 0) {
        const projectIds = completedProjects.map(p => p.id);
        const [{ data: docs }, { data: feedback }] = await Promise.all([
          supabase.from('project_documents').select('id, file_name, file_path, document_type, created_at, project_id').in('project_id', projectIds),
          supabase.from('supervisor_feedback').select('id, title, content, feedback_type, rating, created_at, project_id').in('project_id', projectIds),
        ]);
        const docsMap: Record<string, ProjectDocument[]> = {};
        docs?.forEach(d => { if (!docsMap[(d as any).project_id]) docsMap[(d as any).project_id] = []; docsMap[(d as any).project_id].push(d); });
        setProjectDocs(docsMap);
        const fbMap: Record<string, Feedback[]> = {};
        feedback?.forEach(f => { if (!fbMap[(f as any).project_id]) fbMap[(f as any).project_id] = []; fbMap[(f as any).project_id].push(f); });
        setProjectFeedback(fbMap);
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load repository data", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleBulkImport = async () => {
    if (!user || !profile || !isSuperAdmin) return;
    try {
      const lines = bulkImportData.split('\n').filter(l => l.trim());
      if (lines.length === 0) { toast({ title: "Error", description: "Please enter at least one project", variant: "destructive" }); return; }
      const toImport = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('|').map(s => s.trim());
        const title = parts[0];
        const description = parts[1];
        if (!title || !description) {
          toast({ title: "Invalid Format", description: `Line ${i + 1}: Title and Description are required. Use format: Title | Description | Department | Status`, variant: "destructive" });
          return;
        }
        toImport.push({ title, description, department: parts[2] || null, status: parts[3] || 'finalized', student_id: user.id, year: new Date().getFullYear(), is_duplicate: false, similarity_score: 0 });
      }
      const { error } = await supabase.from('projects').insert(toImport);
      if (error) throw error;
      toast({ title: "Success", description: `Imported ${toImport.length} projects` });
      setShowBulkImport(false); setBulkImportData(""); fetchData();
    } catch (error: any) { toast({ title: "Import Failed", description: error.message, variant: "destructive" }); }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', projectId);
      if (error) throw error;
      toast({ title: "Project archived" }); fetchData();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleUnarchiveProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from('projects').update({ status: 'pending' }).eq('id', projectId);
      if (error) throw error;
      toast({ title: "Project unarchived", description: "Status set back to pending" }); fetchData();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmation = prompt('⚠️ DANGER ZONE: This will permanently delete this project and all associated data.\n\nType "DELETE" to confirm:');
    if (confirmation !== 'DELETE') {
      if (confirmation !== null) toast({ title: "Cancelled", description: "You must type DELETE to confirm.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      toast({ title: "Project deleted permanently" }); fetchData();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDownloadDoc = async (filePath: string, fileName: string, docId: string) => {
    try {
      setDownloadProgress(p => ({ ...p, [docId]: 0 }));
      const { data, error } = await supabase.storage.from('project-chapters').createSignedUrl(filePath, 60);
      if (error || !data?.signedUrl) throw error || new Error('Could not generate link');

      const response = await fetch(data.signedUrl);
      if (!response.ok || !response.body) throw new Error('Failed to fetch file');

      const total = Number(response.headers.get('content-length')) || 0;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          const pct = total ? Math.min(99, Math.round((received / total) * 100)) : Math.min(99, (received / (1024 * 1024)) * 5);
          setDownloadProgress(p => ({ ...p, [docId]: pct }));
        }
      }

      const blob = new Blob(chunks as BlobPart[]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadProgress(p => ({ ...p, [docId]: 100 }));
      setTimeout(() => setDownloadProgress(p => { const n = { ...p }; delete n[docId]; return n; }), 1500);
    } catch (e: any) {
      setDownloadProgress(p => { const n = { ...p }; delete n[docId]; return n; });
      toast({ title: 'Download failed', description: e?.message || 'Could not download file', variant: 'destructive' });
    }
  };

  const getTabProjects = (tab: string) => {
    let filtered = projects;
    if (tab === "duplicates") filtered = projects.filter(p => p.is_duplicate);
    else if (tab === "approved") filtered = projects.filter(p => p.status === 'approved');
    else if (tab === "pending") filtered = projects.filter(p => p.status === 'pending');
    else if (tab === "finalized") filtered = projects.filter(p => p.status === 'finalized');
    else if (tab === "final") filtered = projects.filter(p => (projectDocs[p.id] || []).some(d => d.document_type === 'final_zip'));
    else if (tab === "archived") filtered = projects.filter(p => p.status === 'archived');

    return filtered.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()) || (p.keywords || []).some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch && (departmentFilter === 'all' || p.department === departmentFilter) && (yearFilter === 'all' || p.year?.toString() === yearFilter);
    });
  };

  const departments = Array.from(new Set(projects.map(p => p.department).filter(Boolean))) as string[];
  const years = Array.from(new Set(projects.map(p => p.year).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0));
  const duplicateCount = projects.filter(p => p.is_duplicate).length;
  const approvedCount = projects.filter(p => p.status === 'approved').length;
  const pendingCount = projects.filter(p => p.status === 'pending').length;

  const getDuplicateImprovements = (project: Project) => {
    const suggestions: string[] = [];
    if (project.similarity_score > 0.8) suggestions.push("High similarity detected — consider significantly revising the project title and core objectives.");
    else if (project.similarity_score > 0.5) suggestions.push("Moderate similarity — refine the project scope and differentiate the methodology.");
    if (!project.keywords || project.keywords.length < 3) suggestions.push("Add more specific keywords to better define the project's unique contribution.");
    if (!project.objectives) suggestions.push("Include detailed objectives to clarify the project's unique value proposition.");
    if (project.description.length < 100) suggestions.push("Expand the project description with more technical detail and innovation aspects.");
    if (suggestions.length === 0) suggestions.push("Review the project against similar entries and adjust the focus area.");
    return suggestions;
  };

  if (!user) return <AuthenticatedLayout><div className="text-center py-12"><p>Please log in.</p></div></AuthenticatedLayout>;

  const renderProjectCard = (project: Project, showDuplicateAnalysis = false) => {
    const docs = projectDocs[project.id] || [];
    const feedback = projectFeedback[project.id] || [];
    const supervisorName = project.supervisor_id ? supervisorNames[project.supervisor_id] : null;
    const isCompleted = ['finalized', 'approved'].includes(project.status);

    return (
      <Card key={project.id} className="hover:shadow-md transition-all border-l-4" style={{
        borderLeftColor: project.is_duplicate ? 'hsl(var(--destructive))' : project.status === 'approved' ? 'hsl(var(--success, 142 76% 36%))' : project.status === 'finalized' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
      }}>
        <CardContent className="py-4 px-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-1 text-foreground">{project.title}</h3>
              {supervisorName && (
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Supervised by: <span className="font-medium text-foreground">{supervisorName}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant={project.status === 'approved' ? 'default' : project.status === 'finalized' ? 'secondary' : 'outline'}>{project.status}</Badge>
                {project.is_duplicate && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Duplicate ({Math.min(100, Math.round(project.similarity_score || 0))}% similar)
                  </Badge>
                )}
                {project.department && <Badge variant="outline" className="text-[10px]">{project.department}</Badge>}
                {project.year && <Badge variant="secondary" className="text-[10px]"><Calendar className="h-2.5 w-2.5 mr-0.5" />{project.year}</Badge>}
              </div>
              {project.keywords && project.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {project.keywords.slice(0, 5).map((k, i) => (
                    <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{k}</span>
                  ))}
                </div>
              )}

              {/* Post-finalization details */}
              {isCompleted && (docs.length > 0 || feedback.length > 0) && (
                <div className="mt-4 space-y-3">
                  {docs.length > 0 && (
                    <div className="p-3 bg-muted/50 border border-border rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        Final Documents & Prototype ({docs.length})
                      </div>
                      <div className="space-y-1.5">
                        {docs.map(doc => {
                          const isFinal = doc.document_type === 'final_zip';
                          return (
                            <div key={doc.id} className={`flex items-center justify-between gap-2 text-xs ${isFinal ? 'p-2 rounded-md bg-success/10 border border-success/30' : ''}`}>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileText className={`h-3.5 w-3.5 shrink-0 ${isFinal ? 'text-success' : 'text-muted-foreground'}`} />
                                <span className="truncate text-foreground">{doc.file_name}</span>
                                <Badge variant={isFinal ? 'default' : 'outline'} className="text-[9px] shrink-0">
                                  {isFinal ? 'Final ZIP' : doc.document_type}
                                </Badge>
                              </div>
                              {doc.file_path && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0" onClick={() => handleDownloadDoc(doc.file_path!, doc.file_name)}>
                                  <Download className="h-3 w-3 mr-1" /> Download
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {feedback.length > 0 && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        Supervisor Feedback ({feedback.length})
                      </div>
                      <div className="space-y-2">
                        {feedback.slice(0, 3).map(fb => (
                          <div key={fb.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{fb.title}</span>
                              {fb.rating && <Badge variant="secondary" className="text-[9px]">⭐ {fb.rating}/5</Badge>}
                            </div>
                            <p className="text-muted-foreground line-clamp-1 mt-0.5">{fb.content}</p>
                          </div>
                        ))}
                        {feedback.length > 3 && (
                          <p className="text-[10px] text-muted-foreground">+{feedback.length - 3} more feedback entries</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Duplicate Analysis Section */}
              {showDuplicateAnalysis && project.is_duplicate && (
                <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Duplicate Analysis</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Similarity Score</span>
                      <span className="font-medium">{Math.min(100, Math.round(project.similarity_score || 0))}%</span>
                    </div>
                    <Progress value={Math.min(100, project.similarity_score || 0)} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-warning" />
                      Improvement Suggestions
                    </div>
                    {getDuplicateImprovements(project).map((suggestion, i) => (
                      <p key={i} className="text-xs text-muted-foreground pl-5">• {suggestion}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm" onClick={() => setSelectedProject(project)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl">{selectedProject?.title}</DialogTitle>
                    <DialogDescription>
                      {selectedProject?.department} • {selectedProject?.year}
                      {selectedProject?.supervisor_id && supervisorNames[selectedProject.supervisor_id] && (
                        <> • Supervisor: {supervisorNames[selectedProject.supervisor_id]}</>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProject?.description}</p>
                    </div>
                    {selectedProject?.objectives && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Objectives</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProject.objectives}</p>
                      </div>
                    )}
                    {selectedProject?.keywords && selectedProject.keywords.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Keywords</h4>
                        <div className="flex flex-wrap gap-1">{selectedProject.keywords.map((k, i) => <Badge key={i} variant="outline" className="text-xs">{k}</Badge>)}</div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Badge variant={selectedProject?.status === 'approved' ? 'default' : 'secondary'}>{selectedProject?.status}</Badge>
                      {selectedProject?.is_duplicate && <Badge variant="destructive">Duplicate - {Math.min(100, Math.round(selectedProject.similarity_score || 0))}%</Badge>}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {isSuperAdmin && project.status !== 'archived' && (
                <Button variant="outline" size="sm" onClick={() => handleArchiveProject(project.id)} title="Archive"><Archive className="h-4 w-4" /></Button>
              )}
              {isSuperAdmin && project.status === 'archived' && (
                <Button variant="outline" size="sm" onClick={() => handleUnarchiveProject(project.id)} title="Unarchive"><ArchiveRestore className="h-4 w-4" /></Button>
              )}
              {isSuperAdmin && (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteProject(project.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Project Repository</h1>
            <p className="text-sm text-muted-foreground">Central repository for all capstone projects</p>
          </div>
          {isSuperAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportToCSV(projects.map(p => ({ Title: p.title, Description: p.description, Department: p.department || '', Status: p.status, Year: p.year || '', Keywords: (p.keywords || []).join('; '), Supervisor: p.supervisor_id ? (supervisorNames[p.supervisor_id] || '') : '', Similarity: p.similarity_score, Duplicate: p.is_duplicate ? 'Yes' : 'No' })), 'projects')} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
                <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" /> Bulk Import</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Bulk Import Projects</DialogTitle><DialogDescription>Format: Title | Description | Department | Status</DialogDescription></DialogHeader>
                  <Textarea value={bulkImportData} onChange={e => setBulkImportData(e.target.value)} placeholder="AI Chatbot|An intelligent chatbot|CS|finalized" rows={8} />
                  <div className="flex gap-2"><Button onClick={handleBulkImport} className="flex-1">Import</Button><Button variant="outline" onClick={() => setShowBulkImport(false)}>Cancel</Button></div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: projects.length, icon: FileText, gradient: 'from-primary to-primary-light' },
            { label: 'Approved', value: approvedCount, icon: CheckCircle2, gradient: 'from-success to-[hsl(160,80%,45%)]' },
            { label: 'Pending', value: pendingCount, icon: Calendar, gradient: 'from-[hsl(var(--accent-gold))] to-[hsl(40,90%,65%)]' },
            { label: 'Duplicates', value: duplicateCount, icon: AlertTriangle, gradient: 'from-destructive to-[hsl(0,80%,65%)]' },
            { label: 'Finalized', value: projects.filter(p => p.status === 'finalized').length, icon: Archive, gradient: 'from-secondary to-secondary-light' },
          ].map((s, i) => (
            <Card key={i} className="group hover-lift cursor-default overflow-hidden border-transparent shadow-card hover:shadow-hover transition-all duration-300">
              <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${s.gradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search projects..." className="pl-9" /></div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}><SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
              <Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger><SelectContent><SelectItem value="all">All Years</SelectItem>{years.map(y => <SelectItem key={y} value={y?.toString() || ''}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed View */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({projects.length})</TabsTrigger>
            <TabsTrigger value="approved" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Duplicates ({duplicateCount})
            </TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="finalized">Finalized</TabsTrigger>
            <TabsTrigger value="final" className="gap-1">
              <Archive className="h-3.5 w-3.5" /> Final Submissions ({Object.values(projectDocs).filter(ds => ds.some(d => d.document_type === 'final_zip')).length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1">
              <ArchiveRestore className="h-3.5 w-3.5" /> Archived ({projects.filter(p => p.status === 'archived').length})
            </TabsTrigger>
          </TabsList>

          {["all", "approved", "duplicates", "pending", "finalized", "final", "archived"].map(tab => (
            <TabsContent key={tab} value={tab}>
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : getTabProjects(tab).length === 0 ? (
                <Card><CardContent className="py-16 text-center"><FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" /><p className="text-muted-foreground">No {tab === 'all' ? '' : tab} projects found</p></CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {getTabProjects(tab).map(project => renderProjectCard(project, tab === 'duplicates'))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
