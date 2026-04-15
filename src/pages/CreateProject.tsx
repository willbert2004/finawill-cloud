import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Send, Loader2, CheckCircle, Sparkles, AlertTriangle, Search, Shield, User, Calendar, Building } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { callSmartAllocation, formatSupervisorList } from "@/lib/smartAllocation";

const PROJECT_CATEGORIES = [
  "Artificial Intelligence",
  "Machine Learning",
  "Web Development",
  "Mobile Development",
  "IoT (Internet of Things)",
  "Cybersecurity",
  "Data Science",
  "Cloud Computing",
  "Blockchain",
  "Robotics",
  "Software Engineering",
  "Networking",
  "Embedded Systems",
  "Game Development",
  "Other",
];

interface SimilarProject {
  id: string;
  title: string;
  description: string;
  objectives?: string;
  similarity: number;
  student_name?: string;
  supervisor_name?: string;
  year?: number;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  message: string;
  similarProjects: SimilarProject[];
  highestSimilarity: number;
}

interface AllocationResult {
  allocated: boolean;
  category?: string;
  manualAssignmentRequired?: boolean;
  matchedSupervisorNames?: string[];
  message?: string;
  notifiedSupervisors?: number;
  topMatchReason?: string;
  topMatchScore?: number;
}

const normalizeCategory = (value: string) => value.trim().toLowerCase();

const getStoredCategory = (project: { keywords?: string[] | null }) => {
  const keywords = project.keywords || [];
  return PROJECT_CATEGORIES.find((category) =>
    keywords.some((keyword) => normalizeCategory(keyword) === normalizeCategory(category))
  ) || "";
};

const buildProjectKeywords = (category: string) =>
  category.trim() ? [category.trim()] : [];

