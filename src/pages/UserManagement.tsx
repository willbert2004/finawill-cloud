import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Shield, UserCog, GraduationCap, User, Trash2, Loader2, Users, Plus, Eye, EyeOff, Pencil, Save, X, UsersRound, KeyRound, History, Download, School } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/csvExport';
import SchoolManagement from '@/components/SchoolManagement';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  id: string; user_id: string; email: string; full_name: string | null;
  user_type: string; department: string | null; school: string | null;
  created_at: string; roles: string[];
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSuperAdmin, isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [loading, setLoading] = useState(true);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Create admin form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('');
  const [adminSchool, setAdminSchool] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Create supervisor form state
  const [supEmail, setSupEmail] = useState('');
  const [supPassword, setSupPassword] = useState('');
  const [supFullName, setSupFullName] = useState('');
  const [supDepartment, setSupDepartment] = useState('');
  const [supSchool, setSupSchool] = useState('');
  const [supResearchAreas, setSupResearchAreas] = useState('');
  const [supMaxProjects, setSupMaxProjects] = useState('5');
  const [supOfficeLocation, setSupOfficeLocation] = useState('');
  const [showSupPassword, setShowSupPassword] = useState(false);
  const [creatingSupervisor, setCreatingSupervisor] = useState(false);

  // Edit admin state
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit supervisor state
  const [editingSupervisorId, setEditingSupervisorId] = useState<string | null>(null);
  const [editSupName, setEditSupName] = useState('');
  const [editSupDepartment, setEditSupDepartment] = useState('');
  const [editSupSchool, setEditSupSchool] = useState('');
  const [editSupResearchAreas, setEditSupResearchAreas] = useState('');
  const [editSupMaxProjects, setEditSupMaxProjects] = useState('5');
  const [editSupOfficeLocation, setEditSupOfficeLocation] = useState('');
  const [savingSupEdit, setSavingSupEdit] = useState(false);

  // Delete supervisor state
  const [isDeleteSupDialogOpen, setIsDeleteSupDialogOpen] = useState(false);
  const [supToDelete, setSupToDelete] = useState<UserWithRoles | null>(null);
  const [deleteSupLoading, setDeleteSupLoading] = useState(false);

  // Password reset state
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<UserWithRoles | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [groupCount, setGroupCount] = useState(0);
  const [supervisorDetails, setSupervisorDetails] = useState<any[]>([]);

  const defaultTab = searchParams.get('tab') === 'create-admin' ? 'create-admin' : searchParams.get('tab') === 'supervisors' ? 'supervisors' : 'users';

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only super admins can access this page.', variant: 'destructive' });
      navigate('/');
    }
  }, [isSuperAdmin, roleLoading]);

  useEffect(() => { if (isSuperAdmin) { fetchUsers(); fetchSupervisorDetails(); } }, [isSuperAdmin]);

  useEffect(() => {
    const fetchGroups = async () => {
      const { count } = await supabase.from('student_groups').select('*', { count: 'exact', head: true });
      setGroupCount(count || 0);
    };
    if (isSuperAdmin) fetchGroups();

    const channel = supabase
      .channel('user-management-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchUsers(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => { fetchUsers(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supervisors' }, () => { fetchSupervisorDetails(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_groups' }, () => { fetchGroups(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!searchTerm) { setFilteredUsers(users); return; }
    const t = searchTerm.toLowerCase();
    setFilteredUsers(users.filter(u => u.email.toLowerCase().includes(t) || u.full_name?.toLowerCase().includes(t) || u.roles.some(r => r.includes(t))));
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [{ data: profiles }, { data: userRoles }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      const usersWithRoles = profiles?.map(p => ({ ...p, roles: userRoles?.filter(r => r.user_id === p.user_id).map(r => r.role) || [] })) || [];
      setUsers(usersWithRoles); setFilteredUsers(usersWithRoles);
    } catch { toast({ title: 'Error fetching users', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const fetchSupervisorDetails = async () => {
    try {
      const { data } = await supabase.from('supervisors').select('*');
      setSupervisorDetails(data || []);
    } catch { console.error('Error fetching supervisor details'); }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !newRole) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('user_roles').insert({ user_id: selectedUser.user_id, role: newRole as AppRole });
      if (error?.code === '23505') { toast({ title: 'Already has this role', variant: 'destructive' }); }
      else if (error) throw error;
      else { toast({ title: 'Role Added' }); await fetchUsers(); setIsRoleDialogOpen(false); setNewRole(''); }
    } catch { toast({ title: 'Error adding role', variant: 'destructive' }); }
    finally { setActionLoading(false); }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (role === 'super_admin') {
      toast({ title: 'Cannot remove super admin role', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
      toast({ title: 'Role Removed' }); await fetchUsers();
    } catch { toast({ title: 'Error removing role', variant: 'destructive' }); }
    finally { setActionLoading(false); }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.user_id },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: 'User Deleted', description: `${userToDelete.full_name || userToDelete.email} has been removed.` });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error deleting user', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminEmail || !adminPassword || !adminFullName) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      toast({ title: 'Invalid email address', variant: 'destructive' });
      return;
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/;
    if (adminPassword.length < 8 || !passwordRegex.test(adminPassword)) {
      toast({ title: 'Password does not meet requirements', variant: 'destructive' });
      return;
    }

    setCreatingAdmin(true);
    try {
      const response = await supabase.functions.invoke('create-admin', {
        body: { email: adminEmail, password: adminPassword, full_name: adminFullName, department: adminDepartment || null, school: adminSchool || null },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Admin Created', description: `Account created for ${adminEmail}` });
      setAdminEmail(''); setAdminPassword(''); setAdminFullName('');
      setAdminDepartment(''); setAdminSchool('');
      await fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error creating admin', description: error.message, variant: 'destructive' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleCreateSupervisor = async () => {
    if (!supEmail || !supPassword || !supFullName) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supEmail)) {
      toast({ title: 'Invalid email address', variant: 'destructive' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/;
    if (supPassword.length < 8 || !passwordRegex.test(supPassword)) {
      toast({ title: 'Password does not meet requirements', description: 'Must be 8+ chars with uppercase, lowercase, number, and special character.', variant: 'destructive' });
      return;
    }

    setCreatingSupervisor(true);
    try {
      const response = await supabase.functions.invoke('create-supervisor', {
        body: {
          action: 'create',
          email: supEmail,
          password: supPassword,
          full_name: supFullName,
          department: supDepartment || null,
          school: supSchool || null,
          research_areas: supResearchAreas ? supResearchAreas.split(',').map(s => s.trim()).filter(Boolean) : [],
          max_projects: parseInt(supMaxProjects) || 5,
          office_location: supOfficeLocation || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Supervisor Created', description: `Account created for ${supEmail}` });
      setSupEmail(''); setSupPassword(''); setSupFullName('');
      setSupDepartment(''); setSupSchool(''); setSupResearchAreas('');
      setSupMaxProjects('5'); setSupOfficeLocation('');
      await Promise.all([fetchUsers(), fetchSupervisorDetails()]);
    } catch (error: any) {
      toast({ title: 'Error creating supervisor', description: error.message, variant: 'destructive' });
    } finally {
      setCreatingSupervisor(false);
    }
  };

  const startEditAdmin = (admin: UserWithRoles) => {
    setEditingAdminId(admin.user_id);
    setEditName(admin.full_name || '');
    setEditDepartment(admin.department || '');
    setEditSchool(admin.school || '');
  };

  const cancelEdit = () => {
    setEditingAdminId(null);
    setEditName(''); setEditDepartment(''); setEditSchool('');
  };

  const saveAdminEdit = async (userId: string) => {
    if (!editName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: editName.trim(), department: editDepartment.trim() || null, school: editSchool.trim() || null }).eq('user_id', userId);
      if (error) throw error;
      toast({ title: 'Admin updated successfully' });
      setEditingAdminId(null);
      await fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error updating admin', description: error.message, variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const startEditSupervisor = (sup: UserWithRoles) => {
    const details = supervisorDetails.find(s => s.user_id === sup.user_id);
    setEditingSupervisorId(sup.user_id);
    setEditSupName(sup.full_name || '');
    setEditSupDepartment(sup.department || '');
    setEditSupSchool(sup.school || '');
    setEditSupResearchAreas(details?.research_areas?.join(', ') || '');
    setEditSupMaxProjects(String(details?.max_projects || 5));
    setEditSupOfficeLocation(details?.office_location || '');
  };

  const cancelSupEdit = () => {
    setEditingSupervisorId(null);
    setEditSupName(''); setEditSupDepartment(''); setEditSupSchool('');
    setEditSupResearchAreas(''); setEditSupMaxProjects('5'); setEditSupOfficeLocation('');
  };

  const saveSupEdit = async () => {
    if (!editingSupervisorId || !editSupName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSavingSupEdit(true);
    try {
      const response = await supabase.functions.invoke('create-supervisor', {
        body: {
          action: 'update',
          user_id: editingSupervisorId,
          full_name: editSupName.trim(),
          department: editSupDepartment.trim() || null,
          school: editSupSchool.trim() || null,
          research_areas: editSupResearchAreas ? editSupResearchAreas.split(',').map(s => s.trim()).filter(Boolean) : [],
          max_projects: parseInt(editSupMaxProjects) || 5,
          office_location: editSupOfficeLocation.trim() || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Supervisor updated successfully' });
      cancelSupEdit();
      await Promise.all([fetchUsers(), fetchSupervisorDetails()]);
    } catch (error: any) {
      toast({ title: 'Error updating supervisor', description: error.message, variant: 'destructive' });
    } finally {
      setSavingSupEdit(false);
    }
  };

  const handleDeleteSupervisor = async () => {
    if (!supToDelete) return;
    setDeleteSupLoading(true);
    try {
      const response = await supabase.functions.invoke('create-supervisor', {
        body: { action: 'delete', user_id: supToDelete.user_id },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Supervisor Deleted', description: `${supToDelete.full_name || supToDelete.email} has been removed.` });
      setIsDeleteSupDialogOpen(false);
      setSupToDelete(null);
      await Promise.all([fetchUsers(), fetchSupervisorDetails()]);
    } catch (error: any) {
      toast({ title: 'Error deleting supervisor', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteSupLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetUser || !resetPassword) return;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/;
    if (resetPassword.length < 8 || !passwordRegex.test(resetPassword)) {
      toast({ title: 'Password does not meet requirements', description: 'Must be 8+ chars with uppercase, lowercase, number, and special character.', variant: 'destructive' });
      return;
    }
    setResettingPassword(true);
    try {
      const response = await supabase.functions.invoke('reset-user-password', {
        body: { target_user_id: passwordResetUser.user_id, new_password: resetPassword },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: 'Password Reset', description: `Password has been reset for ${passwordResetUser.full_name || passwordResetUser.email}` });
      setIsPasswordResetOpen(false);
      setPasswordResetUser(null);
      setResetPassword('');
    } catch (error: any) {
      toast({ title: 'Error resetting password', description: error.message, variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setAuditLogs(data || []);
    } catch { console.error('Error fetching audit logs'); }
    finally { setAuditLoading(false); }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': case 'admin': return <Shield className="h-3 w-3" />;
      case 'supervisor': return <UserCog className="h-3 w-3" />;
      case 'student': return <GraduationCap className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getRoleVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'outline';
      case 'supervisor': return 'default';
      default: return 'secondary';
    }
  };

  if (roleLoading || loading) return <AuthenticatedLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AuthenticatedLayout>;
  if (!isSuperAdmin) return null;

  const adminUsers = users.filter(u => u.roles.includes('admin') || u.roles.includes('super_admin'));
  const supervisorUsers = users.filter(u => u.roles.includes('supervisor'));
  const supervisorCount = supervisorUsers.length;
  const studentCount = users.filter(u => u.roles.includes('student')).length;

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 animate-slide-up">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', value: users.length, icon: Users, gradient: 'from-primary to-primary-light' },
            { label: 'Admins', value: adminUsers.length, icon: Shield, gradient: 'from-destructive to-[hsl(0,80%,65%)]' },
            { label: 'Supervisors', value: supervisorCount, icon: UserCog, gradient: 'from-[hsl(200,80%,50%)] to-[hsl(200,80%,65%)]' },
            { label: 'Students', value: studentCount, icon: GraduationCap, gradient: 'from-[hsl(140,60%,45%)] to-[hsl(140,60%,60%)]' },
            { label: 'Groups', value: groupCount, icon: UsersRound, gradient: 'from-[hsl(270,60%,55%)] to-[hsl(270,60%,70%)]' },
          ].map((s, i) => (
            <Card key={i} className="group hover-lift cursor-default overflow-hidden border-transparent shadow-card hover:shadow-hover transition-all duration-300">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.gradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-[11px] text-muted-foreground font-medium">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs
          key={searchParams.toString()}
          defaultValue={
            searchParams.get('tab') === 'create-admin' ? 'create-admin'
              : searchParams.get('tab') === 'supervisors' ? 'supervisors'
              : searchParams.get('tab') === 'create-supervisor' ? 'create-supervisor'
              : searchParams.get('tab') === 'schools' ? 'schools'
              : searchParams.get('tab') === 'audit' || searchParams.get('tab') === 'audit-log' ? 'audit-log'
              : searchParams.get('tab') === 'admins' ? 'admins'
              : 'users'
          }
          className="space-y-4"
        >
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 mr-1.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="admins" className="text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Admins
            </TabsTrigger>
            <TabsTrigger value="supervisors" className="text-xs sm:text-sm">
              <UserCog className="h-3.5 w-3.5 mr-1.5" /> Supervisors
            </TabsTrigger>
            <TabsTrigger value="schools" className="text-xs sm:text-sm">
              <School className="h-3.5 w-3.5 mr-1.5" /> Schools
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="text-xs sm:text-sm" onClick={fetchAuditLogs}>
              <History className="h-3.5 w-3.5 mr-1.5" /> Audit Log
            </TabsTrigger>
            <TabsTrigger value="create-admin" className="text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Admin
            </TabsTrigger>
            <TabsTrigger value="create-supervisor" className="text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Supervisor
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div><CardTitle className="text-lg">All Users</CardTitle><CardDescription>{filteredUsers.length} users</CardDescription></div>
                  <div className="flex gap-2 items-center">
                    <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredUsers.map(u => ({ Name: u.full_name || '', Email: u.email, Department: u.department || '', School: u.school || '', Roles: u.roles.join(', '), Joined: new Date(u.created_at).toLocaleDateString() })), 'users')} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                    <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" /></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Roles</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{u.full_name || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.department || 'N/A'}</TableCell>
                          <TableCell><div className="flex flex-wrap gap-1">{u.roles.map(r => <Badge key={r} variant={getRoleVariant(r)} className="flex items-center gap-1 text-[10px]">{getRoleIcon(r)}{r}</Badge>)}{u.roles.length === 0 && <Badge variant="outline" className="text-[10px]">No roles</Badge>}</div></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedUser(u); setIsRoleDialogOpen(true); }}>Manage</Button>
                              {!u.roles.includes('super_admin') && (
                                <>
                                  <Button size="sm" variant="outline" className="text-primary hover:text-primary" onClick={() => { setPasswordResetUser(u); setIsPasswordResetOpen(true); }} title="Reset Password">
                                    <KeyRound className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setUserToDelete(u); setIsDeleteDialogOpen(true); }}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-destructive" /> Admin Accounts
                </CardTitle>
                <CardDescription>All admin accounts. You can edit name, department, and school.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Full Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>School</TableHead><TableHead>Role</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {adminUsers.map(admin => (
                        <TableRow key={admin.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{admin.full_name || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{admin.email}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{admin.department || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{admin.school || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {admin.roles.map(r => <Badge key={r} variant={getRoleVariant(r)} className="flex items-center gap-1 text-[10px]">{getRoleIcon(r)}{r}</Badge>)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {!admin.roles.includes('super_admin') && (
                              <Button size="sm" variant="outline" onClick={() => startEditAdmin(admin)} className="h-7 px-2">
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {adminUsers.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No admin accounts found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Passwords are securely hashed and cannot be displayed.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Admin Tab */}
          <TabsContent value="create-admin">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-destructive" /> Create New Admin Account
                </CardTitle>
                <CardDescription>Create new admin accounts with unique credentials.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name *</Label>
                    <Input id="admin-name" placeholder="e.g. John Doe" value={adminFullName} onChange={e => setAdminFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email Address *</Label>
                    <Input id="admin-email" type="email" placeholder="e.g. admin@hit.ac.zw" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password *</Label>
                    <div className="relative">
                      <Input id="admin-password" type={showPassword ? "text" : "password"} placeholder="Min 8 chars, uppercase, lowercase, number, special" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Must contain: 8+ characters, uppercase, lowercase, number, and special character</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-department">Department</Label>
                    <Input id="admin-department" placeholder="e.g. Computer Science" value={adminDepartment} onChange={e => setAdminDepartment(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-school">School</Label>
                    <Input id="admin-school" placeholder="e.g. School of IT" value={adminSchool} onChange={e => setAdminSchool(e.target.value)} />
                  </div>
                  <Button onClick={handleCreateAdmin} disabled={creatingAdmin || !adminEmail || !adminPassword || !adminFullName} className="w-full bg-gradient-to-r from-destructive to-[hsl(0,80%,65%)] hover:opacity-90 text-destructive-foreground">
                    {creatingAdmin ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Plus className="h-4 w-4 mr-2" /> Create Admin Account</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supervisors Tab */}
          <TabsContent value="supervisors">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-primary" /> Supervisor Accounts
                </CardTitle>
                <CardDescription>
                  All registered supervisors. Supervisors are added exclusively by the super admin — they do not self-register.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Research Areas</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {supervisorUsers.map(sup => {
                        const details = supervisorDetails.find(s => s.user_id === sup.user_id);
                        return (
                          <TableRow key={sup.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">{sup.full_name || 'N/A'}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{sup.email}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{sup.department || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {details?.research_areas?.map((area: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-[10px]">{area}</Badge>
                                ))}
                                {(!details?.research_areas || details.research_areas.length === 0) && <span className="text-muted-foreground text-xs">None set</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={details?.current_projects >= details?.max_projects ? "destructive" : "secondary"} className="text-[10px]">
                                {details?.current_projects || 0}/{details?.max_projects || 5}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{details?.office_location || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => startEditSupervisor(sup)} className="h-7 px-2">
                                  <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => { setSupToDelete(sup); setIsDeleteSupDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {supervisorUsers.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No supervisors found. Add one using the "Add Supervisor" tab.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <UserCog className="h-3 w-3" /> Supervisor accounts are managed centrally. They log in with credentials provided by the super admin.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Supervisor Tab */}
          <TabsContent value="create-supervisor">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-primary" /> Add New Supervisor
                </CardTitle>
                <CardDescription>
                  Create a supervisor account with login credentials. The supervisor will use these credentials to access the system — they do not self-register.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="sup-name">Full Name *</Label>
                    <Input id="sup-name" placeholder="e.g. Dr. Jane Smith" value={supFullName} onChange={e => setSupFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sup-email">Email Address *</Label>
                    <Input id="sup-email" type="email" placeholder="e.g. jsmith@hit.ac.zw" value={supEmail} onChange={e => setSupEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sup-password">Password *</Label>
                    <div className="relative">
                      <Input id="sup-password" type={showSupPassword ? "text" : "password"} placeholder="Min 8 chars, uppercase, lowercase, number, special" value={supPassword} onChange={e => setSupPassword(e.target.value)} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSupPassword(!showSupPassword)}>
                        {showSupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Must contain: 8+ characters, uppercase, lowercase, number, and special character</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="sup-department">Department</Label>
                      <Input id="sup-department" placeholder="e.g. Computer Science" value={supDepartment} onChange={e => setSupDepartment(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sup-school">School</Label>
                      <Input id="sup-school" placeholder="e.g. School of IT" value={supSchool} onChange={e => setSupSchool(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sup-research">Research Areas</Label>
                    <Input id="sup-research" placeholder="e.g. AI, Machine Learning, IoT (comma-separated)" value={supResearchAreas} onChange={e => setSupResearchAreas(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Separate multiple areas with commas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="sup-max">Max Projects</Label>
                      <Input id="sup-max" type="number" min="1" max="20" value={supMaxProjects} onChange={e => setSupMaxProjects(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sup-office">Office Location</Label>
                      <Input id="sup-office" placeholder="e.g. Block A, Room 204" value={supOfficeLocation} onChange={e => setSupOfficeLocation(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleCreateSupervisor} disabled={creatingSupervisor || !supEmail || !supPassword || !supFullName} className="w-full bg-gradient-to-r from-primary to-primary-light hover:opacity-90 text-primary-foreground">
                    {creatingSupervisor ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Plus className="h-4 w-4 mr-2" /> Create Supervisor Account</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" /> Audit Log
                    </CardTitle>
                    <CardDescription>Track all profile changes, role modifications, and password resets.</CardDescription>
                  </div>
                  {auditLogs.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => exportToCSV(auditLogs.map(log => {
                      const changedBy = users.find(u => u.user_id === log.user_id);
                      const targetUser = users.find(u => u.user_id === log.target_user_id);
                      return { Date: new Date(log.created_at).toLocaleString(), Action: log.action, Table: log.table_name, ChangedBy: changedBy?.full_name || changedBy?.email || log.user_id, Target: targetUser?.full_name || targetUser?.email || log.target_user_id || '' };
                    }), 'audit_log')} className="gap-1.5 shrink-0">
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No audit entries yet. Changes will appear here automatically.</p>
                ) : (
                  <div className="rounded-md border max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Changed By</TableHead>
                        <TableHead>Target User</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {auditLogs.map(log => {
                          const changedBy = users.find(u => u.user_id === log.user_id);
                          const targetUser = users.find(u => u.user_id === log.target_user_id);
                          const changes = log.action === 'UPDATE' && log.old_values && log.new_values
                            ? Object.keys(log.new_values).filter(k => k !== 'updated_at' && JSON.stringify(log.old_values[k]) !== JSON.stringify(log.new_values[k]))
                            : [];
                          return (
                            <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant={log.action === 'INSERT' ? 'default' : log.action === 'DELETE' ? 'destructive' : 'secondary'} className="text-[10px]">
                                  {log.action === 'PASSWORD_RESET' ? 'Password Reset' : log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{log.table_name}</TableCell>
                              <TableCell className="text-xs">{changedBy?.full_name || changedBy?.email || log.user_id?.slice(0, 8)}</TableCell>
                              <TableCell className="text-xs">{targetUser?.full_name || targetUser?.email || log.target_user_id?.slice(0, 8) || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {changes.length > 0 ? changes.map(k => `${k}: ${JSON.stringify(log.old_values[k])} → ${JSON.stringify(log.new_values[k])}`).join(', ') : log.action === 'PASSWORD_RESET' ? 'Password was reset by admin' : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schools Tab */}
          <TabsContent value="schools">
            <SchoolManagement />
          </TabsContent>
        </Tabs>

        {/* Role Management Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Manage Roles</DialogTitle><DialogDescription>{selectedUser?.email}</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div><h4 className="text-sm font-medium mb-2">Current Roles</h4>
                <div className="flex flex-wrap gap-2">{selectedUser?.roles.map(r => (
                  <Badge key={r} variant={getRoleVariant(r)} className="flex items-center gap-2">
                    {getRoleIcon(r)}{r}
                    {r !== 'super_admin' && (
                      <button onClick={() => handleRemoveRole(selectedUser.user_id, r as AppRole)} disabled={actionLoading} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </Badge>
                ))}{selectedUser?.roles.length === 0 && <p className="text-sm text-muted-foreground">No roles</p>}</div>
              </div>
              <div><h4 className="text-sm font-medium mb-2">Add Role</h4>
                <div className="flex gap-2">
                  <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddRole} disabled={!newRole || actionLoading}>Add</Button>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => { setIsRoleDialogOpen(false); setNewRole(''); }}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={editingAdminId !== null} onOpenChange={(open) => { if (!open) cancelEdit(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4 text-primary" /> Edit Admin Details</DialogTitle>
              <DialogDescription>Update admin account information.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label htmlFor="edit-name">Full Name *</Label><Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="edit-department">Department</Label><Input id="edit-department" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="edit-school">School</Label><Input id="edit-school" value={editSchool} onChange={e => setEditSchool(e.target.value)} /></div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
              <Button onClick={() => editingAdminId && saveAdminEdit(editingAdminId)} disabled={savingEdit || !editName.trim()}>
                {savingEdit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Supervisor Dialog */}
        <Dialog open={editingSupervisorId !== null} onOpenChange={(open) => { if (!open) cancelSupEdit(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4 text-primary" /> Edit Supervisor Details</DialogTitle>
              <DialogDescription>Update supervisor information including research areas and capacity.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Full Name *</Label><Input value={editSupName} onChange={e => setEditSupName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Department</Label><Input value={editSupDepartment} onChange={e => setEditSupDepartment(e.target.value)} /></div>
                <div className="space-y-2"><Label>School</Label><Input value={editSupSchool} onChange={e => setEditSupSchool(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Research Areas</Label><Input value={editSupResearchAreas} onChange={e => setEditSupResearchAreas(e.target.value)} placeholder="Comma-separated" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Max Projects</Label><Input type="number" min="1" max="20" value={editSupMaxProjects} onChange={e => setEditSupMaxProjects(e.target.value)} /></div>
                <div className="space-y-2"><Label>Office Location</Label><Input value={editSupOfficeLocation} onChange={e => setEditSupOfficeLocation(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={cancelSupEdit}>Cancel</Button>
              <Button onClick={saveSupEdit} disabled={savingSupEdit || !editSupName.trim()}>
                {savingSupEdit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) { setIsDeleteDialogOpen(false); setUserToDelete(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete <span className="font-semibold text-foreground">{userToDelete?.full_name || userToDelete?.email}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border p-3 bg-destructive/5 space-y-1">
              <p className="text-sm"><span className="text-muted-foreground">Name:</span> {userToDelete?.full_name || 'N/A'}</p>
              <p className="text-sm"><span className="text-muted-foreground">Email:</span> {userToDelete?.email}</p>
              <p className="text-sm"><span className="text-muted-foreground">Roles:</span> {userToDelete?.roles.join(', ') || 'None'}</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setUserToDelete(null); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteLoading}>
                {deleteLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" /> Delete User</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Supervisor Dialog */}
        <Dialog open={isDeleteSupDialogOpen} onOpenChange={(open) => { if (!open) { setIsDeleteSupDialogOpen(false); setSupToDelete(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete Supervisor</DialogTitle>
              <DialogDescription>
                This will permanently remove <span className="font-semibold text-foreground">{supToDelete?.full_name || supToDelete?.email}</span>'s account, profile, and all associated data including project assignments. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border p-3 bg-destructive/5 space-y-1">
              <p className="text-sm"><span className="text-muted-foreground">Name:</span> {supToDelete?.full_name || 'N/A'}</p>
              <p className="text-sm"><span className="text-muted-foreground">Email:</span> {supToDelete?.email}</p>
              <p className="text-sm"><span className="text-muted-foreground">Department:</span> {supToDelete?.department || 'N/A'}</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsDeleteSupDialogOpen(false); setSupToDelete(null); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteSupervisor} disabled={deleteSupLoading}>
                {deleteSupLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" /> Delete Supervisor</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isPasswordResetOpen} onOpenChange={(open) => { if (!open) { setIsPasswordResetOpen(false); setPasswordResetUser(null); setResetPassword(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Reset User Password</DialogTitle>
              <DialogDescription>
                Set a new password for <span className="font-semibold text-foreground">{passwordResetUser?.full_name || passwordResetUser?.email}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-md border p-3 bg-muted/50 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Name:</span> {passwordResetUser?.full_name || 'N/A'}</p>
                <p className="text-sm"><span className="text-muted-foreground">Email:</span> {passwordResetUser?.email}</p>
                <p className="text-sm"><span className="text-muted-foreground">Roles:</span> {passwordResetUser?.roles.join(', ') || 'None'}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-pw">New Password *</Label>
                <div className="relative">
                  <Input id="reset-pw" type={showResetPassword ? "text" : "password"} placeholder="Min 8 chars, uppercase, lowercase, number, special" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowResetPassword(!showResetPassword)}>
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must contain: 8+ characters, uppercase, lowercase, number, and special character</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsPasswordResetOpen(false); setPasswordResetUser(null); setResetPassword(''); }}>Cancel</Button>
              <Button onClick={handleResetPassword} disabled={resettingPassword || !resetPassword}>
                {resettingPassword ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...</> : <><KeyRound className="h-4 w-4 mr-2" /> Reset Password</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default UserManagement;
