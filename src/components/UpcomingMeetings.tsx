import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Video, CalendarIcon, Clock, ExternalLink, Users, Loader2, Phone } from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  meeting_date: string;
  meeting_time: string | null;
  status: string;
  group_id: string | null;
  group_name?: string;
}

export function UpcomingMeetings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMeetings();

    const channel = supabase
      .channel(`student-meetings-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchMeetings())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fetchMeetings = async () => {
    if (!user) return;
    try {
      const [{ data: createdGroups }, { data: memberGroups }] = await Promise.all([
        supabase.from("student_groups").select("id, name").eq("created_by", user.id),
        supabase.from("group_members").select("group_id, student_groups(id, name)").eq("student_id", user.id),
      ]);

      const groupMap = new Map<string, string>();
      (createdGroups || []).forEach((g: any) => groupMap.set(g.id, g.name));
      (memberGroups || []).forEach((m: any) => {
        if (m.student_groups) groupMap.set(m.student_groups.id, m.student_groups.name);
      });

      const groupIds = Array.from(groupMap.keys());

      const today = new Date().toISOString().split('T')[0];

      // Fetch group meetings + individual meetings for this user
      const queries: any[] = [];
      if (groupIds.length > 0) {
        queries.push(
          supabase.from("meetings").select("*").in("group_id", groupIds).gte("meeting_date", today)
        );
      }
      queries.push(
        supabase.from("meetings").select("*").eq("student_id", user.id).gte("meeting_date", today)
      );

      const results = await Promise.all(queries);
      const all = results.flatMap(r => r.data || []);
      // Dedupe
      const seen = new Set<string>();
      const merged = all.filter((m: any) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      const enriched = merged
        .map((m: any) => ({
          ...m,
          group_name: m.group_id ? (groupMap.get(m.group_id) || "Group") : "Individual",
        }))
        .sort((a, b) => {
          const ad = `${a.meeting_date} ${a.meeting_time || '00:00'}`;
          const bd = `${b.meeting_date} ${b.meeting_time || '00:00'}`;
          return ad.localeCompare(bd);
        })
        .slice(0, 5);

      setMeetings(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (meetings.length === 0) return null;

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          Upcoming Meetings
          <Badge variant="secondary" className="text-[10px] ml-auto">{meetings.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {meetings.map(m => {
          const meetingDate = new Date(`${m.meeting_date}T${m.meeting_time || '00:00'}`);
          const isToday = new Date().toDateString() === meetingDate.toDateString();

          return (
            <div key={m.id} className={`p-3 rounded-lg border transition-all ${isToday ? 'border-primary/30 bg-primary/5' : 'bg-muted/30'}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold truncate">{m.title}</h4>
                    {isToday && <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">Today</Badge>}
                  </div>
                  {m.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{m.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{m.group_name}</span>
                    <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{format(meetingDate, "dd MMM yyyy")}</span>
                    {m.meeting_time && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.meeting_time.slice(0, 5)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => navigate(`/video-call?meeting=${m.id}`)}>
                    <Phone className="h-3 w-3 mr-1" /> Join Call
                  </Button>
                  {m.meeting_link && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                      <a href={m.meeting_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" /> Open Link
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
