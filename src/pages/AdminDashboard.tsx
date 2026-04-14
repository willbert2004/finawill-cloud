import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useProjectStats } from '@/hooks/useProjectStats';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, FolderKanban, GitBranch, UserCog, Activity, Shield, Sparkles, ArrowUpRight, Clock, BarChart3, Crown, AlertTriangle, Server, CheckCircle, Target, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { callSmartAllocation } from '@/lib/smartAllocation';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { stats: projectStats } = useProjectStats();
  const [stats, setStats] = useState({
    totalUsers: 0, totalGroups: 0,
    totalAllocations: 0, pendingAllocations: 0, totalSupervisors: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [populatingObjectives, setPopulatingObjectives] = useState(false);
  const [bulkAllocating, setBulkAllocating] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({ title: 'Access Denied', description: 'Admin access required', variant: 'destructive' });
      navigate('/');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { count: usersCount }, { count: groupsCount },
          { count: allocationsCount }, { count: pendingCount }, { count: supervisorsCount },
          { data: users }, { data: projects },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('student_groups').select('*', { count: 'exact', head: true }),
          supabase.from('pending_allocations').select('*', { count: 'exact', head: true }),
          supabase.from('pending_allocations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('supervisors').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(8),
          supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(20),
        ]);
        setStats({
          totalUsers: usersCount || 0,
          totalGroups: groupsCount || 0, totalAllocations: allocationsCount || 0,
          pendingAllocations: pendingCount || 0, totalSupervisors: supervisorsCount || 0,
        });
        setRecentUsers(users || []);
        setRecentProjects(projects || []);
      } catch (error) { console.error('Error fetching admin data:', error); }
      finally { setLoading(false); }
    };
    if (isAdmin) fetchData();
  }, [isAdmin]);

  if (roleLoading || loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!isAdmin) return null;

  // Super Admin sees user-focused stats; regular admin sees project-focused
  const allStatCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, gradient: 'from-primary to-primary-light', superOnly: true },
    { label: 'Supervisors', value: stats.totalSupervisors, icon: UserCog, gradient: 'from-success to-[hsl(160,80%,45%)]', superOnly: true },
    { label: 'Total Projects', value: projectStats.total, icon: FolderKanban, gradient: 'from-secondary to-secondary-light', superOnly: false },
    { label: 'Student Groups', value: stats.totalGroups, icon: GitBranch, gradient: 'from-[hsl(var(--accent-gold))] to-[hsl(40,90%,65%)]', superOnly: false },
    { label: 'Allocations', value: stats.totalAllocations, icon: Activity, gradient: 'from-primary-dark to-primary', superOnly: false },
    { label: 'Pending', value: stats.pendingAllocations, icon: Clock, gradient: 'from-destructive to-[hsl(0,80%,65%)]', superOnly: false },
  ];

  const statCards = isSuperAdmin ? allStatCards.filter(s => s.superOnly) : allStatCards.filter(s => !s.superOnly);


  const generateObjectives = (title: string, description: string): string => {
    const t = (title + ' ' + (description || '')).toLowerCase();
    if (t.includes('machine learning') || t.includes('ml') || t.includes('ai') || t.includes('artificial intelligence') || t.includes('deep learning')) {
      return `1. Develop and train a machine learning model to solve the identified problem with measurable accuracy metrics\n2. Collect, preprocess, and analyze relevant datasets to ensure data quality and model reliability\n3. Evaluate model performance using standard metrics (precision, recall, F1-score) and compare against baseline approaches\n4. Deploy a functional prototype demonstrating the practical application of the trained model`;
    }
    if (t.includes('web') || t.includes('website') || t.includes('portal') || t.includes('frontend') || t.includes('backend') || t.includes('full-stack') || t.includes('fullstack')) {
      return `1. Design and develop a responsive, user-friendly web application that addresses the identified requirements\n2. Implement secure user authentication, authorization, and data management functionality\n3. Integrate backend APIs and database systems to support dynamic content and real-time data processing\n4. Conduct usability testing and performance optimization to ensure a reliable end-user experience`;
    }
    if (t.includes('mobile') || t.includes('android') || t.includes('ios') || t.includes('app development') || t.includes('flutter') || t.includes('react native')) {
      return `1. Design and develop a cross-platform mobile application with an intuitive user interface\n2. Implement core features including user authentication, data synchronization, and push notifications\n3. Optimize the application for performance, battery efficiency, and offline functionality\n4. Conduct user acceptance testing across multiple devices and screen sizes`;
    }
    if (t.includes('network') || t.includes('security') || t.includes('cyber') || t.includes('encryption') || t.includes('firewall') || t.includes('intrusion')) {
      return `1. Analyze existing network infrastructure and identify potential security vulnerabilities\n2. Design and implement a security solution that addresses identified threats and compliance requirements\n3. Develop monitoring and alerting mechanisms for real-time threat detection\n4. Evaluate the effectiveness of the implemented security measures through penetration testing and audits`;
    }
    if (t.includes('iot') || t.includes('sensor') || t.includes('embedded') || t.includes('arduino') || t.includes('raspberry') || t.includes('smart')) {
      return `1. Design and prototype an IoT-based system with appropriate sensors and microcontrollers\n2. Develop firmware and communication protocols for reliable data collection and transmission\n3. Build a dashboard or interface for real-time monitoring and data visualization\n4. Test the system under real-world conditions and evaluate its reliability and scalability`;
    }
    if (t.includes('data') || t.includes('analytics') || t.includes('visualization') || t.includes('dashboard') || t.includes('report')) {
      return `1. Collect and preprocess data from relevant sources to ensure accuracy and completeness\n2. Perform exploratory data analysis to identify patterns, trends, and actionable insights\n3. Develop interactive visualizations and dashboards to communicate findings effectively\n4. Document methodology, findings, and recommendations for stakeholders`;
    }
    if (t.includes('e-commerce') || t.includes('ecommerce') || t.includes('online shop') || t.includes('marketplace') || t.includes('payment')) {
      return `1. Design and develop a functional e-commerce platform with product catalog and shopping cart features\n2. Integrate secure payment processing and order management systems\n3. Implement user account management, order tracking, and notification features\n4. Optimize the platform for performance, SEO, and mobile responsiveness`;
    }
    if (t.includes('blockchain') || t.includes('crypto') || t.includes('decentralized') || t.includes('smart contract') || t.includes('voting')) {
      return `1. Research and select an appropriate blockchain platform for the project requirements\n2. Design and implement smart contracts with proper security and validation mechanisms\n3. Develop a user-facing application that interacts with the blockchain layer\n4. Test and validate the system for security, transparency, and transaction integrity`;
    }
    if (t.includes('health') || t.includes('medical') || t.includes('hospital') || t.includes('patient') || t.includes('clinic') || t.includes('disease')) {
      return `1. Identify key healthcare challenges and define system requirements through stakeholder consultations\n2. Design and develop a digital health solution that improves patient care or operational efficiency\n3. Ensure compliance with data privacy and security standards for sensitive health information\n4. Evaluate the system's effectiveness through user feedback and pilot testing`;
    }
    if (t.includes('education') || t.includes('learning') || t.includes('student') || t.includes('school') || t.includes('e-learning') || t.includes('lms') || t.includes('attendance')) {
      return `1. Analyze educational needs and define learning objectives for the target audience\n2. Design and develop an interactive learning platform with content management capabilities\n3. Implement assessment tools, progress tracking, and feedback mechanisms\n4. Evaluate the platform's impact on learning outcomes through user testing and surveys`;
    }
    if (t.includes('track') || t.includes('gps') || t.includes('fleet') || t.includes('vehicle') || t.includes('transport') || t.includes('logistics')) {
      return `1. Design a GPS-based tracking system with real-time location monitoring capabilities\n2. Implement route optimization and fleet management features\n3. Develop a user-friendly dashboard for monitoring and reporting\n4. Test system accuracy and reliability under real-world conditions`;
    }
    if (t.includes('library') || t.includes('book') || t.includes('catalog') || t.includes('repository')) {
      return `1. Design and develop a digital cataloging and management system for efficient resource tracking\n2. Implement search, filter, and recommendation features for easy resource discovery\n3. Build user account management with borrowing, reservation, and return workflows\n4. Conduct usability testing and optimize for performance and accessibility`;
    }
    if (t.includes('budget') || t.includes('finance') || t.includes('expense') || t.includes('accounting') || t.includes('payroll')) {
      return `1. Design a user-friendly financial management interface for tracking income and expenses\n2. Implement budgeting tools with categorization, alerts, and goal-setting features\n3. Develop reporting and visualization modules for financial insights and trend analysis\n4. Ensure data security and privacy compliance for sensitive financial information`;
    }
    if (t.includes('waste') || t.includes('recycl') || t.includes('environment') || t.includes('pollution') || t.includes('green')) {
      return `1. Analyze current waste management challenges and define system requirements\n2. Design and develop a monitoring solution for efficient waste collection and scheduling\n3. Implement data analytics to optimize routes and reduce environmental impact\n4. Evaluate system effectiveness through pilot testing and stakeholder feedback`;
    }
    if (t.includes('exam') || t.includes('test') || t.includes('quiz') || t.includes('assessment')) {
      return `1. Design a secure examination platform with timed assessments and anti-cheating mechanisms\n2. Implement question bank management with support for multiple question types\n3. Develop automated grading and result analysis with detailed performance reports\n4. Conduct security and usability testing to ensure platform integrity and accessibility`;
    }
    if (t.includes('mine') || t.includes('mining') || t.includes('workforce') || t.includes('production')) {
      return `1. Analyze existing operational workflows and identify areas for automation and improvement\n2. Design and develop an integrated management system for workforce and production tracking\n3. Implement reporting dashboards with real-time metrics and KPI monitoring\n4. Test the system in operational conditions and gather feedback for iterative improvement`;
    }
    return `1. Conduct a comprehensive literature review and requirements analysis for the project domain\n2. Design and develop a functional system or solution addressing the identified problem statement\n3. Implement and test core features to ensure reliability, usability, and performance\n4. Document the development process, evaluate outcomes, and provide recommendations for future work`;
  };

  const handlePopulateObjectives = async () => {
    setPopulatingObjectives(true);
    try {
      const { data: projects, error: fetchError } = await supabase
        .from('projects')
        .select('id, title, description, objectives');
      if (fetchError) throw fetchError;

      const toUpdate = (projects || []).filter(p => !p.objectives || p.objectives.trim() === '');
      let updated = 0;

      for (const project of toUpdate) {
        const objectives = generateObjectives(project.title, project.description || '');
        const { error } = await supabase
          .from('projects')
          .update({ objectives })
          .eq('id', project.id);
        if (!error) updated++;
      }

      toast({
        title: 'Objectives Populated',
        description: `Updated ${updated} out of ${toUpdate.length} projects missing objectives (${projects?.length} total)`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to populate objectives', variant: 'destructive' });
    } finally {
      setPopulatingObjectives(false);
    }
  };

  const handleBulkAutoAllocate = async () => {
    setBulkAllocating(true);
    try {
      const data = await callSmartAllocation<{ allocated: number; total: number }>({ action: 'bulk_auto_allocate' });
      toast({
        title: 'Bulk Allocation Complete',
        description: `Queued ${data.allocated} out of ${data.total} unassigned projects for matched supervisor review`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to bulk allocate', variant: 'destructive' });
    } finally {
      setBulkAllocating(false);
    }
  };

  // Super Admin quick actions: user/system focused
  const superAdminActions = [
    { label: 'User Orchestration', icon: Users, href: '/user-management', gradient: 'from-super-admin to-super-admin-light' },
    { label: 'Create Admin', icon: Crown, href: '/user-management?tab=create-admin', gradient: 'from-super-admin-dark to-super-admin' },
    { label: 'Create Supervisor', icon: UserCog, href: '/user-management?tab=supervisors', gradient: 'from-[hsl(200,80%,50%)] to-[hsl(200,80%,65%)]' },
    { label: 'Schools', icon: Shield, href: '/user-management?tab=schools', gradient: 'from-primary to-primary-light' },
    { label: 'Audit Logs', icon: Activity, href: '/user-management?tab=audit', gradient: 'from-[hsl(var(--accent-gold))] to-[hsl(40,90%,65%)]' },
    { label: 'All Projects', icon: FolderKanban, href: '/projects', gradient: 'from-success to-[hsl(160,80%,45%)]' },
  ];

  // Regular Admin quick actions: project/academic focused
  const regularAdminActions = [
    { label: 'All Projects', icon: FolderKanban, href: '/projects', gradient: 'from-primary to-primary-light' },
    { label: 'Orchestration', icon: Shield, href: '/project-management', gradient: 'from-secondary to-secondary-light' },
    { label: 'Duplicates', icon: Shield, href: '/duplicate-detection', gradient: 'from-destructive to-[hsl(0,80%,65%)]' },
    { label: 'Allocation', icon: Sparkles, href: '/allocation', gradient: 'from-[hsl(var(--accent-gold))] to-[hsl(40,90%,65%)]' },
    { label: 'Groups', icon: GitBranch, href: '/student-groups', gradient: 'from-success to-[hsl(160,80%,45%)]' },
    { label: 'Analytics', icon: BarChart3, href: '/analytics', gradient: 'from-primary-dark to-primary' },
    { label: 'Repository', icon: FolderKanban, href: '/repository', gradient: 'from-[hsl(200,80%,50%)] to-[hsl(200,80%,65%)]' },
  ];

  const quickActions = isSuperAdmin ? superAdminActions : regularAdminActions;

  const userTypeBadge = (type: string) => {
    switch (type) {
      case 'admin': return <Badge className="bg-gradient-to-r from-destructive to-[hsl(0,80%,65%)] text-destructive-foreground border-0 text-[10px]">{type}</Badge>;
      case 'supervisor': return <Badge className="bg-gradient-to-r from-primary to-primary-light text-primary-foreground border-0 text-[10px]">{type}</Badge>;
      default: return <Badge className="bg-gradient-to-r from-secondary to-secondary-light text-secondary-foreground border-0 text-[10px]">{type}</Badge>;
    }
  };

  const projectStatusBadge = (project: any) => {
    if (project.is_duplicate) return <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-[10px]">Duplicate</Badge>;
    switch (project.status) {
      case 'approved': return <Badge className="bg-success/10 text-success border border-success/30 text-[10px]">approved</Badge>;
      case 'pending': return <Badge className="bg-warning/10 text-warning border border-warning/30 text-[10px]">pending</Badge>;
      case 'finalized': return <Badge className="bg-emerald-600/10 text-emerald-600 border border-emerald-600/30 text-[10px]">finalized</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{project.status}</Badge>;
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-8 animate-slide-up">
        {/* Super Admin Banner */}
        {isSuperAdmin && (
          <Card className="border-super-admin/30 bg-gradient-to-r from-super-admin/5 to-super-admin-light/5">
            <CardContent className="py-4 px-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-super-admin to-super-admin-light shadow-md">
                <Crown className="h-6 w-6 text-super-admin-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Super Admin — System & User Management</h2>
                <p className="text-sm text-muted-foreground">Manage users, roles, supervisors, schools, and system configuration</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Regular Admin Banner */}
        {!isSuperAdmin && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="py-4 px-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-md">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Admin — Academic Operations</h2>
                <p className="text-sm text-muted-foreground">Manage projects, allocations, duplicates, student groups, and academic analytics</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-3 ${isSuperAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
          {statCards.map((stat, i) => (
            <Card key={i} className="group hover-lift cursor-default overflow-hidden border-transparent shadow-card hover:shadow-hover transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>{isSuperAdmin ? 'User & system management tools' : 'Project & academic management tools'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`grid grid-cols-2 md:grid-cols-3 ${isSuperAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-7'} gap-3`}>
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 hover:shadow-card transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(action.href)}
                >
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${action.gradient} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                    <action.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Populate Objectives — Regular Admin only */}
            {isAdmin && !isSuperAdmin && (
              <>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md">
                    <Target className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">Populate Project Objectives</h3>
                    <p className="text-xs text-muted-foreground">Auto-generate objectives for projects missing them (3–5 per project)</p>
                  </div>
                  <Button
                    onClick={handlePopulateObjectives}
                    disabled={populatingObjectives}
                    size="sm"
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shrink-0"
                  >
                    {populatingObjectives ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Populating...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-1" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl border border-secondary/20 bg-secondary/5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-secondary to-primary shadow-md">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">Auto-Assign Supervisors</h3>
                    <p className="text-xs text-muted-foreground">Assign supervisors to all unassigned projects based on matching expertise</p>
                  </div>
                  <Button
                    onClick={handleBulkAutoAllocate}
                    disabled={bulkAllocating}
                    size="sm"
                    className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shrink-0"
                  >
                    {bulkAllocating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Allocating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {isSuperAdmin && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-super-admin/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4 text-super-admin" /> System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Database</span>
                    <Badge className="bg-success/10 text-success border-success/30 text-[9px]"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Active</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Auth Service</span>
                    <Badge className="bg-success/10 text-success border-success/30 text-[9px]"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Active</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Storage</span>
                    <Badge className="bg-success/10 text-success border-success/30 text-[9px]"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-super-admin/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.pendingAllocations > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pending Allocations</span>
                      <Badge className="bg-warning/10 text-warning border-warning/30 text-[9px]">{stats.pendingAllocations}</Badge>
                    </div>
                  )}
                  {projectStats.duplicates > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Duplicate Projects</span>
                      <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[9px]">{projectStats.duplicates}</Badge>
                    </div>
                  )}
                  {stats.pendingAllocations === 0 && projectStats.duplicates === 0 && (
                    <p className="text-xs text-muted-foreground">No issues requiring attention</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border-super-admin/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-super-admin" /> User Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['student', 'supervisor', 'admin'].map(type => {
                    const count = recentUsers.filter(u => u.user_type === type).length;
                    return (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{type}s</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Regular Admin: Project Oversight Summary */}
        {!isSuperAdmin && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.pendingAllocations > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pending Allocations</span>
                      <Badge className="bg-warning/10 text-warning border-warning/30 text-[9px]">{stats.pendingAllocations}</Badge>
                    </div>
                  )}
                  {projectStats.duplicates > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Duplicate Projects</span>
                      <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[9px]">{projectStats.duplicates}</Badge>
                    </div>
                  )}
                  {projectStats.pending > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pending Approvals</span>
                      <Badge className="bg-[hsl(var(--accent-gold))]/10 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/30 text-[9px]">{projectStats.pending}</Badge>
                    </div>
                  )}
                  {stats.pendingAllocations === 0 && projectStats.duplicates === 0 && projectStats.pending === 0 && (
                    <p className="text-xs text-muted-foreground">All clear — no issues</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-primary" /> Project Status Breakdown
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">Status counts add up to total ({projectStats.total})</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: 'Approved', value: projectStats.approved },
                    { label: 'Pending', value: projectStats.pending },
                    { label: 'Needs Revision', value: projectStats.needs_revision },
                    { label: 'In Progress', value: projectStats.in_progress },
                    { label: 'Rejected', value: projectStats.rejected },
                    { label: 'Completed', value: projectStats.completed },
                    { label: 'Finalized', value: projectStats.finalized },
                  ].filter(s => s.value > 0).map(s => (
                    <div key={s.label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-medium">{s.value}</span>
                    </div>
                  ))}
                  {projectStats.duplicates > 0 && (
                    <>
                      <div className="border-t border-border my-1" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">⚠️ Flagged as Duplicate</span>
                        <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[9px]">{projectStats.duplicates}</Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-secondary" /> Academic Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Projects</span>
                    <span className="font-medium">{projectStats.total}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Student Groups</span>
                    <span className="font-medium">{stats.totalGroups}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Allocations</span>
                    <span className="font-medium">{stats.totalAllocations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity Tables */}
        <Tabs defaultValue={isSuperAdmin ? "users" : "projects"} className="space-y-4">
          <TabsList>
            {isSuperAdmin && <TabsTrigger value="users">Recent Users</TabsTrigger>}
            <TabsTrigger value="projects">Recent Projects</TabsTrigger>
          </TabsList>

          {isSuperAdmin && (
            <TabsContent value="users">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Recently Registered Users</CardTitle>
                    <CardDescription>Latest user registrations across all roles</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="hover:bg-super-admin hover:text-super-admin-foreground transition-colors" onClick={() => navigate('/user-management')}>
                    View All <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-primary/5 transition-colors">
                          <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>{userTypeBadge(user.user_type)}</TableCell>
                          <TableCell className="text-muted-foreground">{user.department || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="projects">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Projects</CardTitle>
                  <CardDescription>Latest project submissions</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => navigate('/projects')}>
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all-projects">
                  <TabsList className="mb-3">
                    <TabsTrigger value="all-projects">All ({projectStats.total})</TabsTrigger>
                    {projectStats.approved > 0 && (
                      <TabsTrigger value="approved-projects">Approved ({projectStats.approved})</TabsTrigger>
                    )}
                    {projectStats.pending > 0 && (
                      <TabsTrigger value="pending-projects">Pending ({projectStats.pending})</TabsTrigger>
                    )}
                    {projectStats.duplicates > 0 && (
                      <TabsTrigger value="duplicate-projects">Duplicates ({projectStats.duplicates})</TabsTrigger>
                    )}
                  </TabsList>
                  {["all-projects", "approved-projects", "pending-projects", "duplicate-projects"].map(tab => (
                    <TabsContent key={tab} value={tab}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentProjects
                            .filter((p: any) => {
                              if (tab === "all-projects") return true;
                              if (tab === "duplicate-projects") return p.is_duplicate;
                              if (tab === "approved-projects") return p.status === 'approved';
                              if (tab === "pending-projects") return p.status === 'pending';
                              return true;
                            })
                            .map((project: any) => (
                              <TableRow key={project.id} className="hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => navigate('/projects')}>
                                <TableCell className="font-medium max-w-[200px] truncate">{project.title}</TableCell>
                                <TableCell>{projectStatusBadge(project)}</TableCell>
                                <TableCell className="text-muted-foreground">{project.department || 'N/A'}</TableCell>
                                <TableCell className="text-muted-foreground">{new Date(project.created_at).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
};

export default AdminDashboard;
