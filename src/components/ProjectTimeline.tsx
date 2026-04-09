import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Calendar, Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';

interface ProjectTimelineProps {
  projectId: string;
  canEdit?: boolean;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-primary/20 text-primary', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
};

export const ProjectTimeline = ({ projectId, canEdit = true }: ProjectTimelineProps) => {
  const { user } = useAuth();
  const { isStudent, isSupervisor, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    progress: 0,
  });

  const { data: phases, isLoading } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingPhase) {
        const { error } = await supabase
          .from('project_phases')
          .update({
            name: formData.name,
            description: formData.description,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            status: formData.status,
            progress: formData.progress,
          })
          .eq('id', editingPhase.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('project_phases').insert({
          project_id: projectId,
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: formData.status,
          progress: formData.progress,
          order_index: (phases?.length || 0) + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingPhase ? 'Phase updated' : 'Phase added' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_phases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast({ title: 'Phase deleted' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '', status: 'pending', progress: 0 });
    setEditingPhase(null);
  };

  const openEditDialog = (phase: any) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name,
      description: phase.description || '',
      start_date: phase.start_date || '',
      end_date: phase.end_date || '',
      status: phase.status,
      progress: phase.progress,
    });
    setDialogOpen(true);
  };

  const getPhaseWidth = (phase: any) => {
    if (!phase.start_date || !phase.end_date || !phases?.length) return 100;
    
    const allDates = phases
      .filter(p => p.start_date && p.end_date)
      .flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    
    if (allDates.length < 2) return 100;
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = differenceInDays(maxDate, minDate) || 1;
    
    const phaseDays = differenceInDays(new Date(phase.end_date), new Date(phase.start_date));
    return Math.max(15, (phaseDays / totalDays) * 100);
  };

  const getPhaseOffset = (phase: any) => {
    if (!phase.start_date || !phases?.length) return 0;
    
    const allDates = phases
      .filter(p => p.start_date && p.end_date)
      .flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    
    if (allDates.length < 2) return 0;
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = differenceInDays(maxDate, minDate) || 1;
    
    const offsetDays = differenceInDays(new Date(phase.start_date), minDate);
    return (offsetDays / totalDays) * 100;
  };

  const overallProgress = phases?.length
    ? Math.round(phases.reduce((sum, p) => sum + p.progress, 0) / phases.length)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Overall Progress: {overallProgress}%
          </p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Phase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPhase ? 'Edit Phase' : 'Add Phase'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Phase Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Research & Planning"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Progress ({formData.progress}%)</Label>
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                      className="mt-2"
                    />
                  </div>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!formData.name} className="w-full">
                  {editingPhase ? 'Update Phase' : 'Add Phase'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Progress value={overallProgress} className="mb-6" />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading timeline...</div>
        ) : !phases?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No project phases defined yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gantt-style timeline */}
            <div className="relative bg-accent/30 rounded-lg p-4 overflow-x-auto">
              <div className="min-w-[500px] space-y-3">
                {phases.map((phase) => {
                  const StatusIcon = statusConfig[phase.status as keyof typeof statusConfig]?.icon || Clock;
                  const isOverdue = phase.end_date && isBefore(new Date(phase.end_date), new Date()) && phase.status !== 'completed';

                  return (
                    <div key={phase.id} className="flex items-center gap-4">
                      <div className="w-32 flex-shrink-0">
                        <p className="font-medium text-sm truncate">{phase.name}</p>
                        <Badge className={statusConfig[phase.status as keyof typeof statusConfig]?.color || ''}>
                          {statusConfig[phase.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </div>
                      <div className="flex-1 relative h-8">
                        <div
                          className={`absolute h-full rounded-full flex items-center justify-end pr-2 text-xs font-medium ${
                            isOverdue ? 'bg-destructive/30' : phase.status === 'completed' ? 'bg-green-500/40' : 'bg-primary/40'
                          }`}
                          style={{
                            left: `${getPhaseOffset(phase)}%`,
                            width: `${getPhaseWidth(phase)}%`,
                          }}
                        >
                          {phase.progress}%
                        </div>
                      </div>
                      <div className="w-24 text-xs text-muted-foreground text-right">
                        {phase.end_date && format(new Date(phase.end_date), 'MMM d')}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(phase)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteMutation.mutate(phase.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase details list */}
            <div className="space-y-2 mt-4">
              {phases.map((phase) => (
                <div key={phase.id} className="p-3 border border-border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{phase.name}</h4>
                      {phase.description && (
                        <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {phase.start_date && phase.end_date && (
                        <p>
                          {format(new Date(phase.start_date), 'MMM d')} - {format(new Date(phase.end_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Progress value={phase.progress} className="mt-2 h-2" />
                  
                  {/* Student progress update controls */}
                  {isStudent && phase.status !== 'completed' && (
                    <div className="mt-3 flex items-center gap-3 bg-accent/30 rounded-lg p-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">Update progress:</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={phase.progress}
                        onChange={async (e) => {
                          const newProgress = parseInt(e.target.value);
                          const newStatus = newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'pending';
                          const { error } = await supabase
                            .from('project_phases')
                            .update({ progress: newProgress, status: newStatus })
                            .eq('id', phase.id);
                          if (!error) {
                            queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
                          }
                        }}
                        className="flex-1 h-2 accent-primary"
                      />
                      <span className="text-xs font-medium w-10 text-right">{phase.progress}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
