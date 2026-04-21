import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RatingRow {
  id: string;
  project_id: string;
  status: string;
  score: number | null;
  comment: string | null;
  created_at: string;
  projects: {
    id: string;
    title: string;
    description: string;
    objectives: string | null;
    keywords: string[] | null;
    department: string | null;
    status: string;
    student_id: string;
    created_at: string;
  } | null;
}

const PendingReviews = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<RatingRow | null>(null);
  const [score, setScore] = useState<number>(70);
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-pending-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_ratings')
        .select('id, project_id, status, score, comment, created_at, projects!inner(id, title, description, objectives, keywords, department, status, student_id, created_at)')
        .eq('supervisor_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RatingRow[];
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const { error } = await supabase
        .from('project_ratings')
        .update({ score, comment, status: 'rated' })
        .eq('id', active.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pending-reviews', user?.id] });
      toast({ title: 'Rating submitted' });
      setOpen(false);
      setActive(null);
      setComment('');
      setScore(70);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openRate = (row: RatingRow) => {
    setActive(row);
    setScore(row.score ?? 70);
    setComment(row.comment ?? '');
    setOpen(true);
  };

  const pending = data?.filter((r) => r.status === 'pending') ?? [];
  const done = data?.filter((r) => r.status === 'rated') ?? [];

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Project Reviews
          </h1>
          <p className="text-muted-foreground mt-1">
            Rate projects matching your research areas. Once all matching supervisors rate, the project is auto-allocated to the supervisor with the lowest workload (if avg ≥ 50%).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Awaiting Your Rating ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : pending.length === 0 ? (
              <p className="text-muted-foreground">No projects awaiting your review.</p>
            ) : (
              pending.map((r) => (
                <div key={r.id} className="border border-border rounded-lg p-4 flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{r.projects?.title}</h3>
                      {r.projects?.department && <Badge variant="secondary">{r.projects.department}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.projects?.description}</p>
                    {r.projects?.keywords && r.projects.keywords.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {r.projects.keywords.slice(0, 6).map((k) => (
                          <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => openRate(r)}>Rate</Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Already Rated ({done.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {done.length === 0 ? (
              <p className="text-muted-foreground">No completed reviews yet.</p>
            ) : (
              done.map((r) => (
                <div key={r.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{r.projects?.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{r.comment}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{r.score}%</div>
                      <Badge variant={r.projects?.status === 'allocated' ? 'default' : r.projects?.status === 'rejected' ? 'destructive' : 'secondary'} className="mt-1">
                        {r.projects?.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate: {active?.projects?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Description:</strong> {active?.projects?.description}</p>
                {active?.projects?.objectives && <p><strong>Objectives:</strong> {active.projects.objectives}</p>}
              </div>
              <div>
                <Label>Score: <span className="font-bold text-primary">{score}%</span></Label>
                <Slider value={[score]} onValueChange={(v) => setScore(v[0])} min={0} max={100} step={1} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Projects need ≥ 50% average to be allocated.</p>
              </div>
              <div>
                <Label>Comment (optional but recommended)</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Strengths, weaknesses, suggestions…" />
              </div>
              <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
                {submit.isPending ? 'Submitting…' : 'Submit Rating'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default PendingReviews;
