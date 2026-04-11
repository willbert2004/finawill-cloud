import { useState, useEffect } from "react";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Sparkles, UserPlus, UserX, RefreshCw, Home } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SupervisorList from "@/components/SupervisorList";
import GroupManagement from "@/components/GroupManagement";
import AllocationFilters from "@/components/AllocationFilters";
import { fetchProjectPeople } from "@/lib/projectPeople";
import { callSmartAllocation } from "@/lib/smartAllocation";

interface PendingAllocation {
  id: string;
  project_id: string;
  supervisor_id: string;
  match_score: number;
  match_reason: string;
  status: string;
  projects: {
    title: string;
    description: string;
    department: string;
    keywords: string[];
    similarity_score: number;
    student_id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  };
}

interface UnassignedProject {
  id: string;
  title: string;
  description: string;
  department: string;
  keywords: string[];
  student_id: string;
  similarity_score: number;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface AssignedProject {
  id: string;
  title: string;
  description: string;
  department: string;
  status: string;
  similarity_score: number;
  student_id: string;
  supervisor_id: string;
  keywords?: string[];
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Supervisor {
  id: string;
  user_id: string;
  current_projects: number;
  max_projects: number;
  research_areas?: string[];
  department?: string;
  office_location?: string;
  profiles: {
    user_id: string;
    full_name: string;
    email: string;
  };
}

export default function Allocation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocation[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<AssignedProject[]>([]);
  const [unassignedProjects, setUnassignedProjects] = useState<UnassignedProject[]>([]);
  const [userType, setUserType] = useState<string>("");
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedProjectForReassign, setSelectedProjectForReassign] = useState<string>("");
  const [pendingGroupAllocations, setPendingGroupAllocations] = useState(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedKeyword, setSelectedKeyword] = useState("all");
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast({ title: "Profile not found", variant: "destructive" });
        return;
      }

      setUserType(profile.user_type);

      if (!['student', 'supervisor', 'admin'].includes(profile.user_type)) {
        toast({ title: "Access denied", variant: "destructive" });
        navigate("/");
        return;
      }

      // Run all independent queries in parallel
      const supervisorPromise = supabase.from("supervisors").select("*");
      
      const pendingPromise = supabase
        .from("pending_allocations")
        .select("*")
        .eq("supervisor_id", user!.id)
        .eq("status", "pending");

      let assignedQuery = supabase
        .from("projects")
        .select("id, title, description, department, status, similarity_score, student_id, supervisor_id, keywords")
        .not("supervisor_id", "is", null)
        .neq("status", "archived")
        .neq("status", "pending");

      if (profile.user_type === 'supervisor') {
        assignedQuery = assignedQuery.eq("supervisor_id", user!.id);
      }

      const unassignedPromise = supabase
        .from("projects")
        .select("id, title, description, department, keywords, student_id, similarity_score")
        .is("supervisor_id", null)
        .eq("status", "pending");

      const groupAllocPromise = profile.user_type === 'supervisor'
        ? supabase
            .from("group_allocations")
            .select("*", { count: 'exact', head: true })
            .eq("supervisor_id", user!.id)
            .eq("status", "pending")
        : Promise.resolve({ count: 0, error: null });

      const [supervisorRes, pendingRes, assignedRes, unassignedRes, groupAllocRes] = await Promise.all([
        supervisorPromise,
        pendingPromise,
        assignedQuery,
        unassignedPromise,
        groupAllocPromise,
      ]);

      if (supervisorRes.error) throw supervisorRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (assignedRes.error) throw assignedRes.error;
      if (unassignedRes.error) throw unassignedRes.error;

      // Collect all unique user IDs we need profiles for
      const supervisorUserIds = (supervisorRes.data || []).map(s => s.user_id);
      const pendingProjectIds = (pendingRes.data || []).map(p => p.project_id);
      
      // Fetch pending allocation projects in one query
      let pendingProjects: any[] = [];
      if (pendingProjectIds.length > 0) {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .in("id", pendingProjectIds);
        pendingProjects = data || [];
      }

      // Collect all student IDs from all project lists
      const allStudentIds = new Set<string>();
      pendingProjects.forEach(p => allStudentIds.add(p.student_id));
      (assignedRes.data || []).forEach((p: any) => allStudentIds.add(p.student_id));
      (unassignedRes.data || []).forEach((p: any) => allStudentIds.add(p.student_id));

