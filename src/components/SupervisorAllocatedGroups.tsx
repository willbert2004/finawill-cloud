import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Mail, FolderKanban, ChevronDown, ChevronRight } from "lucide-react";

interface AllocatedProject {
  id: string;
  title: string;
  status: string;
  description: string;
  objectives?: string;
  department?: string;
  student_id: string;
  keywords?: string[];
  created_at: string;
}

interface StudentInfo {
  user_id: string;
  full_name: string;
  email: string;
  department?: string;
  school?: string;
}

interface GroupWithMembers {
  id: string;
  name: string;
  department?: string;
  description?: string;
  members: { full_name: string; reg_number?: string; student_id?: string }[];
}

export function SupervisorAllocatedGroups() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<AllocatedProject[]>([]);
  const [students, setStudents] = useState<Record<string, StudentInfo>>({});
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        // Get projects allocated to this supervisor
        const { data: projectsData } = await supabase
          .from("projects")
          .select("id, title, status, description, objectives, department, student_id, keywords, created_at")
          .eq("supervisor_id", user.id)
          .order("created_at", { ascending: false });

        setProjects(projectsData || []);

        // Get student profiles for all allocated projects
        const studentIds = [...new Set((projectsData || []).map(p => p.student_id))];
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, department, school")
            .in("user_id", studentIds);
          const map: Record<string, StudentInfo> = {};
          profiles?.forEach(p => { map[p.user_id] = p as StudentInfo; });
          setStudents(map);
        }

        // Get student groups where members are students allocated to this supervisor
        const { data: allGroups } = await supabase
          .from("student_groups")
          .select("id, name, department, description");

        if (allGroups && allGroups.length > 0) {
          const { data: members } = await supabase
            .from("group_members")
            .select("group_id, full_name, reg_number, student_id");

          const groupMap: GroupWithMembers[] = (allGroups || [])
            .map(g => ({
              ...g,
              members: (members || []).filter(m => m.group_id === g.id),
            }))
            .filter(g => g.members.some(m => m.student_id && studentIds.includes(m.student_id)));

          setGroups(groupMap);
        }
      } catch (e) {
        console.error("Error fetching supervisor data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success/10 text-success border-success/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      case "in_progress": return "bg-primary/10 text-primary border-primary/30";
      case "finalized": return "bg-emerald-600/10 text-emerald-600 border-emerald-600/30";
      case "completed": return "bg-secondary/10 text-secondary border-secondary/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            My Allocated Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No projects allocated to you yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Allocated Projects with Student Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            My Allocated Projects ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {projects.map((project) => {
            const student = students[project.student_id];
            const isExpanded = expandedProject === project.id;
            return (
              <div
                key={project.id}
                className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
              >
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium truncate">{project.title}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${statusColor(project.status)}`}>
                    {project.status.replace("_", " ")}
                  </Badge>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t bg-accent/20">
                    {project.objectives && (
                      <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                        <p className="text-xs font-semibold text-primary mb-1">📌 Objectives</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.objectives}</p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    {project.department && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Department:</span> {project.department}
                      </p>
                    )}
                    {project.keywords && project.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.keywords.map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                        ))}
                      </div>
                    )}
                    {student && (
                      <div className="bg-card border rounded-lg p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Student Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">{student.full_name || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            <a href={`mailto:${student.email}`} className="text-primary hover:underline text-xs">
                              {student.email}
                            </a>
                          </div>
                          {student.department && (
                            <p className="text-xs text-muted-foreground">Dept: {student.department}</p>
                          )}
                          {student.school && (
                            <p className="text-xs text-muted-foreground">School: {student.school}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Allocated Student Groups */}
      {groups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Student Groups ({groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{group.name}</span>
                  {group.department && (
                    <Badge variant="outline" className="text-[10px]">{group.department}</Badge>
                  )}
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                )}
                <div className="space-y-1">
                  {group.members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{m.full_name || "Unknown"}</span>
                      {m.reg_number && <span className="text-[10px]">({m.reg_number})</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
