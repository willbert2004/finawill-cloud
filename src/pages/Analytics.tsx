import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { 
  Download, FileText, Table as TableIcon, TrendingUp, Users, FolderKanban, 
  GitBranch, Loader2, ArrowLeft, AlertTriangle, Copy, XCircle, Clock
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

interface DuplicateProject {
  id: string;
  title: string;
  department: string | null;
  status: string;
  similarity_score: number | null;
  student_name: string;
  created_at: string;
}

interface FailureProject {
  id: string;
  title: string;
  department: string | null;
  status: string;
  rejection_reason: string | null;
  student_name: string;
  created_at: string;
  updated_at: string;
  days_stuck: number;
}

interface AnalyticsData {
  projectsByStatus: { name: string; value: number; color: string }[];
  allocationsByStatus: { name: string; value: number }[];
  supervisorWorkload: { name: string; current: number; max: number }[];
  projectsByDepartment: { department: string; count: number }[];
  monthlyProjects: { month: string; projects: number; allocations: number }[];
  duplicates: DuplicateProject[];
  duplicatesByDept: { department: string; count: number }[];
  similarityDistribution: { range: string; count: number }[];
  // Failure patterns
  rejectionReasons: { reason: string; count: number }[];
  failureByDept: { department: string; rejected: number; needs_revision: number }[];
  atRiskProjects: FailureProject[];
  failureTotals: { rejected: number; needsRevision: number; atRisk: number };
  totals: {
    totalProjects: number;
    totalAllocations: number;
    pendingAllocations: number;
    totalSupervisors: number;
    totalStudents: number;
    totalGroups: number;
    totalDuplicates: number;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
        toast({ title: 'Access Denied', description: 'Admin access required', variant: 'destructive' });
      } else {
        fetchAnalyticsData();

        // Subscribe to realtime changes on all relevant tables
        const channel = supabase
          .channel('analytics-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchAnalyticsData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_allocations' }, () => fetchAnalyticsData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'group_allocations' }, () => fetchAnalyticsData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAnalyticsData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'student_groups' }, () => fetchAnalyticsData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'supervisors' }, () => fetchAnalyticsData())
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const [
        { data: projects },
        { data: allocations },
        { data: groupAllocations },
        { data: supervisors },
        { data: students },
        { data: groups },
        { data: allProfiles }
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('pending_allocations').select('*'),
        supabase.from('group_allocations').select('*'),
        supabase.from('profiles').select('*').eq('user_type', 'supervisor'),
        supabase.from('profiles').select('*').eq('user_type', 'student'),
        supabase.from('student_groups').select('*'),
        supabase.from('profiles').select('user_id, full_name, email')
      ]);

      const profileMap = new Map<string, string>();
      allProfiles?.forEach(p => profileMap.set(p.user_id, p.full_name || p.email));

      // Project status distribution
      const statusCounts: Record<string, number> = {};
      projects?.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      
      const statusColors: Record<string, string> = {
        pending: 'hsl(38, 92%, 50%)',
        approved: 'hsl(142, 76%, 36%)',
        rejected: 'hsl(0, 84%, 60%)',
        finalized: 'hsl(var(--primary))',
        archived: 'hsl(var(--muted-foreground))'
      };

      const projectsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: statusColors[name] || 'hsl(var(--primary))'
      }));

      // Allocation status
      const allAllocations = [...(allocations || []), ...(groupAllocations || [])];
      const allocationCounts: Record<string, number> = {};
      allAllocations.forEach(a => {
        allocationCounts[a.status] = (allocationCounts[a.status] || 0) + 1;
      });

      const allocationsByStatus = Object.entries(allocationCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // Supervisor workload
      const supervisorWorkload = (supervisors || []).slice(0, 10).map(s => {
        const fullName = s.full_name || s.email.split('@')[0];
        const cleanName = fullName.replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s*/i, '').trim();
        const displayName = cleanName || fullName;
        return {
          name: displayName.length > 20 ? displayName.slice(0, 18) + '…' : displayName,
          current: s.current_projects || 0,
          max: s.max_projects || 5
        };
      });

      // Projects by department
      const deptCounts: Record<string, number> = {};
      projects?.forEach(p => {
        const dept = p.department || 'Unassigned';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const projectsByDepartment = Object.entries(deptCounts).map(([department, count]) => ({
        department: department.length > 15 ? department.slice(0, 15) + '...' : department,
        count
      }));

      // Monthly trends
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData: Record<string, { projects: number; allocations: number }> = {};
      
      projects?.forEach(p => {
        const month = new Date(p.created_at).getMonth();
        const key = monthNames[month];
        if (!monthlyData[key]) monthlyData[key] = { projects: 0, allocations: 0 };
        monthlyData[key].projects++;
      });

      allAllocations.forEach(a => {
        const month = new Date(a.created_at).getMonth();
        const key = monthNames[month];
        if (!monthlyData[key]) monthlyData[key] = { projects: 0, allocations: 0 };
        monthlyData[key].allocations++;
      });

      const monthlyProjects = monthNames.slice(0, new Date().getMonth() + 1).map(month => ({
        month,
        projects: monthlyData[month]?.projects || 0,
        allocations: monthlyData[month]?.allocations || 0
      }));

      // Duplicates data
      const duplicateProjects = (projects || []).filter(p => p.is_duplicate === true);
      const duplicates: DuplicateProject[] = duplicateProjects.map(p => ({
        id: p.id,
        title: p.title,
        department: p.department,
        status: p.status,
        similarity_score: p.similarity_score ? Number(p.similarity_score) : null,
        student_name: profileMap.get(p.student_id) || 'Unknown',
        created_at: p.created_at,
      }));

      // Duplicates by department
      const dupDeptCounts: Record<string, number> = {};
      duplicateProjects.forEach(p => {
        const dept = p.department || 'Unassigned';
        dupDeptCounts[dept] = (dupDeptCounts[dept] || 0) + 1;
      });
      const duplicatesByDept = Object.entries(dupDeptCounts).map(([department, count]) => ({
        department: department.length > 20 ? department.slice(0, 18) + '...' : department,
        count
      }));

      // Similarity score distribution
      const ranges = [
        { range: '0-20%', min: 0, max: 20 },
        { range: '21-40%', min: 21, max: 40 },
        { range: '41-60%', min: 41, max: 60 },
        { range: '61-80%', min: 61, max: 80 },
        { range: '81-100%', min: 81, max: 100 },
      ];
      const similarityDistribution = ranges.map(r => ({
        range: r.range,
        count: duplicateProjects.filter(p => {
          const score = p.similarity_score ? Number(p.similarity_score) : 0;
          return score >= r.min && score <= r.max;
        }).length
      }));

      // === Failure Patterns ===
      const now = new Date();
      const rejectedProjects = (projects || []).filter(p => p.status === 'rejected');
      const needsRevisionProjects = (projects || []).filter(p => p.status === 'needs_revision');
      const staleStatuses = ['pending', 'needs_revision'];
      const staleDays = 14;
      const atRiskProjects: FailureProject[] = (projects || [])
        .filter(p => staleStatuses.includes(p.status))
        .map(p => {
          const updated = new Date(p.updated_at);
          const days = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: p.id,
            title: p.title,
            department: p.department,
            status: p.status,
            rejection_reason: p.rejection_reason,
            student_name: profileMap.get(p.student_id) || 'Unknown',
            created_at: p.created_at,
            updated_at: p.updated_at,
            days_stuck: days,
          };
        })
        .filter(p => p.days_stuck >= staleDays)
        .sort((a, b) => b.days_stuck - a.days_stuck);

      // Rejection reasons breakdown
      const reasonCounts: Record<string, number> = {};
      rejectedProjects.forEach(p => {
        const reason = p.rejection_reason?.trim() || 'No reason given';
        const short = reason.length > 40 ? reason.slice(0, 38) + '…' : reason;
        reasonCounts[short] = (reasonCounts[short] || 0) + 1;
      });
      const rejectionReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Failure by department
      const failDeptMap: Record<string, { rejected: number; needs_revision: number }> = {};
      [...rejectedProjects, ...needsRevisionProjects].forEach(p => {
        const dept = p.department || 'Unassigned';
        if (!failDeptMap[dept]) failDeptMap[dept] = { rejected: 0, needs_revision: 0 };
        if (p.status === 'rejected') failDeptMap[dept].rejected++;
        else failDeptMap[dept].needs_revision++;
      });
      const failureByDept = Object.entries(failDeptMap).map(([department, vals]) => ({
        department: department.length > 20 ? department.slice(0, 18) + '…' : department,
        ...vals
      }));

      setData({
        projectsByStatus,
        allocationsByStatus,
        supervisorWorkload,
        projectsByDepartment,
        monthlyProjects,
        duplicates,
        duplicatesByDept,
        similarityDistribution,
        rejectionReasons,
        failureByDept,
        atRiskProjects,
        failureTotals: {
          rejected: rejectedProjects.length,
          needsRevision: needsRevisionProjects.length,
          atRisk: atRiskProjects.length,
        },
        totals: {
          totalProjects: projects?.length || 0,
          totalAllocations: allAllocations.length,
          pendingAllocations: allAllocations.filter(a => a.status === 'pending').length,
          totalSupervisors: supervisors?.length || 0,
          totalStudents: students?.length || 0,
          totalGroups: groups?.length || 0,
          totalDuplicates: duplicateProjects.length
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({ title: 'Error', description: 'Failed to load analytics data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: 'projects' | 'allocations' | 'supervisors' | 'all') => {
    try {
      let exportContent = '';
      let filename = '';

      if (type === 'projects' || type === 'all') {
        const { data: projects } = await supabase.from('projects').select('*');
        if (exportFormat === 'csv') {
          const headers = ['Title', 'Description', 'Status', 'Department', 'Year', 'Created At'];
          const rows = projects?.map(p => [
            `"${p.title}"`, `"${p.description?.slice(0, 100)}"`, p.status, p.department || '', p.year, p.created_at
          ]);
          exportContent += 'PROJECTS\n' + headers.join(',') + '\n' + rows?.map(r => r.join(',')).join('\n') + '\n\n';
        } else {
          exportContent = JSON.stringify({ projects }, null, 2);
        }
        filename = `projects_export_${new Date().toISOString().split('T')[0]}`;
      }

      if (type === 'allocations' || type === 'all') {
        const { data: allocations } = await supabase.from('group_allocations').select('*, student_groups(name)');
        if (exportFormat === 'csv') {
          const headers = ['Group', 'Status', 'Match Score', 'Created At'];
          const rows = allocations?.map(a => [
            `"${(a.student_groups as any)?.name || 'N/A'}"`, a.status, a.match_score, a.created_at
          ]);
          exportContent += 'ALLOCATIONS\n' + headers.join(',') + '\n' + rows?.map(r => r.join(',')).join('\n') + '\n\n';
        } else {
          exportContent = JSON.stringify({ allocations }, null, 2);
        }
        filename = type === 'all' ? filename : `allocations_export_${new Date().toISOString().split('T')[0]}`;
      }

      if (type === 'supervisors' || type === 'all') {
        const { data: supervisors } = await supabase.from('profiles').select('*').eq('user_type', 'supervisor');
        if (exportFormat === 'csv') {
          const headers = ['Name', 'Email', 'Department', 'Current Projects', 'Max Projects'];
          const rows = supervisors?.map(s => [
            `"${s.full_name || ''}"`, s.email, s.department || '', s.current_projects, s.max_projects
          ]);
          exportContent += 'SUPERVISORS\n' + headers.join(',') + '\n' + rows?.map(r => r.join(',')).join('\n');
        } else {
          exportContent = JSON.stringify({ supervisors }, null, 2);
        }
        filename = type === 'all' ? `full_report_${new Date().toISOString().split('T')[0]}` : `supervisors_export_${new Date().toISOString().split('T')[0]}`;
      }

      // Download file
      const blob = new Blob([exportContent], { type: exportFormat === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Export Complete', description: `${type} data exported successfully` });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Could not export data', variant: 'destructive' });
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                {isSuperAdmin ? 'Comprehensive insights and reports' : 'Project analytics overview (read-only)'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Projects', value: data?.totals.totalProjects, icon: FolderKanban, gradient: 'from-primary to-primary-light' },
            { label: 'Duplicates', value: data?.totals.totalDuplicates, icon: Copy, gradient: 'from-[hsl(0,84%,60%)] to-[hsl(38,92%,50%)]' },
            { label: 'Allocations', value: data?.totals.totalAllocations, icon: GitBranch, gradient: 'from-secondary to-secondary-light' },
            { label: 'Pending', value: data?.totals.pendingAllocations, icon: TrendingUp, gradient: 'from-[hsl(var(--accent-gold))] to-[hsl(40,90%,65%)]' },
            { label: 'Supervisors', value: data?.totals.totalSupervisors, icon: Users, gradient: 'from-success to-[hsl(160,80%,45%)]' },
            { label: 'Students', value: data?.totals.totalStudents, icon: Users, gradient: 'from-primary-dark to-primary' },
          ].map((item, i) => (
            <Card key={i} className="group hover-lift cursor-default overflow-hidden border-transparent shadow-card hover:shadow-hover transition-all duration-300">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.gradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value || 0}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className={`grid w-full max-w-2xl ${isSuperAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="charts">Charts & Insights</TabsTrigger>
            <TabsTrigger value="duplicates" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Duplicates
              {(data?.totals.totalDuplicates || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{data?.totals.totalDuplicates}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="failures" className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Failure Patterns
              {(data?.failureTotals?.rejected || 0) > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{data?.failureTotals.rejected}</Badge>
              )}
            </TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="export">Export Reports</TabsTrigger>}
          </TabsList>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Project Status Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Status Distribution</CardTitle>
                  <CardDescription>Breakdown of projects by current status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data?.projectsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data?.projectsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Allocation Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Allocation Status</CardTitle>
                  <CardDescription>Current allocation request statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data?.allocationsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Supervisor Workload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Supervisor Workload</CardTitle>
                  <CardDescription>Current vs maximum project capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data?.supervisorWorkload} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="current" fill="hsl(var(--primary))" name="Current" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="max" fill="hsl(var(--muted))" name="Max Capacity" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Projects by Department */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Projects by Department</CardTitle>
                  <CardDescription>Distribution across departments</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data?.projectsByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="department" className="text-xs" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Trends</CardTitle>
                <CardDescription>Projects and allocations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.monthlyProjects}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="projects" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="Projects" />
                    <Area type="monotone" dataKey="allocations" stackId="2" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} name="Allocations" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-6">
            {/* Duplicate Insights Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Similarity Score Distribution
                  </CardTitle>
                  <CardDescription>How similar are the flagged duplicate projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data?.similarityDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="range" className="text-xs" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                        {data?.similarityDistribution.map((_, index) => (
                          <Cell key={index} fill={['hsl(142, 76%, 36%)', 'hsl(142, 60%, 50%)', 'hsl(38, 92%, 50%)', 'hsl(0, 60%, 55%)', 'hsl(0, 84%, 50%)'][index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Duplicates by Department</CardTitle>
                  <CardDescription>Which departments have the most flagged duplicates</CardDescription>
                </CardHeader>
                <CardContent>
                  {(data?.duplicatesByDept?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data?.duplicatesByDept} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="department" type="category" width={120} className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="count" name="Duplicates" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No duplicates found — great!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Duplicates Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  All Flagged Duplicate Projects ({data?.duplicates?.length || 0})
                </CardTitle>
                <CardDescription>
                  Projects automatically flagged by the duplicate detection system based on title and description similarity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(data?.duplicates?.length || 0) > 0 ? (
                  <div className="rounded-md border overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Similarity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.duplicates.map((dup) => (
                          <TableRow key={dup.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${dup.id}`)}>
                            <TableCell className="font-medium max-w-[200px] truncate">{dup.title}</TableCell>
                            <TableCell>{dup.student_name}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{dup.department || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                (dup.similarity_score || 0) >= 80 ? 'destructive' :
                                (dup.similarity_score || 0) >= 50 ? 'secondary' : 'outline'
                              }>
                                {dup.similarity_score != null ? `${dup.similarity_score}%` : 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{dup.status}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(dup.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No duplicate projects detected</p>
                    <p className="text-sm">The system hasn't flagged any projects as duplicates yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Failure Patterns Tab */}
          <TabsContent value="failures" className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Rejected Projects', value: data?.failureTotals?.rejected || 0, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
                { label: 'Needs Revision', value: data?.failureTotals?.needsRevision || 0, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
                { label: 'At-Risk (14+ days stale)', value: data?.failureTotals?.atRisk || 0, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Rejection Reasons */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Common Rejection Reasons
                  </CardTitle>
                  <CardDescription>Top reasons projects are rejected</CardDescription>
                </CardHeader>
                <CardContent>
                  {(data?.rejectionReasons?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data?.rejectionReasons} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="reason" type="category" width={160} className="text-[10px]" />
                        <Tooltip />
                        <Bar dataKey="count" name="Rejections" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      <p>No rejected projects yet — great!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Failures by Department */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Problem Status by Department</CardTitle>
                  <CardDescription>Rejected &amp; needs revision per department</CardDescription>
                </CardHeader>
                <CardContent>
                  {(data?.failureByDept?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data?.failureByDept}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="department" className="text-xs" angle={-45} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="rejected" name="Rejected" fill="hsl(0, 84%, 60%)" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="needs_revision" name="Needs Revision" fill="hsl(38, 92%, 50%)" stackId="a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      <p>No failures across departments</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* At-Risk Projects Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  At-Risk Projects ({data?.atRiskProjects?.length || 0})
                </CardTitle>
                <CardDescription>
                  Projects stuck in pending or needs_revision for 14+ days without updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(data?.atRiskProjects?.length || 0) > 0 ? (
                  <div className="rounded-md border overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Days Stuck</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.atRiskProjects.map((p) => (
                          <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${p.id}`)}>
                            <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                            <TableCell>{p.student_name}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{p.department || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'needs_revision' ? 'secondary' : 'outline'} className="capitalize">{p.status.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.days_stuck >= 30 ? 'destructive' : 'secondary'}>
                                {p.days_stuck} days
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No at-risk projects</p>
                    <p className="text-sm">All projects are progressing within expected timelines.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          {isSuperAdmin && (
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Reports</CardTitle>
                <CardDescription>Download data in CSV or JSON format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Export Format:</span>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'json')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { type: 'projects', label: 'Projects Report', desc: 'All project data', icon: FolderKanban },
                    { type: 'allocations', label: 'Allocations Report', desc: 'Allocation data', icon: GitBranch },
                    { type: 'supervisors', label: 'Supervisors Report', desc: 'Supervisor workload', icon: Users },
                    { type: 'all', label: 'Full Report', desc: 'Complete dataset', icon: FileText },
                  ].map((item) => (
                    <Card key={item.type} className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => exportData(item.type as any)}>
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                        <item.icon className="h-8 w-8 text-primary" />
                        <h3 className="font-medium">{item.label}</h3>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                        <Button size="sm" variant="outline" className="mt-2">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}