export default function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [formData, setFormData] = useState({ title: "", objectives: "", description: "", department: "", category: "" });
  const [submitting, setSubmitting] = useState(false);
  const [resubmitId, setResubmitId] = useState<string | null>(null);
  const [resubmitFeedback, setResubmitFeedback] = useState<string | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [duplicateChecked, setDuplicateChecked] = useState(false);

  useEffect(() => { setIsFinished(searchParams.get('finished') === 'true'); }, [searchParams]);

  // Load existing project data for resubmission
  useEffect(() => {
    const rid = searchParams.get('resubmit');
    if (rid && user) {
      setResubmitId(rid);
      supabase.from('projects').select('*').eq('id', rid).eq('student_id', user.id).single().then(({ data }) => {
        if (data) {
          setFormData({
            title: data.title,
            objectives: data.objectives || '',
            description: data.description,
            department: data.department || '',
            category: getStoredCategory(data),
          });
          setResubmitFeedback(data.rejection_reason);
        }
      });
    }
  }, [searchParams, user]);

  // Reset duplicate check when form changes
  useEffect(() => {
    setDuplicateChecked(false);
    setDuplicateResult(null);
  }, [formData.title, formData.objectives, formData.description]);

  const handleDuplicateCheck = async () => {
    if (!user) return;
    if (!formData.title.trim() || !formData.objectives.trim() || !formData.description.trim()) {
      toast({ title: "Missing Info", description: "Title, objectives, and description are required for the similarity check.", variant: "destructive" });
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-duplicate', {
        body: { title: formData.title, objectives: formData.objectives, description: formData.description }
      });
      if (error) throw error;
      setDuplicateResult({
        isDuplicate: data.isDuplicate,
        message: data.message,
        similarProjects: data.similarProjects || [],
        highestSimilarity: data.highestSimilarity || 0,
      });
      setDuplicateChecked(true);
      if (data.isDuplicate) {
        toast({ title: "Similar Projects Found", description: "Your project is too similar to existing ones. Please review and modify.", variant: "destructive" });
      } else {
        toast({ title: "No Duplicates Found", description: "Your project is unique! You can proceed to submit." });
      }
    } catch (error: any) {
      toast({ title: "Check Failed", description: error.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "Authentication Required", variant: "destructive" }); return; }

    if (!formData.department || !formData.category) {
      toast({ title: "Missing Fields", description: "Department and category are required.", variant: "destructive" });
      return;
    }

    // Require duplicate check before submission (unless resubmit or finished)
    if (!isFinished && !resubmitId && !duplicateChecked) {
      toast({ title: "Similarity Check Required", description: "Please run the duplicate check before submitting.", variant: "destructive" });
      return;
    }

    // If duplicate detected, save the project as a flagged duplicate for institutional tracking, then block
    if (duplicateResult?.isDuplicate && !resubmitId && !isFinished) {
      try {
        await supabase.from('projects').insert({
          title: formData.title, description: formData.description, objectives: formData.objectives,
          student_id: user.id, department: formData.department,
          keywords: buildProjectKeywords(formData.category),
          status: 'rejected',
          similarity_score: duplicateResult?.highestSimilarity || 0,
          is_duplicate: true,
          rejection_reason: duplicateResult?.message || 'Flagged as duplicate',
        });
      } catch (saveErr) {
        console.error('Failed to save duplicate record:', saveErr);
      }
      toast({ title: "Submission Blocked", description: "Your project is too similar to existing ones. Please modify your proposal.", variant: "destructive" });
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    setLoading(true);
    try {
      if (resubmitId) {
        const { error } = await supabase.from('projects').update({
          title: formData.title, description: formData.description, objectives: formData.objectives,
          department: formData.department, keywords: buildProjectKeywords(formData.category),
          status: 'pending', rejection_reason: null,
        }).eq('id', resubmitId);
        if (error) throw error;
        try {
          const allocData = await callSmartAllocation<AllocationResult>({ action: 'auto_allocate_project', projectId: resubmitId });
          setAllocationResult(allocData);
        } catch (e: any) {
          console.error('Auto-allocation failed:', e);
          setAllocationResult({ allocated: false, message: e.message });
        }
        setSubmitted(true);
        toast({ title: "Project Resubmitted!" });
      } else {
        const { data: project, error } = await supabase.from('projects').insert({
          title: formData.title, description: formData.description, objectives: formData.objectives,
          student_id: user.id, department: formData.department,
          keywords: buildProjectKeywords(formData.category),
          status: isFinished ? 'completed' : 'pending',
          similarity_score: duplicateResult?.highestSimilarity || 0,
          is_duplicate: false,
        }).select().single();
        if (error) throw error;
        if (!isFinished && project) {
          try {
            const allocData = await callSmartAllocation<AllocationResult>({ action: 'auto_allocate_project', projectId: project.id });
            setAllocationResult(allocData);
          } catch (e: any) {
            console.error('Auto-allocation failed:', e);
            setAllocationResult({ allocated: false, message: e.message });
          }
        }
        setSubmitted(true);
        toast({ title: isFinished ? "Project Added!" : "Project Submitted!" });
      }
    } catch (error: any) { toast({ title: "Failed", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); setSubmitting(false); }
  };

  if (!user) return <AuthenticatedLayout><div className="text-center py-12"><p>Please log in.</p></div></AuthenticatedLayout>;

  if (submitted) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-2xl mx-auto animate-scale-in">
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{isFinished ? "Project Added!" : "Submitted Successfully!"}</h2>
                {!isFinished && allocationResult?.matchedSupervisorNames?.length ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Your project has been sent to the matching supervisor{allocationResult.matchedSupervisorNames.length > 1 ? "s" : ""} for review.
                    </p>
                    <div className="bg-accent/50 rounded-lg p-4 text-left">
                      <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">Routed Supervisors</span></div>
                      <p className="text-xs text-muted-foreground">
                        Sent to <span className="font-medium text-foreground">{formatSupervisorList(allocationResult.matchedSupervisorNames)}</span>
                      </p>
                      {allocationResult.category && (
                        <p className="text-xs text-muted-foreground">Category: <span className="font-medium text-foreground">{allocationResult.category}</span></p>
                      )}
                      {allocationResult.topMatchReason && (
                        <p className="text-xs text-muted-foreground">Top match reason: <span className="font-medium text-foreground">{allocationResult.topMatchReason}</span></p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">The supervisor will review your project and accept, reject, or request revisions.</p>
                  </div>
                ) : !isFinished ? (
                  <p className="text-sm text-muted-foreground">{allocationResult?.message || "Pending supervisor assignment. You'll be notified when a supervisor reviews your project."}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Added to the repository.</p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/projects')}>View Projects</Button>
                <Button variant="outline" onClick={() => { setSubmitted(false); setAllocationResult(null); setDuplicateResult(null); setDuplicateChecked(false); setFormData({ title: "", objectives: "", description: "", department: "", category: "" }); }}>Submit Another</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-3xl mx-auto animate-slide-up">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{resubmitId ? "Revise & Resubmit" : isFinished ? "Add Finished Project" : "Submit Project Proposal"}</h1>
          <p className="text-sm text-muted-foreground">{resubmitId ? "Address the feedback below, update your project, and resubmit." : isFinished ? "Add a completed project to the repository." : "Submit your proposal — the system will check for duplicates and match you to a supervisor."}</p>
        </div>

        {resubmitFeedback && (
          <Card className="mb-6 border-l-4 border-l-destructive">
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" /> Supervisor Feedback
              </div>
              <p className="text-sm text-muted-foreground">{resubmitFeedback}</p>
              <p className="text-xs text-muted-foreground italic">Address this feedback in your revision below, then resubmit.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Project Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Project Title *</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter your project title" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Computer Science" required />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Objectives *</Label>
                <Textarea value={formData.objectives} onChange={e => setFormData({ ...formData, objectives: e.target.value })} placeholder="List the main objectives..." rows={3} required />
                <p className="text-xs text-muted-foreground">Clearly state what your project aims to achieve.</p>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe methodology and expected outcomes..." rows={5} required />
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ title: "", objectives: "", description: "", department: "", category: "" })}>
                  Clear All Fields
                </Button>
              </div>

              {/* Duplicate Check Section */}
              {!isFinished && !resubmitId && (
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">Similarity Check</span>
                      {duplicateChecked && (
                        duplicateResult?.isDuplicate ?
                          <Badge variant="destructive" className="text-[10px]">Blocked</Badge> :
                          <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Passed</Badge>
                      )}
                    </div>
                    <Button type="button" onClick={handleDuplicateCheck} disabled={checking} variant="outline" size="sm">
                      {checking ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Checking...</> : <><Search className="h-3 w-3 mr-1.5" />Check for Duplicates</>}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You must run this check before submitting. Projects above the configured high-risk threshold will be rejected.
                  </p>

                  {/* Duplicate Results */}
                  {duplicateResult && (
                    <div className={`rounded-lg p-3 ${duplicateResult.isDuplicate ? 'bg-destructive/10 border border-destructive/20' : 'bg-success/10 border border-success/20'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {duplicateResult.isDuplicate ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                        <span className={`text-sm font-medium ${duplicateResult.isDuplicate ? 'text-destructive' : 'text-success'}`}>
                          {duplicateResult.isDuplicate ? 'Similar Projects Detected — Submission Blocked' : 'No Significant Duplicates Found'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{duplicateResult.message}</p>
                      {duplicateResult.highestSimilarity > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Highest similarity: <span className="font-semibold">{Math.round(duplicateResult.highestSimilarity)}%</span></p>
                      )}
                    </div>
                  )}

                  {/* Similar Projects List */}
                  {duplicateResult?.similarProjects && duplicateResult.similarProjects.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Similar Existing Projects:</h4>
                      {duplicateResult.similarProjects.map((sp) => (
                        <div key={sp.id} className="border rounded-lg p-3 space-y-2 bg-background">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-medium text-sm">{sp.title}</h5>
                            <Badge variant={sp.similarity > (duplicateResult as any)?.thresholds?.high?.min || 70 ? "destructive" : sp.similarity >= (duplicateResult as any)?.thresholds?.possible?.min || 35 ? "outline" : "secondary"} className="text-[10px] shrink-0">
                              {Math.round(sp.similarity)}% match
                            </Badge>
                          </div>
                          {sp.objectives && <p className="text-xs text-muted-foreground line-clamp-2"><span className="font-medium">Objectives:</span> {sp.objectives}</p>}
                          <p className="text-xs text-muted-foreground line-clamp-2">{sp.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {sp.student_name && (
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {sp.student_name}</span>
                            )}
                            {sp.supervisor_name && (
                              <span className="flex items-center gap-1"><User className="h-3 w-3 text-primary" /> {sp.supervisor_name}</span>
                            )}
                            {sp.year && (
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {sp.year}</span>
                            )}
                          </div>
                          <Progress value={sp.similarity} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || (duplicateResult?.isDuplicate && !resubmitId && !isFinished)}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : <><Send className="h-4 w-4 mr-2" />{resubmitId ? "Resubmit Project" : isFinished ? "Add Project" : "Submit & Find Supervisor"}</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
