import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";

interface ThresholdRow {
  id: string;
  level: string;
  min_score: number;
  max_score: number;
}

const LEVEL_META: Record<string, { label: string; color: string; description: string }> = {
  high: { label: "High Duplication Risk", color: "bg-destructive/10 text-destructive border-destructive/30", description: "Projects in this range are blocked from submission." },
  possible: { label: "Possible Duplication", color: "bg-warning/10 text-warning border-warning/30", description: "Projects flagged for review but allowed to proceed." },
  low: { label: "Low Duplication", color: "bg-success/10 text-success border-success/30", description: "Projects considered unique — no action needed." },
};

const LEVEL_ORDER = ["high", "possible", "low"];

export function DuplicationThresholdConfig() {
  const { toast } = useToast();
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([]);
  const [draft, setDraft] = useState<Record<string, { min: number; max: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("duplication_thresholds")
      .select("*")
      .order("min_score", { ascending: false });

    if (error) {
      toast({ title: "Error loading thresholds", description: error.message, variant: "destructive" });
    } else if (data) {
      setThresholds(data as ThresholdRow[]);
      const d: Record<string, { min: number; max: number }> = {};
      data.forEach((t: ThresholdRow) => {
        d[t.level] = { min: t.min_score, max: t.max_score };
      });
      setDraft(d);
    }
    setLoading(false);
  };

  const validate = (): string | null => {
    for (const level of LEVEL_ORDER) {
      const d = draft[level];
      if (!d) return `Missing ${level} range.`;
      if (d.min < 0 || d.max > 100) return `${LEVEL_META[level].label}: values must be 0–100.`;
      if (d.min > d.max) return `${LEVEL_META[level].label}: min cannot exceed max.`;
    }

    // Check for overlaps — ranges should be contiguous & non-overlapping
    const sorted = LEVEL_ORDER
      .map((l) => ({ level: l, ...draft[l] }))
      .sort((a, b) => a.min - b.min);

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min <= sorted[i - 1].max) {
        return `Overlap detected between ${LEVEL_META[sorted[i - 1].level].label} and ${LEVEL_META[sorted[i].level].label}. Ensure ranges don't overlap (e.g. 0–34, 35–69, 70–100).`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Validation Error", description: err, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      for (const t of thresholds) {
        const d = draft[t.level];
        if (d) {
          const { error } = await supabase
            .from("duplication_thresholds")
            .update({ min_score: d.min, max_score: d.max })
            .eq("id", t.id);
          if (error) throw error;
        }
      }
      toast({ title: "Thresholds Updated", description: "Duplication ranges saved successfully." });
      await fetchThresholds();
    } catch (e: any) {
      toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (level: string, field: "min" | "max", value: string) => {
    const num = parseInt(value) || 0;
    setDraft((prev) => ({
      ...prev,
      [level]: { ...prev[level], [field]: Math.max(0, Math.min(100, num)) },
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const validationError = validate();

  return (
    <Card className="border-super-admin/20">
      <div className="h-1 bg-gradient-to-r from-super-admin-dark via-super-admin to-super-admin-light" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-5 w-5 text-super-admin" />
          Duplication Threshold Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Define the similarity score ranges that determine how projects are classified during duplicate checking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {LEVEL_ORDER.map((level) => {
          const meta = LEVEL_META[level];
          const d = draft[level] || { min: 0, max: 0 };
          return (
            <div key={level} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={`${meta.color} text-xs`}>{meta.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Min Score (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={d.min}
                    onChange={(e) => updateDraft(level, "min", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Score (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={d.max}
                    onChange={(e) => updateDraft(level, "max", e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {validationError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{validationError}</p>
          </div>
        )}

        {!validationError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <p className="text-xs text-success">Ranges are valid and non-overlapping.</p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving || !!validationError} className="w-full">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Thresholds</>}
        </Button>
      </CardContent>
    </Card>
  );
}
