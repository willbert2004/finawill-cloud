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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Plus, Star, Edit2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SupervisorFeedbackProps {
  projectId: string;
}

const feedbackTypes = [
  { value: 'general', label: 'General Feedback' },
  { value: 'proposal', label: 'Proposal Review' },
  { value: 'progress', label: 'Progress Review' },
  { value: 'presentation', label: 'Presentation Feedback' },
  { value: 'final', label: 'Final Assessment' },
];

export const SupervisorFeedback = ({ projectId }: SupervisorFeedbackProps) => {
  const { user } = useAuth();
  const { isSupervisor, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    feedback_type: 'general',
    rating: 0,
  });

  const canAddFeedback = isSupervisor || isAdmin;

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['supervisor-feedback', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supervisor_feedback')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingFeedback) {
        const { error } = await supabase
          .from('supervisor_feedback')
          .update({
            title: formData.title,
            content: formData.content,
            feedback_type: formData.feedback_type,
            rating: formData.rating || null,
          })
          .eq('id', editingFeedback.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('supervisor_feedback').insert({
          project_id: projectId,
          supervisor_id: user?.id,
          title: formData.title,
          content: formData.content,
          feedback_type: formData.feedback_type,
          rating: formData.rating || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-feedback', projectId] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingFeedback ? 'Feedback updated' : 'Feedback added' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supervisor_feedback').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-feedback', projectId] });
      toast({ title: 'Feedback deleted' });
    },
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', feedback_type: 'general', rating: 0 });
    setEditingFeedback(null);
  };

  const openEditDialog = (fb: any) => {
    setEditingFeedback(fb);
    setFormData({
      title: fb.title,
      content: fb.content,
      feedback_type: fb.feedback_type,
      rating: fb.rating || 0,
    });
    setDialogOpen(true);
  };

  const renderStars = (rating: number, editable = false, onChange?: (val: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} ${
              editable ? 'cursor-pointer hover:text-yellow-400' : ''
            }`}
            onClick={() => editable && onChange?.(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Supervisor Feedback
        </CardTitle>
        {canAddFeedback && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Feedback
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFeedback ? 'Edit Feedback' : 'Add Feedback'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Feedback Type</Label>
                  <Select
                    value={formData.feedback_type}
                    onValueChange={(v) => setFormData({ ...formData, feedback_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {feedbackTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief summary of feedback"
                  />
                </div>
                <div>
                  <Label>Feedback Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Detailed feedback..."
                    rows={5}
                  />
                </div>
                <div>
                  <Label>Rating (optional)</Label>
                  <div className="mt-2">
                    {renderStars(formData.rating, true, (val) => setFormData({ ...formData, rating: val }))}
                  </div>
                </div>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!formData.title || !formData.content}
                  className="w-full"
                >
                  {editingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading feedback...</div>
        ) : !feedback?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No feedback yet</p>
            {!canAddFeedback && <p className="text-sm mt-1">Your supervisor will provide feedback here</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((fb) => (
              <div key={fb.id} className="p-4 border border-border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">
                        {feedbackTypes.find((t) => t.value === fb.feedback_type)?.label || fb.feedback_type}
                      </Badge>
                      {fb.rating && renderStars(fb.rating)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <h4 className="font-semibold mt-2">{fb.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{fb.content}</p>
                  </div>
                  {(fb.supervisor_id === user?.id || isAdmin) && (
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(fb)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(fb.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
