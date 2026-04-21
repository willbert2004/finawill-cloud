import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { BookOpen, Upload, Download, Plus, MessageSquare, FileCheck, FileWarning, FileX, PackageCheck, FileArchive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Props {
  projectId: string;
  isStudent: boolean;
  isSupervisor: boolean;
}

const statusMeta: Record<string, { label: string; cls: string; Icon: any }> = {
  draft: { label: 'Draft', cls: 'bg-muted text-muted-foreground', Icon: BookOpen },
  submitted: { label: 'Submitted', cls: 'bg-primary/15 text-primary border-primary/30', Icon: Upload },
  needs_revision: { label: 'Needs revision', cls: 'bg-warning/15 text-warning border-warning/30', Icon: FileWarning },
  approved: { label: 'Approved', cls: 'bg-success/15 text-success border-success/30', Icon: FileCheck },
  rejected: { label: 'Rejected', cls: 'bg-destructive/15 text-destructive border-destructive/30', Icon: FileX },
};

export const ProjectChapters = ({ projectId, isStudent, isSupervisor }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newChapterOpen, setNewChapterOpen] = useState(false);
  const [chTitle, setChTitle] = useState('');
  const [chDesc, setChDesc] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project-status', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, student_id')
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: finalZip, refetch: refetchFinalZip } = useQuery({
    queryKey: ['project-final-zip', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('document_type', 'final_zip')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: chapters, isLoading } = useQuery({
    queryKey: ['project-chapters', projectId],
    queryFn: async () => {
      const { data: chs, error } = await supabase
        .from('project_chapters')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;

      const ids = (chs || []).map((c) => c.id);
      if (!ids.length) return [];

      const [{ data: subs }, { data: fbs }] = await Promise.all([
        supabase.from('chapter_submissions').select('*').in('chapter_id', ids).order('version', { ascending: false }),
        supabase.from('chapter_feedback').select('*').in('chapter_id', ids).order('created_at', { ascending: false }),
      ]);

      return (chs || []).map((c) => ({
        ...c,
        submissions: (subs || []).filter((s) => s.chapter_id === c.id),
        feedback: (fbs || []).filter((f) => f.chapter_id === c.id),
      }));
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['project-chapters', projectId] });

  const addChapter = async () => {
    if (!chTitle.trim() || !user) return;
    const order = (chapters?.length || 0);
    const { error } = await supabase.from('project_chapters').insert({
      project_id: projectId,
      title: chTitle.trim(),
      description: chDesc.trim() || null,
      order_index: order,
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success('Chapter added');
    setChTitle(''); setChDesc(''); setNewChapterOpen(false);
    refresh();
  };

  const downloadFile = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('project-chapters').createSignedUrl(path, 60);
    if (error || !data) return toast.error('Could not get download link');
    const a = document.createElement('a');
    a.href = data.signedUrl; a.download = name; a.click();
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading chapters...</div>;

  // Per-project chapter status breakdown (visible to everyone on this tab)
  const counts = (chapters || []).reduce(
    (acc, c: any) => {
      acc.total += 1;
      if (c.status in acc) (acc as any)[c.status] += 1;
      return acc;
    },
    { total: 0, draft: 0, submitted: 0, needs_revision: 0, approved: 0, rejected: 0 } as any,
  );
  const REQUIRED_CHAPTERS = 6;
  const approvedOutOfRequired = Math.min(counts.approved, REQUIRED_CHAPTERS);
  const progressPct = Math.round((approvedOutOfRequired / REQUIRED_CHAPTERS) * 100);

  return (
    <div className="space-y-4">
      {/* Progress overview — shows current state of this project's chapters to student, supervisor and admin */}
      {!!chapters?.length && (
        <Card className="border-primary/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Project chapter progress</h4>
                <p className="text-xs text-muted-foreground">{approvedOutOfRequired} of {REQUIRED_CHAPTERS} chapters approved</p>
              </div>
              <span className="text-lg font-bold text-success">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-success [&>div]:to-secondary" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <MiniStat label="Draft" value={counts.draft} cls="bg-muted text-muted-foreground" />
              <MiniStat label="Submitted" value={counts.submitted} cls="bg-primary/10 text-primary" />
              <MiniStat label="Needs revision" value={counts.needs_revision} cls="bg-warning/10 text-warning" />
              <MiniStat label="Approved" value={counts.approved} cls="bg-success/10 text-success" />
              <MiniStat label="Rejected" value={counts.rejected} cls="bg-destructive/10 text-destructive" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final submission panel — shown when project is finalized (all chapters approved, ≥6) */}
      {project?.status === 'finalized' && (
        <FinalSubmissionPanel
          projectId={projectId}
          isStudent={isStudent}
          finalZip={finalZip}
          userId={user?.id}
          onUploaded={() => refetchFinalZip()}
          onDownload={downloadFile}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dissertation Chapters</h3>
          <p className="text-sm text-muted-foreground">Submit chapters for supervisor review and feedback.</p>
        </div>
        {isStudent && (
          <Dialog open={newChapterOpen} onOpenChange={setNewChapterOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add chapter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New chapter</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={chTitle} onChange={(e) => setChTitle(e.target.value)} placeholder="e.g. Chapter 1 — Introduction" maxLength={120} />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea value={chDesc} onChange={(e) => setChDesc(e.target.value)} maxLength={500} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addChapter} disabled={!chTitle.trim()}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!chapters?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          {isStudent ? 'No chapters yet. Add your first chapter to start submitting drafts.' : 'The student has not added any chapters yet.'}
        </CardContent></Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {chapters.map((c) => {
            const meta = statusMeta[c.status] || statusMeta.draft;
            const StatusIcon = meta.Icon;
            return (
              <AccordionItem key={c.id} value={c.id} className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3 text-left">
                      <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{c.title}</div>
                        {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                      </div>
                    </div>
                    <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ChapterDetail
                    chapter={c}
                    isStudent={isStudent}
                    isSupervisor={isSupervisor}
                    projectId={projectId}
                    userId={user?.id}
                    onChange={refresh}
                    onDownload={downloadFile}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

interface DetailProps {
  chapter: any;
  isStudent: boolean;
  isSupervisor: boolean;
  projectId: string;
  userId?: string;
  onChange: () => void;
  onDownload: (path: string, name: string) => void;
}

const ChapterDetail = ({ chapter, isStudent, isSupervisor, projectId, userId, onChange, onDownload }: DetailProps) => {
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbStatus, setFbStatus] = useState<'approved' | 'needs_revision' | 'rejected'>('needs_revision');
  const [fbComments, setFbComments] = useState('');
  const [fbFile, setFbFile] = useState<File | null>(null);
  const [savingFb, setSavingFb] = useState(false);
  const latest = chapter.submissions[0];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const path = `${projectId}/${chapter.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('project-chapters').upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('chapter_submissions').insert({
        chapter_id: chapter.id,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        notes: notes.trim() || null,
        submitted_by: userId,
      });
      if (insErr) throw insErr;
      toast.success('Chapter submitted');
      setNotes('');
      onChange();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submitFeedback = async () => {
    if (!latest || !userId || !fbComments.trim()) {
      return toast.error('A submission and comments are required');
    }
    setSavingFb(true);
    try {
      let markedPath: string | null = null;
      let markedName: string | null = null;
      if (fbFile) {
        markedPath = `${projectId}/${chapter.id}/feedback-${Date.now()}-${fbFile.name}`;
        const { error: upErr } = await supabase.storage.from('project-chapters').upload(markedPath, fbFile);
        if (upErr) throw upErr;
        markedName = fbFile.name;
      }
      const { error } = await supabase.from('chapter_feedback').insert({
        submission_id: latest.id,
        chapter_id: chapter.id,
        supervisor_id: userId,
        status: fbStatus,
        comments: fbComments.trim(),
        marked_file_path: markedPath,
        marked_file_name: markedName,
      });
      if (error) throw error;
      toast.success('Feedback sent to student');
      setFbComments(''); setFbFile(null); setFeedbackOpen(false);
      onChange();
    } catch (err: any) {
      toast.error(err.message || 'Could not save feedback');
    } finally {
      setSavingFb(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Submissions list */}
      <div>
        <div className="text-sm font-medium mb-2">Submissions ({chapter.submissions.length})</div>
        {chapter.submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {chapter.submissions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-md border bg-background/50">
                <div className="text-sm">
                  <div className="font-medium">v{s.version} — {s.file_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                  {s.notes && <div className="text-xs mt-1">Notes: {s.notes}</div>}
                </div>
                <Button variant="outline" size="sm" onClick={() => onDownload(s.file_path, s.file_name)}>
                  <Download className="h-4 w-4 mr-1" />Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student upload */}
      {isStudent && (
        <div className="space-y-2 p-3 rounded-md border border-dashed">
          <Label className="text-sm">Upload new version</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for your supervisor..."
            maxLength={500}
            rows={2}
          />
          <Input type="file" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.odt,.txt" />
        </div>
      )}

      {/* Feedback list */}
      <div>
        <div className="text-sm font-medium mb-2">Feedback ({chapter.feedback.length})</div>
        {chapter.feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback yet.</p>
        ) : (
          <div className="space-y-2">
            {chapter.feedback.map((f: any) => {
              const meta = statusMeta[f.status] || statusMeta.needs_revision;
              return (
                <div key={f.id} className="p-3 rounded-md border bg-background/50">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{f.comments}</p>
                  {f.marked_file_path && (
                    <Button variant="link" size="sm" className="px-0" onClick={() => onDownload(f.marked_file_path, f.marked_file_name)}>
                      <Download className="h-4 w-4 mr-1" />Marked-up: {f.marked_file_name}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Supervisor feedback action */}
      {isSupervisor && latest && (
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogTrigger asChild>
            <Button><MessageSquare className="h-4 w-4 mr-2" />Mark & give feedback</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="pr-6">Feedback on {chapter.title} (v{latest.version})</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select value={fbStatus} onValueChange={(v) => setFbStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="needs_revision">Needs revision</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Comments</Label>
                <Textarea
                  value={fbComments}
                  onChange={(e) => setFbComments(e.target.value)}
                  rows={6}
                  maxLength={4000}
                  placeholder="What needs to change? Be specific about sections, references, structure..."
                />
              </div>
              <div>
                <Label>Marked-up file (optional)</Label>
                <Input type="file" onChange={(e) => setFbFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.odt" />
                {fbFile && <p className="text-xs text-muted-foreground mt-1">{fbFile.name}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submitFeedback} disabled={savingFb || !fbComments.trim()}>
                {savingFb ? 'Sending...' : 'Send feedback'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {isSupervisor && !latest && (
        <p className="text-sm text-muted-foreground">Waiting for the student to submit a draft.</p>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, cls }: { label: string; value: number; cls: string }) => (
  <div className={`rounded-md p-2 ${cls}`}>
    <div className="text-base font-bold leading-none">{value}</div>
    <div className="text-[10px] mt-1 opacity-80">{label}</div>
  </div>
);

interface FinalPanelProps {
  projectId: string;
  isStudent: boolean;
  finalZip: any;
  userId?: string;
  onUploaded: () => void;
  onDownload: (path: string, name: string) => void;
}

const FinalSubmissionPanel = ({ projectId, isStudent, finalZip, userId, onUploaded, onDownload }: FinalPanelProps) => {
  const [uploading, setUploading] = useState(false);

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!/\.(zip|rar|7z)$/i.test(file.name)) {
      toast.error('Please upload a .zip (or .rar/.7z) archive containing your documentation and prototype.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const path = `${projectId}/final/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('project-chapters').upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('project_documents').insert({
        project_id: projectId,
        document_type: 'final_zip',
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: userId,
        description: 'Final compiled submission (documentation + prototype)',
      });
      if (insErr) throw insErr;
      toast.success('Final submission uploaded');
      onUploaded();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-success" />
          Project finalized — final submission
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          All chapters have been approved. {isStudent
            ? 'Compile your final documentation and prototype into a single ZIP archive and upload it below.'
            : 'Awaiting the student to upload the final ZIP containing documentation and prototype.'}
        </p>

        {finalZip ? (
          <div className="flex items-center justify-between p-3 rounded-md border bg-background/60">
            <div className="text-sm flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-success" />
              <div>
                <div className="font-medium">{finalZip.file_name}</div>
                <div className="text-xs text-muted-foreground">
                  Submitted {new Date(finalZip.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onDownload(finalZip.file_path, finalZip.file_name)}>
              <Download className="h-4 w-4 mr-1" />Download
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No final submission uploaded yet.</p>
        )}

        {isStudent && (
          <div className="space-y-2">
            <Label className="text-sm">{finalZip ? 'Replace with a new version' : 'Upload final ZIP'}</Label>
            <Input type="file" onChange={handleZipUpload} disabled={uploading} accept=".zip,.rar,.7z" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

