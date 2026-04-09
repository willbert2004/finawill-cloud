import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProjectDocuments } from '@/components/ProjectDocuments';
import { ProjectTimeline } from '@/components/ProjectTimeline';
import { SupervisorFeedback } from '@/components/SupervisorFeedback';
import { PhaseTemplateManager } from '@/components/PhaseTemplateManager';
import { FileText, Calendar, MessageSquare, FolderOpen, Layers } from 'lucide-react';

const ProjectManagement = () => {
  const { user } = useAuth();
  const { isSupervisor, isAdmin } = useUserRole();
  const [searchParams] = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Fetch projects based on user role
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['user-projects', user?.id, isSupervisor, isAdmin],
    queryFn: async () => {
      let query = supabase.from('projects').select('id, title, status, department');

      if (isAdmin) {
        // Admins see all projects
      } else if (isSupervisor) {
        query = query.eq('supervisor_id', user?.id);
      } else {
        query = query.eq('student_id', user?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Auto-select project from URL param or first project
  useEffect(() => {
    if (!projects?.length) return;
    const urlProjectId = searchParams.get('project');
    if (urlProjectId && projects.some(p => p.id === urlProjectId)) {
      setSelectedProjectId(urlProjectId);
    } else if (!selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, searchParams]);

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/15 text-success border-success/30';
      case 'pending': return 'bg-warning/15 text-warning border-warning/30';
      case 'rejected': return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'in_progress': return 'bg-primary/15 text-primary border-primary/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Project Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage documents, track progress, and view feedback
          </p>
        </div>

        {projectsLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
        ) : !projects?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No Projects Found</h3>
              <p className="text-muted-foreground mt-1">
                {isSupervisor
                  ? 'You have no assigned projects yet.'
                  : 'Create a project to get started with project management.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Project Selector */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Select Project</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span>{project.title}</span>
                          <Badge className={getStatusColor(project.status)} variant="outline">
                            {project.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject && (
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Department: {selectedProject.department || 'Not specified'}</span>
                    <Badge className={getStatusColor(selectedProject.status)}>
                      {selectedProject.status}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Management Tabs */}
            {selectedProjectId && (
              <>
                {/* Admin Template Manager */}
                {isAdmin && !isSupervisor && (
                  <div className="mb-6">
                    <PhaseTemplateManager />
                  </div>
                )}

                <Tabs defaultValue={isAdmin && !isSupervisor ? "timeline" : "documents"} className="space-y-6">
                  <TabsList className={`grid w-full ${isAdmin && !isSupervisor ? 'grid-cols-1 lg:w-auto lg:inline-grid' : 'grid-cols-3 lg:w-auto lg:inline-grid'}`}>
                    {!(isAdmin && !isSupervisor) && (
                      <TabsTrigger value="documents" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Documents</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="timeline" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Timeline</span>
                    </TabsTrigger>
                    {!(isAdmin && !isSupervisor) && (
                      <TabsTrigger value="feedback" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Feedback</span>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {!(isAdmin && !isSupervisor) && (
                    <TabsContent value="documents">
                      <ProjectDocuments projectId={selectedProjectId} />
                    </TabsContent>
                  )}

                  <TabsContent value="timeline">
                    <ProjectTimeline
                      projectId={selectedProjectId}
                      canEdit={isAdmin || isSupervisor}
                    />
                  </TabsContent>

                  {!(isAdmin && !isSupervisor) && (
                    <TabsContent value="feedback">
                      <SupervisorFeedback projectId={selectedProjectId} />
                    </TabsContent>
                  )}
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default ProjectManagement;