      // Batch fetch all needed profiles in one query
      const allProfileIds = [...new Set([...supervisorUserIds, ...allStudentIds])];
      const allProfiles = allProfileIds.length > 0 ? await fetchProjectPeople(allProfileIds) : {};

      const profileMap = new Map(Object.values(allProfiles).map(p => [p.user_id, p]));

      // Build supervisors with profiles
      const supervisorsWithProfiles = (supervisorRes.data || []).map(sup => {
        const p = profileMap.get(sup.user_id);
        return {
          ...sup,
          profiles: { user_id: sup.user_id, full_name: p?.full_name || '', email: p?.email || '' }
        };
      });
      setSupervisors(supervisorsWithProfiles);

      // Build pending allocations with project + student profile
      const pendingWithDetails = (pendingRes.data || [])
        .map((allocation: any) => {
          const project = pendingProjects.find(p => p.id === allocation.project_id);
          if (!project) return null;
          const studentProfile = profileMap.get(project.student_id);
          if (!studentProfile) return null;
          return {
            ...allocation,
            projects: { ...project, profiles: studentProfile }
          };
        })
        .filter(Boolean);
      setPendingAllocations(pendingWithDetails as any);

      // Build assigned projects with student profiles
      const validAssigned = (assignedRes.data || [])
        .map((project: any) => {
          const studentProfile = profileMap.get(project.student_id);
          if (!studentProfile) return null;
          return { ...project, profiles: studentProfile };
        })
        .filter(Boolean);
      setAssignedProjects(validAssigned as any);

      // Build unassigned projects with student profiles
      const validUnassigned = (unassignedRes.data || [])
        .map((project: any) => {
          const studentProfile = profileMap.get(project.student_id);
          if (!studentProfile) return null;
          return { ...project, profiles: studentProfile };
        })
        .filter(Boolean);
      setUnassignedProjects(validUnassigned as any);

