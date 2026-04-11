import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import {
  CheckCircle, Clock, MessageSquare, User, Building, Calendar,
  FileText, AlertTriangle, Award, Loader2, ArrowLeft, RefreshCw, Sparkles,
  XCircle, Send,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchProjectPeople } from "@/lib/projectPeople";
import { callSmartAllocation } from "@/lib/smartAllocation";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  title: string;
  description: string;
  objectives?: string;
  status: string;
  similarity_score: number;
  is_duplicate: boolean;
  keywords: string[];
  created_at: string;
  updated_at?: string;
  student_id: string;
  supervisor_id?: string;
  rejection_reason?: string;
  department?: string;
  document_url?: string;
  year?: number;
  category?: string;
}

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [studentName, setStudentName] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackAction, setFeedbackAction] = useState<"reject" | "revision">("revision");
  const [feedbackText, setFeedbackText] = useState("");
  const [pendingAllocation, setPendingAllocation] = useState<{ id: string; status: string; match_reason?: string; match_score?: number } | null>(null);

  useEffect(() => {
    if (!user || !projectId) return;
    fetchProject();
  }, [user, projectId]);

  const fetchProject = async () => {
    if (!projectId || !user) return;
    setLoading(true);
    try {
      const [{ data: profileData }, { data: projectData }, { data: allocationData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase
          .from("pending_allocations")
          .select("id, status, match_reason, match_score")
          .eq("project_id", projectId)
          .eq("supervisor_id", user.id)
          .maybeSingle(),
      ]);

      if (!projectData) {
        toast({ title: "Project not found", variant: "destructive" });
        navigate("/projects");
        return;
      }

      setProfile(profileData);
      setProject(projectData as Project);
      setPendingAllocation((allocationData as any) || null);
      setStudentName("");
      setSupervisorName("");

      // Fetch student and supervisor names
      const ids = [projectData.student_id, projectData.supervisor_id].filter(Boolean);
      if (ids.length > 0) {
        const people = await fetchProjectPeople(ids);
        setStudentName(people[projectData.student_id]?.full_name || "");
        if (projectData.supervisor_id) {
          setSupervisorName(people[projectData.supervisor_id]?.full_name || "");
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      const data = await callSmartAllocation<{ supervisorName?: string }>({ action: "approve_project", projectId: project.id });
      toast({ title: "Project Approved", description: data.supervisorName ? `The student has been notified and assigned to ${data.supervisorName}.` : "The student has been notified." });
      fetchProject();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!project || !feedbackText.trim()) {
      toast({ title: "Feedback Required", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await callSmartAllocation({
        action: feedbackAction === "reject" ? "reject_project_with_feedback" : "request_revision",
        projectId: project.id,
        rejectionReason: feedbackText,
        reviewOutcome: feedbackAction,
      });
      toast({
        title: feedbackAction === "reject" ? "Project Rejected" : "Revision Requested",
        description: "The student has been notified with your feedback.",
      });
      setFeedbackDialogOpen(false);
      setFeedbackText("");
      fetchProject();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      const { data: phases } = await supabase
        .from("project_phases")
        .select("id, name, status")
        .eq("project_id", project.id);
      if (phases && phases.length > 0) {
        const incomplete = phases.filter((p) => p.status !== "completed");
        if (incomplete.length > 0) {
          toast({
            title: "Cannot Finalize",
            description: `Incomplete phases: ${incomplete.map((p) => p.name).join(", ")}`,
            variant: "destructive",
          });
          setActionLoading(false);
          return;
        }
      }
      const { error } = await supabase
        .from("projects")
        .update({ status: "finalized" })
        .eq("id", project.id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: project.student_id,
        title: "🎓 Project Finalized!",
        message: `Your project "${project.title}" has been finalized. Congratulations!`,
        type: "finalized",
        link: `/projects/${project.id}`,
      });
      toast({ title: "Project Finalized" });
      fetchProject();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string, isDuplicate: boolean) => {
    if (isDuplicate)
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Duplicate
        </Badge>
      );
    switch (status) {
      case "pending":
        return (
          <Badge className="flex items-center gap-1 bg-warning/10 text-warning border border-warning/30">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="flex items-center gap-1 bg-success/10 text-success border border-success/30">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "needs_revision":
        return (
          <Badge className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/30">
            <MessageSquare className="h-3 w-3" />
            Needs Revision
          </Badge>
        );
      case "finalized":
        return (
          <Badge className="flex items-center gap-1 bg-emerald-600/10 text-emerald-600 border border-emerald-600/30">
            <Award className="h-3 w-3" />
            Finalized
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!project) {
    return (
      <AuthenticatedLayout>
        <div className="text-center py-12">
          <p>Project not found.</p>
          <Button onClick={() => navigate("/projects")} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </AuthenticatedLayout>
    );
  }

  const isSupervisor = profile?.user_type === "supervisor";
  const isStudent = profile?.user_type === "student";
  const isAdmin = profile?.user_type === "admin";
  const canReview =
    ((isSupervisor && pendingAllocation?.status === "pending") || isAdmin) &&
    project.status === "pending" &&
    !project.supervisor_id &&
    !project.is_duplicate;
  const canFinalize =
    isSupervisor &&
    project.supervisor_id === user?.id &&
    ["approved", "in_progress"].includes(project.status);
  const canResubmit = isStudent && project.status === "needs_revision";
  const projectCategory = project.category || project.keywords?.[0] || "";

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Projects
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted on{" "}
              {new Date(project.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {getStatusBadge(project.status, project.is_duplicate)}
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Student
                </p>
                <p className="text-sm font-medium">{studentName || "Unknown"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Supervisor
                </p>
                <p className="text-sm font-medium">
                  {project.supervisor_id ? supervisorName || "Unknown" : "Not assigned"}
                </p>
              </div>
            </CardContent>
          </Card>
          {project.department && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Building className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Department
                  </p>
                  <p className="text-sm font-medium">{project.department}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {projectCategory && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Category
                  </p>
                  <p className="text-sm font-medium">{projectCategory}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {project.year && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Year
                  </p>
                  <p className="text-sm font-medium">{project.year}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {project.description}
            </p>
          </CardContent>
        </Card>

        {/* Objectives */}
        {project.objectives && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" /> Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {project.objectives}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Supervisor Feedback */}
        {project.rejection_reason && (
          <Card className="border-l-4 border-l-destructive">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <MessageSquare className="h-4 w-4" /> Supervisor Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{project.rejection_reason}</p>
              {canResubmit && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  Address this feedback and resubmit your project below.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {pendingAllocation?.match_reason && canReview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Why this project matched you
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{pendingAllocation.match_reason}</p>
            </CardContent>
          </Card>
        )}

        {/* Keywords (display only if exist) */}
        {project.keywords && project.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.keywords.map((kw, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* Similarity */}
        {project.similarity_score > 0 && (
          <div className="text-xs text-muted-foreground">
            Similarity Score:{" "}
            <span className="font-medium">
              {Math.min(100, Math.round(project.similarity_score))}%
            </span>
          </div>
        )}

        {/* Action buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              {/* Supervisor: Approve */}
              {canReview && (
                <>
                  <Button onClick={handleApprove} disabled={actionLoading}>
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Accept & Supervise
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFeedbackAction("revision");
                      setFeedbackDialogOpen(true);
                    }}
                    disabled={actionLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Request Revision
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setFeedbackAction("reject");
                      setFeedbackDialogOpen(true);
                    }}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </>
              )}

              {/* Supervisor: Finalize */}
              {canFinalize && (
                <Button
                  onClick={handleFinalize}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Award className="h-4 w-4 mr-2" />
                  )}
                  Finalize Project
                </Button>
              )}

              {/* Student: Resubmit */}
              {canResubmit && (
                <Button
                  onClick={() => navigate(`/create-project?resubmit=${project.id}`)}
                  disabled={actionLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Edit & Resubmit
                </Button>
              )}

              {/* Open workspace for approved/in-progress */}
              {["approved", "in_progress", "finalized"].includes(project.status) && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/project-management?project=${project.id}`)}
                >
                  <FileText className="h-4 w-4 mr-2" /> Open Workspace
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackAction === "reject" ? "Reject Project" : "Request Revision"}
            </DialogTitle>
            <DialogDescription>
              {feedbackAction === "reject"
                ? "Provide a reason for rejecting this project."
                : "Provide specific feedback so the student can improve and resubmit."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe areas needing improvement..."
              rows={5}
            />
            <div className="flex gap-2">
              <Button onClick={handleReject} disabled={actionLoading} className="flex-1">
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {feedbackAction === "reject" ? "Reject with Feedback" : "Send Feedback"}
              </Button>
              <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
