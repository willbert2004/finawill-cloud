import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, Trash2, BookOpen, Users, BarChart3, Lock, X } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SupervisedProject {
  id: string; title: string; description: string; status: string;
  student_id: string; created_at: string; studentName?: string;
}

export default function SupervisorProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [profile, setProfile] = useState({ full_name: '', research_areas: [] as string[], office_location: '', max_projects: 5, department: '' });
  const [researchAreasText, setResearchAreasText] = useState('');
  const [supervisedProjects, setSupervisedProjects] = useState<SupervisedProject[]>([]);
  const [supervisedGroupsCount, setSupervisedGroupsCount] = useState(0);

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) { loadProfile(); loadSupervisedProjects(); } }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      if (profileError) throw profileError;
      const { data: supervisorData, error: supervisorError } = await supabase.from('supervisors').select('*').eq('user_id', user?.id).maybeSingle();
      if (supervisorError && supervisorError.code !== 'PGRST116') throw supervisorError;
      setProfile({
        full_name: profileData?.full_name || '', research_areas: supervisorData?.research_areas || [],
        office_location: supervisorData?.office_location || '', max_projects: supervisorData?.max_projects || 5,
        department: supervisorData?.department || '',
      });
      setResearchAreasText((supervisorData?.research_areas || []).join(', '));
    } catch { toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const loadSupervisedProjects = async () => {
    try {
      const { data: projects, error } = await supabase.from('projects').select('id, title, description, status, student_id, created_at')
        .eq('supervisor_id', user?.id).not('status', 'in', '(\\\"archived\\\",\\\"rejected\\\")').order('created_at', { ascending: false });
      if (error) throw error;
      const studentIds = [...new Set((projects || []).map(p => p.student_id))];
      if (studentIds.length > 0) {
        const { data: studentProfiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', studentIds);
        setSupervisedProjects((projects || []).map(p => ({ ...p, studentName: studentProfiles?.find(sp => sp.user_id === p.student_id)?.full_name || 'Unknown' })));
      } else { setSupervisedProjects(projects || []); }
      const { count } = await supabase.from('group_allocations').select('*', { count: 'exact', head: true }).eq('supervisor_id', user?.id).eq('status', 'accepted');
      setSupervisedGroupsCount(count || 0);
    } catch (error: any) { console.error('Error loading supervised projects:', error); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const researchAreasArray = researchAreasText.split(',').map(a => a.trim()).filter(a => a.length > 0);
      await supabase.from('profiles').update({ full_name: profile.full_name, research_areas: researchAreasArray, department: profile.department }).eq('user_id', user?.id);
      await supabase.from('supervisors').upsert({ user_id: user?.id, research_areas: researchAreasArray, office_location: profile.office_location, max_projects: profile.max_projects, department: profile.department }, { onConflict: 'user_id' });
      toast({ title: 'Success', description: 'Profile updated' });
    } catch (error: any) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDeleteProfile = async () => {
    setDeleting(true);
    try { await supabase.from('profiles').delete().eq('user_id', user?.id); await supabase.auth.signOut(); navigate('/'); }
    catch (error: any) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    finally { setDeleting(false); }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success/10 text-success border border-success/30 text-[10px]">approved</Badge>;
      case 'pending': return <Badge className="bg-warning/10 text-warning border border-warning/30 text-[10px]">pending</Badge>;
      case 'in_progress': return <Badge className="bg-primary/10 text-primary border border-primary/30 text-[10px]">in progress</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (authLoading || loading) return <AuthenticatedLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AuthenticatedLayout>;

  const statItems = [
    { icon: BookOpen, value: supervisedProjects.length, label: 'Supervised Projects', gradient: 'from-primary to-primary-light' },
    { icon: Users, value: supervisedGroupsCount, label: 'Supervised Groups', gradient: 'from-secondary to-secondary-light' },
    { icon: BarChart3, value: Math.max(0, profile.max_projects - supervisedProjects.length), label: 'Available Slots', gradient: 'from-success to-[hsl(160,80%,45%)]' },
  ];

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statItems.map((stat, i) => (
            <Card key={i} className="group hover-lift cursor-default overflow-hidden border-transparent shadow-card hover:shadow-hover transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">Supervised Projects</TabsTrigger>
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {supervisedProjects.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center py-12">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 mb-4">
                  <BookOpen className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-1">No Supervised Projects</h3>
                <p className="text-sm text-muted-foreground mb-4">Projects matched to your expertise will appear here.</p>
                <Button className="bg-gradient-to-r from-primary to-primary-light hover:opacity-90" onClick={() => navigate('/allocation')}>View Pending Allocations</Button>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {supervisedProjects.map(project => (
                  <Card key={project.id} className="group hover-lift hover:border-primary/20 transition-all duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base group-hover:text-primary transition-colors">{project.title}</CardTitle>
                        {statusBadge(project.status)}
                      </div>
                      <CardDescription className="text-xs">
                        Student: {project.studentName} • {new Date(project.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                      <Button size="sm" variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => navigate('/project-management')}>
                        <BarChart3 className="h-3 w-3 mr-1.5" /> Track Progress
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-light">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <CardTitle>Profile Information</CardTitle>
                </div>
                <CardDescription>Your research areas are used to match you with relevant projects.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Full Name</Label><Input value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Department</Label><Input value={profile.department} onChange={e => setProfile({ ...profile, department: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Office Location</Label><Input value={profile.office_location} onChange={e => setProfile({ ...profile, office_location: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Maximum Projects</Label><Input type="number" min="1" max="20" value={profile.max_projects} onChange={e => setProfile({ ...profile, max_projects: parseInt(e.target.value) })} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Areas of Expertise</Label>
                    <Textarea value={researchAreasText} onChange={e => setResearchAreasText(e.target.value)} placeholder="Machine Learning, Data Science, AI..." rows={3} />
                    <p className="text-xs text-muted-foreground">Used for automatic project matching. Separate with commas.</p>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-primary-light hover:opacity-90" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" /> Save Profile
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-secondary to-secondary-light">
                    <Lock className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <CardTitle>Change Password</CardTitle>
                </div>
                <CardDescription>Update your account password.</CardDescription>
              </CardHeader>
              <CardContent>
                {!changingPassword ? (
                  <Button variant="outline" onClick={() => setChangingPassword(true)}>
                    <Lock className="h-4 w-4 mr-1.5" /> Change Password
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 8 chars, upper, lower, number, special" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" disabled={savingPassword} onClick={async () => {
                        const { newPassword, confirmPassword } = passwordForm;
                        if (newPassword.length < 8) { toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' }); return; }
                        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) { toast({ title: 'Error', description: 'Password needs uppercase, lowercase, number, and special character', variant: 'destructive' }); return; }
                        if (newPassword !== confirmPassword) { toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' }); return; }
                        setSavingPassword(true);
                        try {
                          const { error } = await supabase.auth.updateUser({ password: newPassword });
                          if (error) throw error;
                          toast({ title: 'Success', description: 'Password changed successfully' });
                          setChangingPassword(false);
                          setPasswordForm({ newPassword: '', confirmPassword: '' });
                        } catch (err: any) {
                          toast({ title: 'Error', description: err.message || 'Failed to change password', variant: 'destructive' });
                        } finally { setSavingPassword(false); }
                      }}>
                        {savingPassword && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        <Save className="h-4 w-4 mr-1.5" /> Update Password
                      </Button>
                      <Button variant="outline" onClick={() => { setChangingPassword(false); setPasswordForm({ newPassword: '', confirmPassword: '' }); }} disabled={savingPassword}>
                        <X className="h-4 w-4 mr-1.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="text-destructive text-sm">Danger Zone</CardTitle></CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting}><Trash2 className="mr-2 h-4 w-4" /> Delete Profile</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete your profile?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