      // Set pending group allocations
      if (!groupAllocRes.error) {
        setPendingGroupAllocations(groupAllocRes.count || 0);
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAllocation = async (allocationId: string, projectId: string) => {
    try {
      // Update allocation status
      const { error: updateError } = await supabase
        .from("pending_allocations")
        .update({ status: "accepted" })
        .eq("id", allocationId);

      if (updateError) throw updateError;

      // Assign project to supervisor
      const { error: assignError } = await supabase
        .from("projects")
        .update({ supervisor_id: user!.id, status: "in_progress" })
        .eq("id", projectId);

      if (assignError) throw assignError;

      toast({ title: "Project accepted", description: "The project has been assigned to you" });
      fetchData();
    } catch (error: any) {
      console.error("Error accepting allocation:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectAllocation = async (allocationId: string) => {
    try {
      const { error } = await supabase
        .from("pending_allocations")
        .update({ status: "rejected" })
        .eq("id", allocationId);

      if (error) throw error;

      toast({ title: "Allocation rejected" });
      fetchData();
    } catch (error: any) {
      console.error("Error rejecting allocation:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleManualAssign = async (projectId: string) => {
    try {
      await callSmartAllocation({ action: 'manual_assign', projectId, supervisorId: user!.id });

      toast({ title: "Project assigned", description: "The project has been manually assigned to you" });
      fetchData();
    } catch (error: any) {
      console.error("Error assigning project:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleGenerateSuggestions = async () => {
    try {
      setGenerating(true);
      const data = await callSmartAllocation<{ allocated: number; total: number; manualReviewCount?: number; message?: string }>({ action: 'generate_suggestions' });
      const allocated = data.allocated || data.suggestions_count || 0;
      toast({ 
        title: "Smart Allocation Complete", 
        description: allocated > 0 
          ? `Queued ${allocated} project${allocated !== 1 ? 's' : ''} for matched supervisor review.`
          : data.message || 'No projects could be matched. Check supervisor availability and expertise areas.'
      });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleUnassign = async (projectId: string) => {
    try {
      await callSmartAllocation({ action: 'unassign', projectId });

      toast({ title: "Project unassigned", description: "The project is now available for reassignment" });
      fetchData();
    } catch (error: any) {
      console.error("Error unassigning project:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReassign = async () => {
    if (!selectedSupervisor || !selectedProjectForReassign) return;

    try {
      await callSmartAllocation({ 
        action: 'reassign', 
        projectId: selectedProjectForReassign,
        newSupervisorId: selectedSupervisor 
      });

      toast({ title: "Project reassigned", description: "The project has been reassigned successfully" });
      setReassignDialogOpen(false);
      setSelectedSupervisor("");
      setSelectedProjectForReassign("");
      fetchData();
    } catch (error: any) {
      console.error("Error reassigning project:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Filter functions
  const filterProject = (project: any, includeMatchScore: boolean = false) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      project.title?.toLowerCase().includes(searchLower) ||
      project.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      project.projects?.title?.toLowerCase().includes(searchLower) ||
      project.projects?.profiles?.full_name?.toLowerCase().includes(searchLower);

    const matchesDepartment = selectedDepartment === "all" || 
      project.department === selectedDepartment ||
      project.projects?.department === selectedDepartment;

    const projectKeywords = project.keywords || project.projects?.keywords || [];
    const matchesKeyword = selectedKeyword === "all" || 
      projectKeywords.includes(selectedKeyword);

    const matchScore = project.match_score || 0;
    const matchesScore = !includeMatchScore || matchScore >= minMatchScore;

    const projectStatus = project.status || "pending";
    const matchesStatus = selectedStatus === "all" || projectStatus === selectedStatus;

    return matchesSearch && matchesDepartment && matchesKeyword && matchesScore && matchesStatus;
  };

  // Apply filters to data
  const filteredPendingAllocations = pendingAllocations.filter((allocation) => 
    filterProject(allocation, true)
  );
  
  const filteredAssignedProjects = assignedProjects.filter((project) => 
    filterProject(project, false)
  );
  
  const filteredUnassignedProjects = unassignedProjects.filter((project) => 
    filterProject(project, false)
  );

  // Extract unique values for filters
  const allProjects = [...pendingAllocations.map(a => a.projects), ...assignedProjects, ...unassignedProjects];
  const departments = Array.from(new Set(allProjects.map(p => p?.department).filter(Boolean)));
  const allKeywords = allProjects.flatMap(p => p?.keywords || []);
  const keywords = Array.from(new Set(allKeywords));
  const statuses = Array.from(new Set([...assignedProjects.map(p => p.status), "pending"]));

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("all");
    setSelectedKeyword("all");
    setMinMatchScore(0);
    setSelectedStatus("all");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Back to home"
            >
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Smart Allocation</h1>
              <p className="text-muted-foreground mt-2">Intelligent project assignment system</p>
            </div>
        </div>
          {userType === 'admin' && (
            <Button onClick={handleGenerateSuggestions} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Allocating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Auto-Assign All Projects
                </>
              )}
            </Button>
          )}
        </div>

        <Tabs defaultValue={userType === 'student' ? 'groups' : 'projects'} className="w-full">
          {userType !== 'student' ? (
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="groups" className="relative">
                Groups
                {pendingGroupAllocations > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 h-5 min-w-5 rounded-full p-1 text-xs"
                  >
                    {pendingGroupAllocations}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="groups">Student Groups</TabsTrigger>
            </TabsList>
          )}

          {userType !== 'student' && (
            <TabsContent value="projects" className="space-y-8 mt-6">
              {/* Filters */}
              <AllocationFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
                selectedKeyword={selectedKeyword}
                setSelectedKeyword={setSelectedKeyword}
                minMatchScore={minMatchScore}
                setMinMatchScore={setMinMatchScore}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                departments={departments}
                keywords={keywords}
                statuses={statuses}
                onClearAll={handleClearFilters}
              />

        {/* Pending Allocations */}
        {filteredPendingAllocations.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Pending Suggestions ({filteredPendingAllocations.length}
              {filteredPendingAllocations.length !== pendingAllocations.length && ` of ${pendingAllocations.length}`})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPendingAllocations.map((allocation) => (
                <Card key={allocation.id} className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{allocation.projects.title}</CardTitle>
                      <Badge variant="secondary">{allocation.match_score}% Match</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {allocation.projects.description}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Student:</span>
                        <span className="font-medium">{allocation.projects.profiles.full_name || allocation.projects.profiles.email || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Department:</span>
                        <span className="font-medium">{allocation.projects.department}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Match Reason:</span>
                        <p className="text-xs mt-1">{allocation.match_reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptAllocation(allocation.id, allocation.project_id)}
                        className="flex-1"
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleRejectAllocation(allocation.id)}
                        variant="outline"
                        className="flex-1"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Assigned Projects Dashboard */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {userType === 'admin' ? 'All Assigned Projects' : 'My Supervised Projects'} ({filteredAssignedProjects.length}
            {filteredAssignedProjects.length !== assignedProjects.length && ` of ${assignedProjects.length}`})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssignedProjects.map((project) => {
              const supervisor = supervisors.find(s => s.user_id === project.supervisor_id);
              return (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <Badge variant="outline">{project.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Student:</span>
                        <span className="font-medium">{project.profiles.full_name || project.profiles.email || 'Unknown'}</span>
                      </div>
                      {userType === 'admin' && supervisor && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Supervisor:</span>
                          <span className="font-medium">{supervisor.profiles.full_name || supervisor.profiles.email || 'Unknown'}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Department:</span>
                        <span className="font-medium">{project.department}</span>
                      </div>
                      {project.similarity_score > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Similarity Score:</span>
                          <Badge variant={project.similarity_score > 70 ? "destructive" : "secondary"}>
                            {project.similarity_score}%
                          </Badge>
                        </div>
                      )}
                    </div>
                    {userType === 'admin' && (
                      <div className="flex gap-2 pt-2">
                        <Dialog open={reassignDialogOpen && selectedProjectForReassign === project.id} onOpenChange={(open) => {
                          setReassignDialogOpen(open);
                          if (!open) {
                            setSelectedProjectForReassign("");
                            setSelectedSupervisor("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => setSelectedProjectForReassign(project.id)}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reassign
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reassign Project</DialogTitle>
                              <DialogDescription>
                                Select a new supervisor for "{project.title}"
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select supervisor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {supervisors.map((sup) => (
                                    <SelectItem key={sup.id} value={sup.user_id}>
                                      {sup.profiles.full_name} ({sup.current_projects}/{sup.max_projects} projects)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button onClick={handleReassign} disabled={!selectedSupervisor} className="w-full">
                                Confirm Reassignment
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          onClick={() => handleUnassign(project.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Manual Selection */}
        {filteredUnassignedProjects.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Available Projects ({filteredUnassignedProjects.length}
              {filteredUnassignedProjects.length !== unassignedProjects.length && ` of ${unassignedProjects.length}`})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredUnassignedProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Student:</span>
                        <span className="font-medium">{project.profiles.full_name || project.profiles.email || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Department:</span>
                        <span className="font-medium">{project.department}</span>
                      </div>
                      {project.keywords && project.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.keywords.slice(0, 3).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {userType === 'supervisor' ? (
                      <Button
                        onClick={() => handleManualAssign(project.id)}
                        className="w-full"
                        size="sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Supervise This Project
                      </Button>
                    ) : userType === 'admin' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            onClick={() => setSelectedProjectForReassign(project.id)}
                            className="w-full"
                            size="sm"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Supervisor
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Supervisor</DialogTitle>
                            <DialogDescription>
                              Select a supervisor for "{project.title}"
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supervisor" />
                              </SelectTrigger>
                              <SelectContent>
                                {supervisors.map((sup) => (
                                  <SelectItem key={sup.id} value={sup.user_id}>
                                    {sup.profiles.full_name} ({sup.current_projects}/{sup.max_projects} projects)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              onClick={() => {
                                if (selectedSupervisor && project.id) {
                                  callSmartAllocation({ action: 'manual_assign', projectId: project.id, supervisorId: selectedSupervisor }).then(() => {
                                    toast({ title: "Supervisor assigned successfully" });
                                    setSelectedSupervisor("");
                                    fetchData();
                                  }).catch((err: any) => {
                                    toast({ title: "Error", description: err.message, variant: "destructive" });
                                  });
                                }
                              }} 
                              disabled={!selectedSupervisor} 
                              className="w-full"
                            >
                              Confirm Assignment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
            </TabsContent>
          )}

          <TabsContent value="groups" className="space-y-8 mt-6">
            <GroupManagement />
          </TabsContent>

          {userType !== 'student' && (
            <TabsContent value="supervisors" className="space-y-8 mt-6">
              <SupervisorList supervisors={supervisors} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}