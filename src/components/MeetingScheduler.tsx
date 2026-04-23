import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Video, CalendarIcon, Clock, Plus, Users, ExternalLink, Trash2, Loader2, Phone
} from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  group_id: string;
  group_name?: string;
}

interface Group {
  id: string;
  name: string;
  allocated?: boolean;
}

interface Student {
  user_id: string;
  full_name: string | null;
  email: string;
  department: string | null;
}

export function MeetingScheduler() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisorDept, setSupervisorDept] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [audienceType, setAudienceType] = useState<"group" | "student">("group");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [duration, setDuration] = useState("30");

  useEffect(() => {
    if (!user) return;
    fetchData();

    const channel = supabase
      .channel('meetings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Get supervisor's department first
      const { data: supProfile } = await supabase
        .from("profiles")
        .select("department")
        .eq("user_id", user.id)
        .maybeSingle();
      const dept = supProfile?.department || null;
      setSupervisorDept(dept);

      const [{ data: meetingsData }, { data: allocations }, { data: allGroups }, studentsRes] = await Promise.all([
        supabase
          .from("meetings")
          .select("*")
          .eq("supervisor_id", user.id)
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("group_allocations")
          .select("group_id")
          .eq("supervisor_id", user.id)
          .eq("status", "accepted"),
        supabase
          .from("student_groups")
          .select("id, name")
          .order("name", { ascending: true }),
        dept
          ? supabase
              .from("profiles")
              .select("user_id, full_name, email, department")
              .eq("user_type", "student")
              .eq("department", dept)
              .order("full_name", { ascending: true })
          : supabase
              .from("profiles")
              .select("user_id, full_name, email, department")
              .eq("user_type", "student")
              .order("full_name", { ascending: true }),
      ]);

      const allocatedIds = new Set((allocations || []).map((a: any) => a.group_id));
      const groupList: Group[] = (allGroups || [])
        .map((g: any) => ({ id: g.id, name: g.name, allocated: allocatedIds.has(g.id) }))
        .sort((a, b) => Number(b.allocated) - Number(a.allocated));
      setGroups(groupList);
      setStudents((studentsRes.data || []) as Student[]);

      const enriched = (meetingsData || []).map((m: any) => ({
        ...m,
        group_name: groupList.find(g => g.id === m.group_id)?.name || (m.student_id ? "Individual student" : "Unknown Group"),
      }));
      setMeetings(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!user || !title || !meetingLink || !selectedDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (audienceType === "group" && !selectedGroup) {
      toast.error("Please select a group");
      return;
    }
    if (audienceType === "student" && !selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    setSubmitting(true);
    try {
      let rows: any[] = [];
      const baseRow = {
        supervisor_id: user.id,
        title,
        description: description || null,
        meeting_link: meetingLink,
        meeting_date: selectedDate.toISOString().split('T')[0],
        meeting_time: selectedTime,
      };

      if (audienceType === "group") {
        const targetGroupIds = selectedGroup === "__all__"
          ? groups.map(g => g.id)
          : [selectedGroup];
        if (targetGroupIds.length === 0) {
          toast.error("No groups available to schedule");
          setSubmitting(false);
          return;
        }
        rows = targetGroupIds.map(gid => ({ ...baseRow, group_id: gid }));
      } else {
        const targetStudentIds = selectedStudent === "__all_dept__"
          ? students.map(s => s.user_id)
          : [selectedStudent];
        if (targetStudentIds.length === 0) {
          toast.error("No students found in your department");
          setSubmitting(false);
          return;
        }
        rows = targetStudentIds.map(sid => ({ ...baseRow, student_id: sid }));
      }

      const { error } = await supabase.from("meetings").insert(rows as any);

      if (error) throw error;
      toast.success(
        rows.length > 1
          ? `Meeting scheduled for ${rows.length} ${audienceType === "group" ? "groups" : "students"}!`
          : "Meeting scheduled! Notification sent."
      );
      resetForm();
      setDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to schedule meeting: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from("meetings").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error("Failed to cancel meeting");
    else toast.success("Meeting cancelled");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) toast.error("Failed to delete meeting");
    else toast.success("Meeting deleted");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMeetingLink("");
    setSelectedGroup("");
    setSelectedStudent("");
    setAudienceType("group");
    setSelectedDate(undefined);
    setSelectedTime("10:00");
    setDuration("30");
  };

  const upcomingMeetings = meetings.filter(m => m.status === "scheduled" && new Date(m.scheduled_at) >= new Date());
  const pastMeetings = meetings.filter(m => m.status !== "scheduled" || new Date(m.scheduled_at) < new Date());

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const h = Math.floor(i / 2) + 8;
    const m = i % 2 === 0 ? "00" : "30";
    return `${h.toString().padStart(2, "0")}:${m}`;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-sm">
            <Video className="h-4 w-4 text-primary-foreground" />
          </div>
          <CardTitle className="text-lg">Meetings & Calls</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {groups.length > 0 && (
            <Select onValueChange={(groupId) => navigate(`/video-call?group=${groupId}`)}>
              <SelectTrigger className="w-auto h-8 text-xs gap-1">
                <Phone className="h-3.5 w-3.5" />
                <SelectValue placeholder="Instant Call" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {g.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Schedule
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Schedule Google Meet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Meeting Title *</Label>
                <Input placeholder="e.g. Weekly Progress Review" value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div>
                <Label>Meet with *</Label>
                <div className="flex gap-1 mb-2 p-1 rounded-md bg-muted">
                  <button
                    type="button"
                    onClick={() => setAudienceType("group")}
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 rounded transition-colors",
                      audienceType === "group" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Users className="h-3 w-3 inline mr-1" /> Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceType("student")}
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 rounded transition-colors",
                      audienceType === "student" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Users className="h-3 w-3 inline mr-1" /> Student{supervisorDept ? ` (${supervisorDept})` : ""}
                  </button>
                </div>

                {audienceType === "group" ? (
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a group" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {groups.length === 0 ? (
                        <SelectItem value="none" disabled>No student groups available</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="__all__">
                            <span className="flex items-center gap-2 font-medium">
                              <Users className="h-3 w-3" /> All Groups ({groups.length})
                            </span>
                          </SelectItem>
                          {groups.map(g => (
                            <SelectItem key={g.id} value={g.id}>
                              <span className="flex items-center gap-2">
                                <Users className="h-3 w-3" /> {g.name}
                                {g.allocated && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-success/40 text-success">
                                    Allocated
                                  </Badge>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder={supervisorDept ? `Choose a student in ${supervisorDept}` : "Choose a student"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {students.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No students found{supervisorDept ? ` in ${supervisorDept}` : ""}
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="__all_dept__">
                            <span className="flex items-center gap-2 font-medium">
                              <Users className="h-3 w-3" /> All students{supervisorDept ? ` in ${supervisorDept}` : ""} ({students.length})
                            </span>
                          </SelectItem>
                          {students.map(s => (
                            <SelectItem key={s.user_id} value={s.user_id}>
                              <span className="flex items-center gap-2">
                                {s.full_name || s.email}
                                <span className="text-[10px] text-muted-foreground">{s.email}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {audienceType === "student" && !supervisorDept && (
                  <p className="text-[11px] text-warning mt-1">
                    Set your department in your profile to filter students by department.
                  </p>
                )}
              </div>

              <div>
                <Label>Google Meet Link *</Label>
                <div className="flex gap-2">
                  <Input placeholder="https://meet.google.com/xxx-xxxx-xxx" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => window.open("https://meet.new", "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Create
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Click "Create" to open Google Meet, then paste the link here.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Time *</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Textarea placeholder="Agenda or notes for the meeting..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>

              <Button className="w-full" onClick={handleSchedule} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Video className="h-4 w-4 mr-2" />}
                Schedule & Notify Students
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upcoming Meetings */}
        {upcomingMeetings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No upcoming meetings. Schedule one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
            {upcomingMeetings.map(m => (
              <div key={m.id} className="group p-4 rounded-xl border bg-card hover:border-primary/20 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-semibold text-sm text-foreground">{m.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {m.group_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" /> {format(new Date(m.scheduled_at), "PPP")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {format(new Date(m.scheduled_at), "HH:mm")} · {m.duration_minutes}min
                      </span>
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="default" className="gap-1" onClick={() => navigate(`/video-call?meeting=${m.id}`)}>
                      <Phone className="h-3.5 w-3.5" /> Call
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={m.meeting_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleCancel(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past / Cancelled */}
        {pastMeetings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past / Cancelled</p>
            {pastMeetings.slice(0, 3).map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 opacity-60">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.group_name} · {format(new Date(m.scheduled_at), "PPP HH:mm")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{m.status === "cancelled" ? "Cancelled" : "Past"}</Badge>
                  <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => handleDelete(m.id)}>
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
}
