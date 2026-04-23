import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileCheck, FileWarning, Upload, FileX } from "lucide-react";
import { useChapterStats } from "@/hooks/useChapterStats";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  /** Title shown on the card */
  title?: string;
  description?: string;
  /** Hide the rejected counter (e.g. on student view) */
  compact?: boolean;
  /**
   * System-wide mode (admin): total chapters = approved projects × REQUIRED_CHAPTERS.
   * Progress = approved chapters / total expected chapters.
   */
  systemWide?: boolean;
}

export function ChapterProgressCard({
  title = "Chapter Progress",
  description = "Across your project chapters",
  compact = false,
  systemWide = false,
}: Props) {
  const { stats, loading } = useChapterStats();
  const REQUIRED_CHAPTERS = 6;

  const [approvedProjects, setApprovedProjects] = useState(0);
  const [loadingProjects, setLoadingProjects] = useState(systemWide);

  useEffect(() => {
    if (!systemWide) return;
    let active = true;
    const fetchApproved = async () => {
      setLoadingProjects(true);
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved");
      if (active) {
        setApprovedProjects(count || 0);
        setLoadingProjects(false);
      }
    };
    fetchApproved();
    const channel = supabase
      .channel("chapter-progress-approved-projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => fetchApproved())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [systemWide]);

  const totalRequired = systemWide
    ? approvedProjects * REQUIRED_CHAPTERS
    : REQUIRED_CHAPTERS;
  const approvedOutOfRequired = systemWide
    ? Math.min(stats.approved, totalRequired)
    : Math.min(stats.approved, REQUIRED_CHAPTERS);
  const progressPct = totalRequired > 0
    ? Math.round((approvedOutOfRequired / totalRequired) * 100)
    : 0;
  const isLoading = loading || loadingProjects;

  // Color tiers based on progress level
  const getProgressClasses = (pct: number) => {
    if (pct >= 100) return { bar: "[&>div]:bg-gradient-to-r [&>div]:from-success [&>div]:to-success", text: "text-success" };
    if (pct >= 75) return { bar: "[&>div]:bg-gradient-to-r [&>div]:from-success [&>div]:to-secondary", text: "text-success" };
    if (pct >= 50) return { bar: "[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-secondary", text: "text-primary" };
    if (pct >= 25) return { bar: "[&>div]:bg-gradient-to-r [&>div]:from-warning [&>div]:to-primary", text: "text-warning" };
    return { bar: "[&>div]:bg-destructive", text: "text-destructive" };
  };
  const progressClasses = getProgressClasses(progressPct);

  return (
    <Card className="border-primary/10 shadow-card overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-success" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {loading ? "—" : `${approvedOutOfRequired} of ${REQUIRED_CHAPTERS} approved`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Approved progress</span>
            <span className={`font-semibold ${progressClasses.text}`}>{loading ? "—" : `${progressPct}%`}</span>
          </div>
          <Progress
            value={progressPct}
            className={`h-2.5 ${progressClasses.bar}`}
          />
        </div>
        <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"} gap-2`}>
          <StatTile icon={FileCheck} label="Approved" value={stats.approved} tone="success" loading={loading} />
          <StatTile icon={Upload} label="Submitted" value={stats.submitted} tone="primary" loading={loading} />
          <StatTile icon={FileWarning} label="Needs revision" value={stats.needs_revision} tone="warning" loading={loading} />
          {!compact && (
            <StatTile icon={FileX} label="Rejected" value={stats.rejected} tone="destructive" loading={loading} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon: Icon, label, value, tone, loading,
}: { icon: any; label: string; value: number; tone: "success" | "primary" | "warning" | "destructive"; loading: boolean }) {
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className={`rounded-lg p-2.5 text-center ${tones[tone]}`}>
      <div className="flex items-center justify-center gap-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-base font-bold leading-none">{loading ? "—" : value}</span>
      </div>
      <p className="text-[10px] mt-1 opacity-80">{label}</p>
    </div>
  );
}
