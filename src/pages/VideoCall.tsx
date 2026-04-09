import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneOff, Loader2, Users, ArrowLeft } from "lucide-react";

const VideoCall = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);

  const meetingId = searchParams.get("meeting");
  const groupId = searchParams.get("group");

  useEffect(() => {
    if (authLoading || !user) return;

    const setup = async () => {
      try {
        // Get user display name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        if (profile?.full_name) setDisplayName(profile.full_name);

        // Determine room from meeting or group
        if (meetingId) {
          const { data: meeting } = await supabase
            .from("meetings")
            .select("id, group_id, title")
            .eq("id", meetingId)
            .single();
          if (meeting) {
            setRoomName(`ciios-${meeting.group_id}-${meeting.id}`.replace(/[^a-zA-Z0-9-]/g, ""));
            // Get group name
            const { data: group } = await supabase
              .from("student_groups")
              .select("name")
              .eq("id", meeting.group_id)
              .single();
            setGroupName(group?.name || "Meeting");
          }
        } else if (groupId) {
          setRoomName(`ciios-group-${groupId}`.replace(/[^a-zA-Z0-9-]/g, ""));
          const { data: group } = await supabase
            .from("student_groups")
            .select("name")
            .eq("id", groupId)
            .single();
          setGroupName(group?.name || "Group Call");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    setup();
  }, [user, authLoading, meetingId, groupId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roomName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Invalid call link. Please start a call from the dashboard.</p>
            <Button onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false`;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{groupName}</span>
            <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/30">Live</Badge>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => navigate("/dashboard")}>
          <PhoneOff className="h-4 w-4 mr-1" /> End Call
        </Button>
      </div>

      {/* Jitsi iframe */}
      <iframe
        ref={iframeRef}
        src={jitsiUrl}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        allowFullScreen
      />
    </div>
  );
};

export default VideoCall;
