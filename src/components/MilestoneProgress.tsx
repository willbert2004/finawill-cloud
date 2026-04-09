import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updates?: MilestoneUpdate[];
}

interface MilestoneUpdate {
  id: string;
  update_text: string;
  created_at: string;
  created_by: string;
}

interface MilestoneProgressProps {
  groupId: string;
  isSupervisor: boolean;
}

export default function MilestoneProgress({ groupId, isSupervisor }: MilestoneProgressProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", due_date: "" });
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [updateText, setUpdateText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMilestones();
  }, [groupId]);

  const fetchMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from("group_milestones")
        .select(`
          *,
          updates:milestone_updates(*)
        `)
        .eq("group_id", groupId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setMilestones((data || []) as Milestone[]);
    } catch (error: any) {
      console.error("Error fetching milestones:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addMilestone = async () => {
    if (!newMilestone.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("group_milestones").insert({
        group_id: groupId,
        title: newMilestone.title,
        description: newMilestone.description || null,
        due_date: newMilestone.due_date || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Milestone added successfully" });
      setNewMilestone({ title: "", description: "", due_date: "" });
      setIsAddingMilestone(false);
      fetchMilestones();
    } catch (error: any) {
      console.error("Error adding milestone:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateMilestoneStatus = async (milestoneId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("group_milestones")
        .update({ status })
        .eq("id", milestoneId);

      if (error) throw error;
      toast({ title: "Success", description: "Status updated" });
      fetchMilestones();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const addUpdate = async (milestoneId: string) => {
    if (!updateText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("milestone_updates").insert({
        milestone_id: milestoneId,
        update_text: updateText,
        created_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Update added" });
      setUpdateText("");
      fetchMilestones();
    } catch (error: any) {
      console.error("Error adding update:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const calculateProgress = () => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return (completed / milestones.length) * 100;
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading milestones...</div>;
  }

  const progress = calculateProgress();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <h3 className="text-lg font-semibold">Progress Tracking</h3>
          <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1 max-w-md" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {milestones.filter(m => m.status === 'completed').length} of {milestones.length} completed
            </span>
          </div>
        </div>
        {isSupervisor && (
          <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Milestone</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    placeholder="Milestone title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    placeholder="Milestone description"
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newMilestone.due_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                  />
                </div>
                <Button onClick={addMilestone} className="w-full">Add Milestone</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3">
        {milestones.map((milestone) => (
          <Card key={milestone.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1">
                  {getStatusIcon(milestone.status)}
                  <div className="flex-1">
                    <CardTitle className="text-base">{milestone.title}</CardTitle>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                    )}
                    {milestone.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(new Date(milestone.due_date), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    milestone.status === 'completed' ? 'default' :
                    milestone.status === 'in_progress' ? 'secondary' : 'outline'
                  }>
                    {milestone.status.replace('_', ' ')}
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedMilestone(milestone)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{milestone.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {isSupervisor && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={milestone.status === 'pending' ? 'default' : 'outline'}
                              onClick={() => updateMilestoneStatus(milestone.id, 'pending')}
                            >
                              Pending
                            </Button>
                            <Button
                              size="sm"
                              variant={milestone.status === 'in_progress' ? 'default' : 'outline'}
                              onClick={() => updateMilestoneStatus(milestone.id, 'in_progress')}
                            >
                              In Progress
                            </Button>
                            <Button
                              size="sm"
                              variant={milestone.status === 'completed' ? 'default' : 'outline'}
                              onClick={() => updateMilestoneStatus(milestone.id, 'completed')}
                            >
                              Completed
                            </Button>
                          </div>
                        )}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm">Status Updates</h4>
                          {milestone.updates && milestone.updates.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {milestone.updates.map((update) => (
                                <div key={update.id} className="bg-muted p-3 rounded-lg">
                                  <p className="text-sm">{update.update_text}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(update.created_at), 'MMM dd, yyyy HH:mm')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No updates yet</p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a status update..."
                              value={updateText}
                              onChange={(e) => setUpdateText(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addUpdate(milestone.id)}
                            />
                            <Button onClick={() => addUpdate(milestone.id)}>Post</Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
        {milestones.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No milestones yet. {isSupervisor && "Add your first milestone to start tracking progress."}
          </p>
        )}
      </div>
    </div>
  );
}