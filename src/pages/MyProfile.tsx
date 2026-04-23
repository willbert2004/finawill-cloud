import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, User, Building2, GraduationCap, Phone, MapPin, Loader2, Pencil, Save, X, Camera, Lock, Clock, RotateCw, ZoomIn } from "lucide-react";
import { toast } from "sonner";

export default function MyProfile() {
  const { user } = useAuth();
  const { isAdmin, isSupervisor, isStudent, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [editorFileName, setEditorFileName] = useState<string>('avatar.png');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; baseX: number; baseY: number }>({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const imgElRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    return () => { if (editorSrc) URL.revokeObjectURL(editorSrc); };
  }, [editorSrc]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    department: '',
    research_areas: '',
    max_projects: '',
    phone_number: '',
    office_hours: '',
  });

  const startEditing = () => {
    setForm({
      full_name: profile?.full_name || '',
      school: profile?.school || '',
      department: profile?.department || '',
      research_areas: profile?.research_areas?.join(', ') || '',
      max_projects: String(profile?.max_projects ?? 5),
      phone_number: (profile as any)?.phone_number || '',
      office_hours: (profile as any)?.office_hours || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: {
        full_name: string;
        school: string;
        department: string;
        phone_number: string | null;
        office_hours: string | null;
        research_areas?: string[];
        max_projects?: number;
      } = {
        full_name: form.full_name.trim(),
        school: form.school.trim(),
        department: form.department.trim(),
        phone_number: form.phone_number.trim() || null,
        office_hours: form.office_hours.trim() || null,
      };
      if (isSupervisor) {
        updates.research_areas = form.research_areas
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        updates.max_projects = parseInt(form.max_projects) || 5;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
    const url = URL.createObjectURL(file);
    setEditorSrc(url);
    setEditorFileName(file.name);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setEditorOpen(true);
  };

  const renderCroppedBlob = (size = 512): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = imgElRef.current;
      if (!img) return resolve(null);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // The preview frame is square; we mirror its transform onto a square canvas.
      // Compute scale: image is rendered as object-cover in a square preview of side P.
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const coverScale = Math.max(size / iw, size / ih);
      const drawW = iw * coverScale * zoom;
      const drawH = ih * coverScale * zoom;

      // Offset is in preview pixels (frame size 320 in dialog). Scale offset to canvas size.
      const FRAME = 320;
      const ox = (offset.x * size) / FRAME;
      const oy = (offset.y * size) / FRAME;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2 + ox, size / 2 + oy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });
  };

  const handleConfirmAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const blob = await renderCroppedBlob(512);
      if (!blob) throw new Error('Could not process image');
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl } as any).eq('user_id', user.id);
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Profile picture updated!');
      setEditorOpen(false);
      if (editorSrc) URL.revokeObjectURL(editorSrc);
      setEditorSrc(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getDashboardPath = () => {
    if (isAdmin) return "/admin";
    if (isSupervisor) return "/project-management";
    return "/projects";
  };

  const getRoleLabel = () => {
    if (isAdmin) return "Admin";
    if (isSupervisor) return "Supervisor";
    if (isStudent) return "Student";
    return "User";
  };

  const getInitials = () => {
    const name = profile?.full_name || user?.email || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const loading = isLoading || roleLoading;

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(getDashboardPath())}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">My Profile</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar
                      className="h-16 w-16 border-2 border-border cursor-pointer"
                      onClick={() => {
                        const url = (profile as any)?.avatar_url;
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <AvatarImage src={(profile as any)?.avatar_url} alt={profile?.full_name || 'Avatar'} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 border-2 border-background cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {profile?.full_name || user?.email?.split("@")[0] || "User"}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1">{getRoleLabel()}</Badge>
                  </div>
                </div>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school">School</Label>
                    <Input id="school" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                  </div>
                  {isSupervisor && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="research_areas">Research Areas (comma separated)</Label>
                        <Input id="research_areas" value={form.research_areas} onChange={e => setForm(f => ({ ...f, research_areas: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_projects">Max Projects</Label>
                        <Input id="max_projects" type="number" value={form.max_projects} onChange={e => setForm(f => ({ ...f, max_projects: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="office_hours">Office Hours</Label>
                        <Input id="office_hours" value={form.office_hours} onChange={e => setForm(f => ({ ...f, office_hours: e.target.value }))} placeholder="e.g. Mon-Fri 9:00-12:00" />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input id="phone_number" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="e.g. +263 780 269 090" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                      <X className="h-4 w-4 mr-1.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <InfoRow icon={Mail} label="Email" value={profile?.email || user?.email || "—"} />
                  <InfoRow icon={Building2} label="School" value={profile?.school || "—"} />
                  <InfoRow icon={GraduationCap} label="Department" value={profile?.department || "—"} />
                  {isSupervisor && profile?.research_areas && (
                    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Research Areas</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profile.research_areas.map((area, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{area}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {isSupervisor && (
                    <>
                      <InfoRow icon={User} label="Current Projects" value={String(profile?.current_projects ?? 0)} />
                      <InfoRow icon={User} label="Max Projects" value={String(profile?.max_projects ?? "—")} />
                    </>
                  )}
                  <InfoRow icon={Phone} label="Phone" value={(profile as any)?.phone_number || "—"} />
                  {isSupervisor && (
                    <InfoRow icon={Clock} label="Office Hours" value={(profile as any)?.office_hours || "—"} />
                  )}

                  <div className="pt-4 space-y-2">
                    {!changingPassword ? (
                      <Button variant="outline" className="w-full" onClick={() => setChangingPassword(true)}>
                        <Lock className="h-4 w-4 mr-1.5" /> Change Password
                      </Button>
                    ) : (
                      <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                        <p className="text-sm font-medium text-foreground">Change Password</p>
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
                            if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
                            if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) { toast.error('Password needs uppercase, lowercase, number, and special character'); return; }
                            if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
                            setSavingPassword(true);
                            try {
                              const { error } = await supabase.auth.updateUser({ password: newPassword });
                              if (error) throw error;
                              toast.success('Password changed successfully');
                              setChangingPassword(false);
                              setPasswordForm({ newPassword: '', confirmPassword: '' });
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to change password');
                            } finally {
                              setSavingPassword(false);
                            }
                          }}>
                            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                            Update Password
                          </Button>
                          <Button variant="outline" onClick={() => { setChangingPassword(false); setPasswordForm({ newPassword: '', confirmPassword: '' }); }} disabled={savingPassword}>
                            <X className="h-4 w-4 mr-1.5" /> Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    <Button className="w-full" onClick={() => navigate(getDashboardPath())}>
                      Go to Dashboard
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={editorOpen} onOpenChange={(o) => { if (!uploadingAvatar) setEditorOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust your photo</DialogTitle>
            <DialogDescription>Drag to reposition, then zoom or rotate. Click Save to update your profile picture.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <div
              className="relative w-[320px] h-[320px] rounded-full overflow-hidden bg-black border-2 border-border select-none touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
              }}
              onPointerMove={(e) => {
                if (!dragRef.current.dragging) return;
                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;
                setOffset({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy });
              }}
              onPointerUp={() => { dragRef.current.dragging = false; }}
              onPointerCancel={() => { dragRef.current.dragging = false; }}
            >
              {editorSrc && (
                <img
                  ref={imgElRef}
                  src={editorSrc}
                  alt="Preview"
                  draggable={false}
                  className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    width: '320px',
                    height: '320px',
                    objectFit: 'cover',
                  }}
                />
              )}
            </div>

            <div className="w-full space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><ZoomIn className="h-3.5 w-3.5" /> Zoom</span>
                  <span>{zoom.toFixed(1)}x</span>
                </div>
                <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setRotation(r => (r - 90) % 360)}>
                  <RotateCw className="h-4 w-4 mr-1.5 -scale-x-100" /> Rotate Left
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
                  <RotateCw className="h-4 w-4 mr-1.5" /> Rotate Right
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); }}>
                  Reset
                </Button>
              </div>
              <p className="text-xs text-muted-foreground truncate">File: {editorFileName}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={uploadingAvatar}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Picture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
