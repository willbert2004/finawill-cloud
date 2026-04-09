import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Layers, Plus, Trash2, Rocket, Edit2, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface PhaseTemplate {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  default_duration_days: number;
  created_by: string;
}

export const PhaseTemplateManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PhaseTemplate | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', default_duration_days: 14 });
  const [applyTarget, setApplyTarget] = useState<'all' | 'department' | 'selected'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [applyLoading, setApplyLoading] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['phase-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_templates')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as PhaseTemplate[];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['all-projects-for-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, department, status')
        .in('status', ['approved', 'in_progress', 'pending'])
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  const departments = [...new Set(projects?.map(p => p.department).filter(Boolean) || [])];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        const { error } = await supabase.from('phase_templates').update({
          name: formData.name,
          description: formData.description || null,
          default_duration_days: formData.default_duration_days,
        }).eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('phase_templates').insert({
          name: formData.name,
          description: formData.description || null,
          default_duration_days: formData.default_duration_days,
          order_index: (templates?.length || 0) + 1,
          created_by: user?.id!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-templates'] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingTemplate ? 'Template updated' : 'Template added' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('phase_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-templates'] });
      toast({ title: 'Template deleted' });
    },
  });

  const handleApplyTemplates = async () => {
    if (!templates?.length) return;
    setApplyLoading(true);

    try {
      let targetProjects = projects || [];

      if (applyTarget === 'department') {
        targetProjects = targetProjects.filter(p => p.department === selectedDepartment);
      } else if (applyTarget === 'selected') {
        targetProjects = targetProjects.filter(p => selectedProjectIds.includes(p.id));
      }

      if (!targetProjects.length) {
        toast({ title: 'No projects selected', variant: 'destructive' });
        setApplyLoading(false);
        return;
      }

      let phasesCreated = 0;
      const today = new Date();

      for (const project of targetProjects) {
        // Check if project already has phases
        const { data: existingPhases } = await supabase
          .from('project_phases')
          .select('id')
          .eq('project_id', project.id)
          .limit(1);

        if (existingPhases && existingPhases.length > 0) continue; // Skip projects with existing phases

        let currentDate = new Date(today);

        for (const template of templates) {
          const startDate = new Date(currentDate);
          const endDate = new Date(currentDate);
          endDate.setDate(endDate.getDate() + template.default_duration_days);

          await supabase.from('project_phases').insert({
            project_id: project.id,
            name: template.name,
            description: template.description,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'pending',
            progress: 0,
            order_index: template.order_index,
          });

          currentDate = new Date(endDate);
          currentDate.setDate(currentDate.getDate() + 1);
          phasesCreated++;
        }
      }

      toast({
        title: 'Templates Applied',
        description: `Created ${phasesCreated} phases across ${targetProjects.length} project(s). Projects with existing phases were skipped.`,
      });
      setApplyDialogOpen(false);
      setSelectedProjectIds([]);
      queryClient.invalidateQueries({ queryKey: ['project-phases'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setApplyLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', default_duration_days: 14 });
    setEditingTemplate(null);
  };

  const openEdit = (t: PhaseTemplate) => {
    setEditingTemplate(t);
    setFormData({ name: t.name, description: t.description || '', default_duration_days: t.default_duration_days });
    setDialogOpen(true);
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Phase Templates
        </CardTitle>
        <div className="flex gap-2">
          <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" disabled={!templates?.length}>
                <Rocket className="h-4 w-4 mr-1" />
                Apply to Projects
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Apply Templates to Projects</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Apply to</Label>
                  <Select value={applyTarget} onValueChange={(v) => setApplyTarget(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All active projects</SelectItem>
                      <SelectItem value="department">By department</SelectItem>
                      <SelectItem value="selected">Select specific projects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {applyTarget === 'department' && (
                  <div>
                    <Label>Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d: string) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {applyTarget === 'selected' && (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {projects?.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={selectedProjectIds.includes(p.id)}
                          onCheckedChange={() => toggleProjectSelection(p.id)}
                        />
                        <span className="flex-1 truncate">{p.title}</span>
                        <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                      </label>
                    ))}
                  </div>
                )}

                <div className="bg-accent/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <p><strong>Note:</strong> Projects that already have phases will be skipped. Phases will be scheduled sequentially starting from today.</p>
                </div>

                <Button onClick={handleApplyTemplates} disabled={applyLoading} className="w-full">
                  {applyLoading ? 'Applying...' : 'Apply Templates'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add Phase Template'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Phase Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Proposal Submission" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What should be done in this phase..." />
                </div>
                <div>
                  <Label>Default Duration (days)</Label>
                  <Input type="number" value={formData.default_duration_days} onChange={(e) => setFormData({ ...formData, default_duration_days: parseInt(e.target.value) || 14 })} min={1} />
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!formData.name} className="w-full">
                  {editingTemplate ? 'Update' : 'Add Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading...</div>
        ) : !templates?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No phase templates defined yet</p>
            <p className="text-sm mt-1">Create templates like "Proposal", "Implementation", "Defense" to apply to projects</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template, idx) => (
              <div key={template.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.description || 'No description'} · {template.default_duration_days} days
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(template)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(template.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
