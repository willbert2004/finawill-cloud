import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, GraduationCap, Building2, ChevronDown, ChevronRight } from 'lucide-react';

interface School {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Department {
  id: string;
  school_id: string;
  name: string;
  is_active: boolean;
}

export default function SchoolManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);

  // School form
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [saving, setSaving] = useState(false);

  // Department form
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptSchoolId, setDeptSchoolId] = useState('');

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'school' | 'department'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [{ data: s }, { data: d }] = await Promise.all([
        supabase.from('schools').select('*').order('name'),
        supabase.from('departments').select('*').order('name'),
      ]);
      setSchools(s || []);
      setDepartments(d || []);
    } catch { toast({ title: 'Error loading data', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleSaveSchool = async () => {
    if (!schoolName.trim()) { toast({ title: 'School name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editingSchool) {
        const { error } = await supabase.from('schools').update({ name: schoolName.trim() }).eq('id', editingSchool.id);
        if (error) throw error;
        toast({ title: 'School updated' });
      } else {
        const { error } = await supabase.from('schools').insert({ name: schoolName.trim() });
        if (error) throw error;
        toast({ title: 'School added' });
      }
      setSchoolDialogOpen(false);
      setEditingSchool(null);
      setSchoolName('');
      fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleSaveDept = async () => {
    if (!deptName.trim() || !deptSchoolId) { toast({ title: 'All fields required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editingDept) {
        const { error } = await supabase.from('departments').update({ name: deptName.trim() }).eq('id', editingDept.id);
        if (error) throw error;
        toast({ title: 'Department updated' });
      } else {
        const { error } = await supabase.from('departments').insert({ school_id: deptSchoolId, name: deptName.trim() });
        if (error) throw error;
        toast({ title: 'Department added' });
      }
      setDeptDialogOpen(false);
      setEditingDept(null);
      setDeptName('');
      setDeptSchoolId('');
      fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (type: 'school' | 'department', id: string, current: boolean) => {
    try {
      const table = type === 'school' ? 'schools' : 'departments';
      const { error } = await supabase.from(table).update({ is_active: !current }).eq('id', id);
      if (error) throw error;
      toast({ title: `${type === 'school' ? 'School' : 'Department'} ${!current ? 'enabled' : 'disabled'}` });
      fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const table = deleteTarget.type === 'school' ? 'schools' : 'departments';
      const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: `${deleteTarget.type === 'school' ? 'School' : 'Department'} deleted` });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setDeleting(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" /> Schools & Departments
              </CardTitle>
              <CardDescription>{schools.length} schools, {departments.length} departments</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditingSchool(null); setSchoolName(''); setSchoolDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> School
              </Button>
              <Button size="sm" onClick={() => { setEditingDept(null); setDeptName(''); setDeptSchoolId(''); setDeptDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Department
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Departments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map(school => {
                  const schoolDepts = departments.filter(d => d.school_id === school.id);
                  const isExpanded = expandedSchool === school.id;
                  return (
                    <>
                      <TableRow key={school.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedSchool(isExpanded ? null : school.id)}>
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{schoolDepts.length} dept{schoolDepts.length !== 1 ? 's' : ''}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch checked={school.is_active} onCheckedChange={() => handleToggleActive('school', school.id, school.is_active)} onClick={e => e.stopPropagation()} />
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setEditingSchool(school); setSchoolName(school.name); setSchoolDialogOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => { setDeleteTarget({ type: 'school', id: school.id, name: school.name }); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && schoolDepts.map(dept => (
                        <TableRow key={dept.id} className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell className="pl-8 text-sm flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {dept.name}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Switch checked={dept.is_active} onCheckedChange={() => handleToggleActive('department', dept.id, dept.is_active)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setEditingDept(dept); setDeptName(dept.name); setDeptSchoolId(dept.school_id); setDeptDialogOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => { setDeleteTarget({ type: 'department', id: dept.id, name: dept.name }); setDeleteDialogOpen(true); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {isExpanded && schoolDepts.length === 0 && (
                        <TableRow key={`${school.id}-empty`} className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={4} className="pl-8 text-sm text-muted-foreground italic">No departments yet</TableCell>
                        </TableRow>
                      )}
                      {isExpanded && (
                        <TableRow key={`${school.id}-add`} className="bg-muted/20">
                          <TableCell></TableCell>
                          <TableCell colSpan={4} className="pl-8">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-primary hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDept(null);
                                setDeptName('');
                                setDeptSchoolId(school.id);
                                setDeptDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Department to {school.name}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                {schools.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No schools added yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit School Dialog */}
      <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchool ? 'Edit School' : 'Add New School'}</DialogTitle>
            <DialogDescription>Students will see this school during registration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>School Name *</Label>
              <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. School of Engineering and Technology" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchoolDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSchool} disabled={saving || !schoolName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingSchool ? 'Save Changes' : 'Add School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>This department will appear under the selected school.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>School *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={deptSchoolId}
                onChange={e => setDeptSchoolId(e.target.value)}
                disabled={!!editingDept}
              >
                <option value="">Select a school</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="e.g. Computer Science" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDept} disabled={saving || !deptName.trim() || !deptSchoolId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingDept ? 'Save Changes' : 'Add Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete {deleteTarget?.type === 'school' ? 'School' : 'Department'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              {deleteTarget?.type === 'school' && ' This will also delete all departments under it.'}
              {' '}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
