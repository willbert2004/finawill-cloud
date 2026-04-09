import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, MapPin, Building, BookOpen, Clock } from "lucide-react";

interface SupervisorInfo {
  full_name: string;
  email: string;
  department?: string;
  school?: string;
  office_location?: string;
  research_areas?: string[];
  office_hours?: string;
  current_projects?: number;
  max_projects?: number;
}

export function StudentSupervisorDetails() {
  const { user } = useAuth();
  const [supervisors, setSupervisors] = useState<SupervisorInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const { data: projects } = await supabase
          .from("projects")
          .select("supervisor_id")
          .eq("student_id", user.id)
          .not("supervisor_id", "is", null);

        const supervisorIds = [...new Set((projects || []).map(p => p.supervisor_id).filter(Boolean))] as string[];
        if (supervisorIds.length === 0) { setLoading(false); return; }

        const [{ data: profiles }, { data: supDetails }] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, email, department, school, office_hours").in("user_id", supervisorIds),
          supabase.from("supervisors").select("user_id, office_location, research_areas, current_projects, max_projects, department").in("user_id", supervisorIds),
        ]);

        const result: SupervisorInfo[] = supervisorIds.map(sid => {
          const prof = (profiles || []).find(p => p.user_id === sid);
          const det = (supDetails || []).find(d => d.user_id === sid);
          return {
            full_name: prof?.full_name || "Unknown",
            email: prof?.email || "",
            department: det?.department || prof?.department || undefined,
            school: prof?.school || undefined,
            office_location: det?.office_location || undefined,
            research_areas: det?.research_areas || undefined,
            office_hours: prof?.office_hours || undefined,
            current_projects: det?.current_projects ?? undefined,
            max_projects: det?.max_projects ?? undefined,
          };
        });

        setSupervisors(result);
      } catch (e) {
        console.error("Error fetching supervisor details:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (supervisors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            My Supervisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No supervisor assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {supervisors.length === 1 ? "My Supervisor" : `My Supervisors (${supervisors.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {supervisors.map((sup, idx) => (
          <div key={idx} className="border rounded-xl p-4 space-y-3 bg-accent/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-gradient-to-br from-primary to-primary-light">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{sup.full_name}</p>
                <a href={`mailto:${sup.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {sup.email}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sup.department && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span>{sup.department}</span>
                </div>
              )}
              {sup.school && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span>{sup.school}</span>
                </div>
              )}
              {sup.office_location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>Office: {sup.office_location}</span>
                </div>
              )}
              {sup.office_hours && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>{sup.office_hours}</span>
                </div>
              )}
            </div>

            {sup.research_areas && sup.research_areas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Research Areas
                </p>
                <div className="flex flex-wrap gap-1">
                  {sup.research_areas.map((area, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{area}</Badge>
                  ))}
                </div>
              </div>
            )}

            {sup.current_projects != null && sup.max_projects != null && (
              <div className="text-xs text-muted-foreground">
                Capacity: {sup.current_projects}/{sup.max_projects} projects
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
