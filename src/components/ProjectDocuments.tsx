import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload, FileText, Download, Trash2, Clock, Plus, Bell, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectDocumentsProps {
  projectId: string;
}

const documentTypes = [
  { value: 'progress_check', label: 'Progress Check' },
  { value: 'proposal', label: 'Project Proposal' },
  { value: 'report', label: 'Progress Report' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'final', label: 'Final Report' },
  { value: 'minutes', label: 'Meeting Minutes' },
  { value: 'other', label: 'Other' },
];

export const ProjectDocuments = ({ projectId }: ProjectDocumentsProps) => {
  const { user } = useAuth();
  const { isStudent, isSupervisor } = useUserRole();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('progress_check');
  const [description, setDescription] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedDocs, setDownloadedDocs] = useState<Set<string>>(new Set());

  const { data: project } = useQuery({
    queryKey: ['project-for-docs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects')
        .select('id, title, supervisor_id, student_id').eq('id', projectId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: uploaderProfiles } = useQuery({
    queryKey: ['uploader-profiles', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email, user_type');
      if (error) throw error;
      return data;
    },
  });

  const getUploaderName = (userId: string) => {
    const profile = uploaderProfiles?.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const getUploaderType = (userId: string) => {
    const profile = uploaderProfiles?.find(p => p.user_id === userId);
    return profile?.user_type || '';
  };

  const { data: documents, isLoading } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_documents')
        .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !user) throw new Error('No file selected');

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${projectId}/${fileName}`;

      const existingDocs = documents?.filter(d => d.document_type === documentType) || [];
      const newVersion = existingDocs.length + 1;

      const { error: uploadError } = await supabase.storage.from('project-documents').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('project_documents').insert({
        project_id: projectId, uploaded_by: user.id, file_name: selectedFile.name,
        file_path: filePath, file_size: selectedFile.size, file_type: selectedFile.type,
        document_type: documentType, version: newVersion, description,
      });
      if (dbError) throw dbError;

      // Send notification
      const docLabel = documentTypes.find(t => t.value === documentType)?.label || documentType;
      
      if (isStudent && project?.supervisor_id) {
        await supabase.from('notifications').insert({
          user_id: project.supervisor_id,
          title: `📄 New ${docLabel} Uploaded`,
          message: `A student has uploaded "${selectedFile.name}" (${docLabel}) for project "${project.title}". Please review it.`,
          type: 'document_upload',
          link: '/project-management',
        });
      } else if (isSupervisor && project?.student_id) {
        await supabase.from('notifications').insert({
          user_id: project.student_id,
          title: `📄 Supervisor Uploaded a Document`,
          message: `Your supervisor has uploaded "${selectedFile.name}" (${docLabel}) for project "${project.title}".`,
          type: 'document_upload',
          link: '/project-management',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      setUploadDialogOpen(false); setSelectedFile(null); setDescription('');
      toast({ title: 'Document uploaded successfully', description: 'The relevant parties have been notified.' });
    },
    onError: (error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from('project-documents').remove([doc.file_path]);
      const { error } = await supabase.from('project_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({ title: 'Document deleted' });
    },
  });

  const handleDownload = async (filePath: string, fileName: string, docId: string) => {
    setDownloadingDocId(docId);
    setDownloadProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const { data, error } = await supabase.storage.from('project-documents').download(filePath);
      
      clearInterval(progressInterval);
      
      if (error) {
        toast({ title: 'Download failed', variant: 'destructive' });
        setDownloadingDocId(null); setDownloadProgress(0);
        return;
      }

      setDownloadProgress(100);

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);

      // Mark as downloaded
      setDownloadedDocs(prev => new Set(prev).add(docId));
      
      toast({ 
        title: '✅ Download Complete', 
        description: `"${fileName}" has been downloaded successfully.`,
      });

      // Reset after animation
      setTimeout(() => {
        setDownloadingDocId(null);
        setDownloadProgress(0);
      }, 1500);
    } catch {
      clearInterval(progressInterval);
      toast({ title: 'Download failed', variant: 'destructive' });
      setDownloadingDocId(null); setDownloadProgress(0);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) { toast({ title: 'Please select a file', variant: 'destructive' }); return; }
    setIsUploading(true);
    uploadMutation.mutate(undefined, { onSettled: () => setIsUploading(false) });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupedDocuments = documents?.reduce((acc, doc) => {
    if (!acc[doc.document_type]) acc[doc.document_type] = [];
    acc[doc.document_type].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Project Documents</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Upload documents for progress checks, reports, and reviews. Your {isStudent ? 'supervisor' : 'students'} will be notified automatically.
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="bg-accent/50 rounded-lg p-3 text-sm text-muted-foreground flex items-start gap-2">
                <Bell className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Your {isStudent ? 'allocated supervisor' : 'student'} will receive a notification when you upload this document.</span>
              </div>
              <div>
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File</Label>
                <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar" />
                <p className="text-xs text-muted-foreground mt-1">Accepted: PDF, Word, PowerPoint, Excel, ZIP</p>
              </div>
              <div>
                <Label>Description / Notes</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder={documentType === 'progress_check' ? 'Describe progress, blockers, and next steps...' : 'Brief description...'} rows={3} />
              </div>
              <Button onClick={handleUpload} disabled={isUploading || !selectedFile} className="w-full">
                <Upload className="h-4 w-4 mr-2" />{isUploading ? 'Uploading...' : 'Upload & Notify'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
        ) : !documents?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No documents uploaded yet</p>
            <p className="text-sm mt-1">
              {isStudent ? 'Upload your progress checks and reports here for your supervisor to review.' : 'Documents uploaded by students will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDocuments || {}).map(([type, docs]) => (
              <div key={type}>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  {documentTypes.find(t => t.value === type)?.label || type}
                  <Badge variant="outline" className="text-xs">{(docs as any[])?.length}</Badge>
                </h4>
                <div className="space-y-2">
                  {(docs as any[])?.map((doc: any) => {
                    const isDownloading = downloadingDocId === doc.id;
                    const isDownloaded = downloadedDocs.has(doc.id);
                    
                    return (
                      <div key={doc.id}
                        className={`relative overflow-hidden flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                          isDownloading ? 'bg-primary/10 border border-primary/30' :
                          isDownloaded ? 'bg-success/10 border border-success/30' :
                          'bg-accent/30'
                        }`}
                      >
                        {/* Download progress bar */}
                        {isDownloading && (
                          <div className="absolute bottom-0 left-0 right-0 h-1">
                            <Progress value={downloadProgress} className="h-1 rounded-none" />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3">
                          <div className={`relative ${isDownloading ? 'animate-pulse' : ''}`}>
                            <FileText className={`h-8 w-8 flex-shrink-0 ${
                              isDownloaded ? 'text-success' : 'text-primary'
                            }`} />
                            {isDownloaded && (
                              <CheckCircle className="h-3.5 w-3.5 text-success absolute -bottom-0.5 -right-0.5 bg-background rounded-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{doc.file_name}</p>
                            {doc.description && <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                              <span className="text-xs">
                                by {getUploaderName(doc.uploaded_by)}
                                {getUploaderType(doc.uploaded_by) && (
                                  <span className="text-muted-foreground/70"> ({getUploaderType(doc.uploaded_by)})</span>
                                )}
                              </span>
                              {doc.file_size && <span>• {formatFileSize(doc.file_size)}</span>}
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                              {isDownloaded && (
                                <Badge className="bg-success/10 text-success border-success/30 text-[9px] gap-0.5">
                                  <CheckCircle className="h-2.5 w-2.5" /> Downloaded
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant={isDownloading ? "default" : "ghost"}
                            size="icon"
                            disabled={isDownloading}
                            onClick={() => handleDownload(doc.file_path, doc.file_name, doc.id)}
                            className={isDownloading ? 'animate-pulse' : ''}
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          {doc.uploaded_by === user?.id && (
                            <Button variant="ghost" size="icon" className="text-destructive"
                              onClick={() => deleteMutation.mutate({ id: doc.id, file_path: doc.file_path })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
