import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import hitLogo from "@/assets/hit-logo.jpg";
import {
  FolderKanban,
  ClipboardList,
  Archive,
  
  Sparkles,
  User,
  LayoutDashboard,
  BarChart3,
  Users,
  LogOut,
  Crown,
  Settings,
  UserCog,
  Trash2,
  Database,
  BookOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, isSupervisor, isStudent, loading: roleLoading } = useUserRole();

  // Regular admin = admin but NOT super_admin
  const isRegularAdmin = isAdmin && !isSuperAdmin;

  // Student nav
  const studentNav = isStudent
    ? [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-primary" },
        { name: "My Profile", href: "/my-profile", icon: User, color: "text-primary" },
        { name: "My Projects", href: "/projects", icon: FolderKanban, color: "text-primary" },
        { name: "Project Workspace", href: "/project-management", icon: ClipboardList, color: "text-secondary" },
        { name: "Create Project", href: "/create-project", icon: ClipboardList, color: "text-secondary" },
        { name: "Student Groups", href: "/student-groups", icon: Users, color: "text-[hsl(var(--accent-gold))]" },
        { name: "Repository", href: "/repository", icon: Archive, color: "text-success" },
      ]
    : [];

  // Supervisor nav
  const supervisorNav = isSupervisor
    ? [
        { name: "My Profile", href: "/supervisor-profile", icon: User, color: "text-primary" },
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-primary" },
        { name: "Assigned Projects", href: "/projects", icon: FolderKanban, color: "text-primary" },
        { name: "Project Orchestration", href: "/project-management", icon: ClipboardList, color: "text-secondary" },
        { name: "Smart Allocation", href: "/allocation", icon: Sparkles, color: "text-[hsl(var(--accent-gold))]" },
        { name: "Repository", href: "/repository", icon: Archive, color: "text-success" },
      ]
    : [];

  // Regular admin nav — project management & academic operations
  const regularAdminNav = isRegularAdmin
    ? [
        { name: "My Profile", href: "/my-profile", icon: User, color: "text-primary" },
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "text-primary" },
        { name: "All Projects", href: "/projects", icon: FolderKanban, color: "text-[hsl(var(--accent-gold))]" },
        { name: "Project Orchestration", href: "/project-management", icon: ClipboardList, color: "text-primary" },
        
        { name: "Smart Allocation", href: "/allocation", icon: Sparkles, color: "text-[hsl(var(--accent-gold))]" },
        { name: "Student Groups", href: "/student-groups", icon: Users, color: "text-secondary" },
        { name: "Analytics", href: "/analytics", icon: BarChart3, color: "text-success" },
        { name: "Repository", href: "/repository", icon: Archive, color: "text-success" },
      ]
    : [];

  // Super admin nav — user & system management only
  const superAdminMainNav = isSuperAdmin
    ? [
        { name: "My Profile", href: "/my-profile", icon: User, color: "text-super-admin" },
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "text-super-admin" },
        { name: "User Orchestration", href: "/user-management", icon: Users, color: "text-super-admin-light" },
        { name: "Create Admin", href: "/user-management?tab=create-admin", icon: Crown, color: "text-super-admin" },
        { name: "Create Supervisor", href: "/user-management?tab=create-supervisor", icon: UserCog, color: "text-super-admin-light" },
        { name: "School Management", href: "/user-management?tab=schools", icon: BookOpen, color: "text-super-admin" },
        { name: "Audit Logs", href: "/user-management?tab=audit", icon: Database, color: "text-super-admin-light" },
      ]
    : [];

  // Super admin has NO project nav — projects are managed by regular admin
  const superAdminProjectNav: typeof studentNav = [];

  const isActive = (href: string) => {
    if (href.includes('?')) {
      return location.pathname + location.search === href;
    }
    // For plain paths, match exactly but exclude if current URL has query params matching another nav item
    if (location.search) {
      // Check if there's a more specific nav item with query params that matches
      const allItems = [...superAdminMainNav, ...superAdminProjectNav, ...regularAdminNav, ...supervisorNav, ...studentNav];
      const hasMoreSpecificMatch = allItems.some(
        item => item.href.includes('?') && item.href.startsWith(href) && location.pathname + location.search === item.href
      );
      if (hasMoreSpecificMatch) return false;
    }
    return location.pathname === href;
  };

  const renderNavGroup = (
    label: string,
    items: typeof studentNav,
    activeColor: string = "bg-sidebar-primary/15 text-sidebar-primary border-sidebar-primary",
    hoverClasses: string = "hover:!bg-[#3b1f6e] hover:!text-[#c4a1ff]",
    activeClasses: string = "active:!bg-[#0d4f4f] active:!text-[#4eeadb]"
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-wider">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                isActive={isActive(item.href)}
                tooltip={item.name}
                onClick={() => {
                  // Force navigation even if pathname matches (for query param changes)
                  navigate(item.href);
                }}
                className={
                  isActive(item.href)
                    ? `${activeColor} font-semibold border-l-2 shadow-[inset_0_0_20px_hsl(220_90%_60%/0.08)]`
                    : `transition-all duration-200 cursor-pointer ${hoverClasses} ${activeClasses} hover:translate-x-0.5 active:scale-[0.97]`
                }
              >
                <item.icon className={`h-4 w-4 transition-colors duration-200 ${isActive(item.href) ? activeColor.split(" ")[1] : item.color}`} />
                <span>{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="shadow-[4px_0_24px_-4px_hsl(220_50%_5%/0.5)] z-30">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg overflow-hidden ring-2 ring-sidebar-primary/30 shrink-0">
            <img src={hitLogo} alt="HIT Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-primary-foreground tracking-wide">CIIOS</span>
            <span className="text-[10px] text-sidebar-foreground/50 leading-tight">Harare Institute of Technology</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Student — Green/Emerald hover, Orange click */}
        {studentNav.length > 0 && renderNavGroup(
          "Student",
          studentNav,
          "bg-sidebar-primary/15 text-sidebar-primary border-sidebar-primary",
          "hover:!bg-[#1a3a2a] hover:!text-[#6ee7a8]",
          "active:!bg-[#4a2c0a] active:!text-[#fbbf24]"
        )}

        {/* Supervisor — Purple hover, Teal click */}
        {supervisorNav.length > 0 && renderNavGroup(
          "Supervisor",
          supervisorNav,
          "bg-sidebar-primary/15 text-sidebar-primary border-sidebar-primary",
          "hover:!bg-[#3b1f6e] hover:!text-[#c4a1ff]",
          "active:!bg-[#0d4f4f] active:!text-[#4eeadb]"
        )}

        {/* Regular Admin — Blue hover, Rose click */}
        {regularAdminNav.length > 0 && renderNavGroup(
          "Administration",
          regularAdminNav,
          "bg-primary/10 text-primary border-primary",
          "hover:!bg-[#1e3a5f] hover:!text-[#60a5fa]",
          "active:!bg-[#5c1a3a] active:!text-[#fb7185]"
        )}

        {/* Super Admin — System Control */}
        {superAdminMainNav.length > 0 && renderNavGroup(
          "⚡ System Control",
          superAdminMainNav,
          "bg-super-admin/10 text-super-admin border-super-admin",
          "hover:!bg-[#4a3510] hover:!text-[#fbbf24]",
          "active:!bg-[#6b1a1a] active:!text-[#f87171]"
        )}

        {/* Super Admin — Project Oversight (empty by design) */}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <div className="rounded-lg bg-sidebar-accent/50 p-2.5 flex items-center justify-between group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
            {isSuperAdmin ? (
              <div className="h-6 w-6 rounded-full bg-super-admin/20 flex items-center justify-center shrink-0">
                <Crown className="h-3.5 w-3.5 text-super-admin" />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-sidebar-primary" />
              </div>
            )}
            <span className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
