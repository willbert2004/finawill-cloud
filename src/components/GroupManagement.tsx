import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, Plus, Loader2, Check, X, Sparkles, Trash2, Mail, Phone, Clock, MapPin, Building2 } from "lucide-react";
import MilestoneProgress from "./MilestoneProgress";

interface Student {
  id: string;
  user_id: string;
  student_number?: string;
  department?: string;
  year_of_study?: number;
  profiles: { user_id: string; full_name: string; email: string };
}

interface StudentGroup {
  id: string; name: string; description: string; department: string;
  created_at: string; member_count?: number;
  group_members?: Array<{ id: string; student_id: string | null; full_name: string | null; reg_number: string | null; joined_at: string }>;
}

interface GroupAllocation {
  id: string; group_id: string; supervisor_id: string; match_score: number;
  match_reason: string; status: string;
  student_groups: { id: string; name: string; department: string; group_members?: any[] };
  profiles: { full_name: string; email: string; phone_number?: string; department?: string; office_hours?: string; research_areas?: string[] };
}

interface GroupMember { full_name: string; reg_number: string; }

export default function GroupManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [groupAllocations, setGroupAllocations] = useState<GroupAllocation[]>([]);
  const [supervisedGroups, setSupervisedGroups] = useState<GroupAllocation[]>([]);
  const [acceptedAllocations, setAcceptedAllocations] = useState<GroupAllocation[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupDepartment, setGroupDepartment] = useState("");
  const [projectType, setProjectType] = useState("");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRegNumber, setNewMemberRegNumber] = useState("");
  const [userType, setUserType] = useState<string>("");
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberRegNumber, setEditMemberRegNumber] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase.from('profiles').select('user_type').eq('user_id', user.id).single();
      const fetchedUserType = profile?.user_type || '';
      setUserType(fetchedUserType);

      // Fetch students
      const { data: studentsData } = await supabase.from("students").select("*");
      const studentUserIds = (studentsData || []).map(s => s.user_id);
      const { data: profilesData } = studentUserIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", studentUserIds)
        : { data: [] };
      const studentsWithProfiles = (studentsData || []).map(student => ({
        ...student,
        profiles: profilesData?.find(p => p.user_id === student.user_id) || { user_id: student.user_id, full_name: '', email: '' }
      }));
      setStudents(studentsWithProfiles);

      // Fetch groups
      let groupsQuery = supabase.from("student_groups").select(`*, group_members (id, student_id, full_name, reg_number, joined_at)`);
      if (fetchedUserType === 'student') groupsQuery = groupsQuery.eq("created_by", user.id);
      const { data: groupsData, error: groupsError } = await groupsQuery;
      if (groupsError) throw groupsError;
      const groupsWithCount = (groupsData || []).map((group: any) => ({
        ...group, member_count: group.group_members?.length || 0,
      }));
      setGroups(groupsWithCount);

      // Fetch pending group allocations
      let allocationsQuery = supabase.from("group_allocations").select("*, student_groups(name, department)").eq("status", "pending");
      if (fetchedUserType === 'supervisor') {
        allocationsQuery = allocationsQuery.eq("supervisor_id", user.id);
      } else if (fetchedUserType === 'student') {
        const studentGroupIds = groupsWithCount.map(g => g.id);
        if (studentGroupIds.length > 0) {
          allocationsQuery = allocationsQuery.in("group_id", studentGroupIds);
        } else {
          setGroupAllocations([]);
          setAcceptedAllocations([]);
          setSupervisedGroups([]);
          return;
        }
      }

      const { data: allocationsData } = await allocationsQuery;
      const allocationsWithDetails = await Promise.all((allocationsData || []).map(async (allocation: any) => {
        const { data: supervisor } = await supabase.from("profiles")
          .select("full_name, email, phone_number, department, office_hours, research_areas")
          .eq("user_id", allocation.supervisor_id).maybeSingle();
        return { ...allocation, profiles: supervisor || { full_name: 'Unknown Supervisor', email: '' } };
      }));
      setGroupAllocations(allocationsWithDetails as any);

      // Accepted allocations for students
      if (fetchedUserType === 'student') {
        const studentGroupIds = groupsWithCount.map(g => g.id);
        if (studentGroupIds.length > 0) {
          const { data: acceptedData } = await supabase.from("group_allocations")
            .select("*, student_groups(id, name, department)")
            .in("group_id", studentGroupIds).eq("status", "accepted");
          const acceptedWithDetails = await Promise.all((acceptedData || []).map(async (allocation: any) => {
            const { data: supervisor } = await supabase.from("profiles")
              .select("full_name, email, phone_number, department, office_hours, research_areas")
              .eq("user_id", allocation.supervisor_id).maybeSingle();
            return { ...allocation, profiles: supervisor || { full_name: 'Unknown Supervisor', email: '' } };
          }));
          setAcceptedAllocations(acceptedWithDetails as any);
        }
      }

      // Supervised groups for supervisors
      if (fetchedUserType === 'supervisor') {
        const { data: supervisedData } = await supabase.from("group_allocations")
          .select("*, student_groups(id, name, department)")
          .eq("supervisor_id", user.id).eq("status", "accepted");
        const supervisedWithDetails = await Promise.all((supervisedData || []).map(async (allocation: any) => {
          const { data: members } = await supabase.from("group_members")
            .select("id, student_id, full_name, reg_number, joined_at").eq("group_id", allocation.group_id);
          const membersWithContact = await Promise.all((members || []).map(async (member: any) => {
            if (member.student_id) {
              const { data: memberProfile } = await supabase.from("profiles")
                .select("email, phone_number").eq("user_id", member.student_id).maybeSingle();
              return { ...member, email: memberProfile?.email, phone_number: (memberProfile as any)?.phone_number };
            }
            return member;
          }));
          const { data: groupData } = await supabase.from("student_groups").select("created_by").eq("id", allocation.group_id).maybeSingle();
          let creatorProfile = null;
          if (groupData?.created_by) {
            const { data: cp } = await supabase.from("profiles").select("full_name, email, phone_number").eq("user_id", groupData.created_by).maybeSingle();
            creatorProfile = cp;
          }
          return {
            ...allocation,
            student_groups: { ...allocation.student_groups, group_members: membersWithContact, creator: creatorProfile },
            profiles: { full_name: '', email: '' }
          };
        }));
        setSupervisedGroups(supervisedWithDetails as any);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    }
  };

  const addGroupMember = () => {
    if (!newMemberName.trim() || !newMemberRegNumber.trim()) {
      toast({ title: "Both name and registration number are required", variant: "destructive" }); return;
    }
    if (newMemberName.length > 100) { toast({ title: "Name must be less than 100 characters", variant: "destructive" }); return; }
    const regPattern = /^H\d{6}[A-Za-z]$/;
    if (!regPattern.test(newMemberRegNumber.trim())) {
      toast({ title: "Invalid registration number", description: "Must be 8 characters: starts with H, followed by 6 digits, ends with a letter (e.g. H2345678A)", variant: "destructive" }); return;
    }
    const isDuplicate = groupMembers.some(m => m.reg_number.toLowerCase() === newMemberRegNumber.trim().toLowerCase());
    if (isDuplicate) { toast({ title: "Duplicate registration number", variant: "destructive" }); return; }
    setGroupMembers([...groupMembers, { full_name: newMemberName.trim(), reg_number: newMemberRegNumber.trim() }]);
    setNewMemberName(""); setNewMemberRegNumber("");
  };

  const removeGroupMember = (index: number) => { setGroupMembers(groupMembers.filter((_, i) => i !== index)); };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast({ title: "Group name is required", variant: "destructive" }); return; }
    if (groupName.length > 100) { toast({ title: "Group name must be less than 100 characters", variant: "destructive" }); return; }
    if (groupMembers.length === 0) { toast({ title: "Please add at least one group member", variant: "destructive" }); return; }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert group directly (bypass edge function for students to avoid auth issues)
      const { data: group, error: groupError } = await supabase
        .from('student_groups')
        .insert({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          department: groupDepartment.trim() || null,
          project_type: projectType || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Insert group members
      const memberInserts = groupMembers.map(m => ({
        group_id: group.id,
        full_name: m.full_name,
        reg_number: m.reg_number,
      }));

      const { error: membersError } = await supabase.from('group_members').insert(memberInserts);
      if (membersError) throw membersError;

      toast({ title: "Group created successfully", description: `${groupMembers.length} member(s) added to "${groupName.trim()}"` });
      setCreateDialogOpen(false);
      setGroupName(""); setGroupDescription(""); setGroupDepartment("");
      setProjectType(""); setGroupMembers([]); setSelectedStudents([]);
      fetchData();
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({ title: "Error creating group", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleAllocateGroup = async (groupId: string) => {
    try {
      const { error } = await supabase.functions.invoke('smart-allocation', {
        body: { action: 'allocate_group', groupId }
      });
      if (error) throw error;
      toast({ title: "Allocation suggestion created", description: "Supervisor has been notified" });
      fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const handleAcceptAllocation = async (allocationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('smart-allocation', {
        body: { action: 'accept_group_allocation', allocationId }
      });
      if (error) throw error;
      toast({ title: "Group allocation accepted" }); fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const handleRejectAllocation = async (allocationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('smart-allocation', {
        body: { action: 'reject_group_allocation', allocationId }
      });
      if (error) throw error;
      toast({ title: "Group allocation rejected" }); fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // Delete members first, then the group
      await supabase.from('group_members').delete().eq('group_id', groupId);
      await supabase.from('group_allocations').delete().eq('group_id', groupId);
      const { error } = await supabase.from('student_groups').delete().eq('id', groupId);
      if (error) throw error;
      toast({ title: "Group deleted successfully" });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddMemberToExistingGroup = async () => {
    if (!editGroupId) return;
    if (!editMemberName.trim() || !editMemberRegNumber.trim()) {
      toast({ title: "Both name and registration number are required", variant: "destructive" }); return;
    }
    const regPattern = /^H\d{6}[A-Za-z]$/;
    if (!regPattern.test(editMemberRegNumber.trim())) {
      toast({ title: "Invalid registration number", description: "Must be 8 characters: starts with H, followed by 6 digits, ends with a letter (e.g. H2345678A)", variant: "destructive" }); return;
    }
    const currentGroup = groups.find(g => g.id === editGroupId);
    const isDuplicate = currentGroup?.group_members?.some(
      member => member.reg_number?.toLowerCase() === editMemberRegNumber.trim().toLowerCase()
    );
    if (isDuplicate) { toast({ title: "Duplicate member", variant: "destructive" }); return; }

    try {
      setLoading(true);
      const { error } = await supabase.from('group_members').insert({
        group_id: editGroupId, full_name: editMemberName.trim(), reg_number: editMemberRegNumber.trim()
      });
      if (error) throw error;
      toast({ title: "Member added successfully" });
      setEditGroupId(null); setEditMemberName(""); setEditMemberRegNumber("");
      fetchData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const createGroupDialog = (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Create Group</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Create Student Group</DialogTitle>
          <DialogDescription>Create a new group and add members</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="groupName">Group Name *</Label>
            <Input id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="groupDescription">Description</Label>
            <Textarea id="groupDescription" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Enter group description" />
          </div>
          <div>
            <Label htmlFor="groupDepartment">Department</Label>
            <Input id="groupDepartment" value={groupDepartment} onChange={(e) => setGroupDepartment(e.target.value)} placeholder="Enter department" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="projectType">Project Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger id="projectType"><SelectValue placeholder="Select project type" /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Mobile App">Mobile App</SelectItem>
                <SelectItem value="Machine Learning">Machine Learning</SelectItem>
                <SelectItem value="Web App">Web App</SelectItem>
                <SelectItem value="AI">AI</SelectItem>
                <SelectItem value="IoT">IoT</SelectItem>
                <SelectItem value="Data Science">Data Science</SelectItem>
                <SelectItem value="Blockchain">Blockchain</SelectItem>
                <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4">
            <Label>Add Group Members</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input placeholder="Full Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGroupMember()} autoComplete="off" />
              </div>
              <div className="flex-1">
                <Input placeholder="Registration Number" value={newMemberRegNumber} onChange={(e) => setNewMemberRegNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGroupMember()} autoComplete="off" />
              </div>
              <Button type="button" onClick={addGroupMember} variant="outline"><Plus className="h-4 w-4" /></Button>
            </div>
            {groupMembers.length > 0 && (
              <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                {groupMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-accent rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">Reg: {member.reg_number}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeGroupMember(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground">{groupMembers.length} member(s) added</p>
          </div>
          <Button onClick={handleCreateGroup} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-8">
      {/* Urgent Banner for Pending Allocations */}
      {userType === 'supervisor' && groupAllocations.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white rounded-full p-2"><Users className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold text-lg">Action Required!</h3>
              <p className="text-muted-foreground">You have {groupAllocations.length} student group{groupAllocations.length === 1 ? '' : 's'} waiting for your approval</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Group Allocations */}
      {groupAllocations.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {userType === 'supervisor' ? 'Groups Requesting Supervision' : 'Pending Group Allocations'} ({groupAllocations.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupAllocations.map((allocation) => (
              <Card key={allocation.id} className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{allocation.student_groups.name}</CardTitle>
                    <Badge variant="secondary">{allocation.match_score}% Match</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Supervisor:</span>
                      <span className="font-medium">{allocation.profiles.full_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{allocation.student_groups.department}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Match Reason:</span>
                      <p className="text-xs mt-1">{allocation.match_reason}</p>
                    </div>
                  </div>
                  {userType === 'supervisor' && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleAcceptAllocation(allocation.id)} className="flex-1" size="sm">
                        <Check className="h-4 w-4 mr-1" />Accept
                      </Button>
                      <Button onClick={() => handleRejectAllocation(allocation.id)} variant="outline" className="flex-1" size="sm">
                        <X className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                  {userType === 'student' && (
                    <Badge variant="outline" className="w-full justify-center">Waiting for supervisor response</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Assigned Supervisor Details - for students */}
      {userType === 'student' && acceptedAllocations.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">My Supervisor{acceptedAllocations.length > 1 ? 's' : ''} ({acceptedAllocations.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {acceptedAllocations.map((allocation) => (
              <Card key={allocation.id} className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{allocation.profiles.full_name}</CardTitle>
                    <Badge variant="default">Assigned</Badge>
                  </div>
                  <CardDescription>Supervising: {allocation.student_groups.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span>{allocation.profiles.email}</span></div>
                    {allocation.profiles.phone_number && <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{allocation.profiles.phone_number}</span></div>}
                    {allocation.profiles.department && <div className="flex items-center gap-2 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span>{allocation.profiles.department}</span></div>}
                    {allocation.profiles.office_hours && <div className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span>Office Hours: {allocation.profiles.office_hours}</span></div>}
                    {allocation.profiles.research_areas && allocation.profiles.research_areas.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs text-muted-foreground">Research Areas:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {allocation.profiles.research_areas.map((area: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{area}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Supervised Groups Section - for supervisors */}
      {userType === 'supervisor' && supervisedGroups.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">My Supervised Groups ({supervisedGroups.length})</h2>
          <div className="grid gap-6">
            {supervisedGroups.map((allocation) => (
              <Card key={allocation.id} className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{allocation.student_groups.name}</CardTitle>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <CardDescription>Department: {allocation.student_groups.department} • Match: {Number(allocation.match_score).toFixed(1)}%</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{allocation.student_groups.department}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Match Score:</span>
                      <Badge variant="secondary">{allocation.match_score}%</Badge>
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Members:</span>
                        <Badge variant="secondary">{allocation.student_groups.group_members?.length || 0}</Badge>
                      </div>
                      {allocation.student_groups.group_members && allocation.student_groups.group_members.length > 0 ? (
                        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                          {allocation.student_groups.group_members.map((member: any) => (
                            <div key={member.id} className="text-sm p-2 rounded-md bg-muted/50 space-y-0.5">
                              <p className="font-medium">{member.full_name}{member.reg_number && ` (${member.reg_number})`}</p>
                              {member.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {member.email}</div>}
                              {member.phone_number && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {member.phone_number}</div>}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground mt-1">No members</p>}
                      {(allocation.student_groups as any).creator && (
                        <div className="mt-3 pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Group Leader:</p>
                          <div className="text-sm space-y-0.5">
                            <p className="font-medium">{(allocation.student_groups as any).creator.full_name}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {(allocation.student_groups as any).creator.email}</div>
                            {(allocation.student_groups as any).creator.phone_number && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {(allocation.student_groups as any).creator.phone_number}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <MilestoneProgress groupId={allocation.student_groups.id} isSupervisor={true} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Student Groups */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Student Groups ({groups.length})</h2>
          {(userType === 'student' || userType === 'admin') && createGroupDialog}
        </div>
        
        {groups.length === 0 && userType === 'student' && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">You haven't created any groups yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Create Your First Group
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />{group.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.description && <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>}
                <div className="space-y-2">
                  <div className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Members:</span>
                      <Badge variant="secondary">{group.member_count}</Badge>
                    </div>
                    {group.group_members && group.group_members.length > 0 ? (
                      <div className="space-y-1 mt-2">
                        {group.group_members.map((member: any) => (
                          <div key={member.id} className="text-sm text-foreground">
                            • {member.full_name}{member.reg_number && ` (${member.reg_number})`}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground mt-1">No members yet</p>}
                  </div>
                  {group.department && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{group.department}</span>
                    </div>
                  )}
                </div>
                
                {(userType === 'student' || userType === 'admin') && (
                  <div className="pt-2 border-t">
                    <Dialog open={editGroupId === group.id} onOpenChange={(open) => {
                      if (!open) { setEditGroupId(null); setEditMemberName(""); setEditMemberRegNumber(""); }
                    }}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setEditGroupId(group.id)} variant="outline" size="sm" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />Add Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Member to {group.name}</DialogTitle>
                          <DialogDescription>Enter the member's details to add them to this group.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-member-name">Full Name</Label>
                            <Input id="edit-member-name" value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)} placeholder="Enter full name" />
                          </div>
                          <div>
                            <Label htmlFor="edit-member-reg">Registration Number</Label>
                            <Input id="edit-member-reg" value={editMemberRegNumber} onChange={(e) => setEditMemberRegNumber(e.target.value)} placeholder="Enter registration number" />
                          </div>
                          <Button onClick={handleAddMemberToExistingGroup} disabled={loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}Add Member
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                <div className="flex gap-2">
                  {(userType === 'student' || userType === 'admin') && (
                    <Button onClick={() => handleAllocateGroup(group.id)} className="flex-1" size="sm">
                      <Sparkles className="h-4 w-4 mr-2" />Allocate to Supervisor
                    </Button>
                  )}
                  {(userType === 'student' || userType === 'admin' || userType === 'supervisor') && (
                    <Button onClick={() => handleDeleteGroup(group.id)} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
