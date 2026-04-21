import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardHub from "./pages/DashboardHub";
import Projects from "./pages/Projects";
import CreateProject from "./pages/CreateProject";
import ProjectDetails from "./pages/ProjectDetails";

import Repository from "./pages/Repository";
import Allocation from "./pages/Allocation";
import SupervisorProfile from "./pages/SupervisorProfile";
import StudentGroups from "./pages/StudentGroups";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import Analytics from "./pages/Analytics";
import ProjectManagement from "./pages/ProjectManagement";
import MyProfile from "./pages/MyProfile";
import NotFound from "./pages/NotFound";
import VideoCall from "./pages/VideoCall";
import SystemDocumentation from "./pages/SystemDocumentation";
import Duplicates from "./pages/Duplicates";
import PendingReviews from "./pages/PendingReviews";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin', 'super_admin']}><DashboardHub /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin', 'super_admin']}><MyProfile /></ProtectedRoute>} />

            {/* Student routes */}
            <Route path="/projects" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin', 'super_admin']}><Projects /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin', 'super_admin']}><ProjectDetails /></ProtectedRoute>} />
            <Route path="/create-project" element={<ProtectedRoute allowedRoles={['student', 'admin', 'super_admin']}><CreateProject /></ProtectedRoute>} />
            <Route path="/student-groups" element={<ProtectedRoute allowedRoles={['student', 'admin', 'super_admin']}><StudentGroups /></ProtectedRoute>} />
            <Route path="/repository" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin', 'super_admin']}><Repository /></ProtectedRoute>} />
            <Route path="/duplicates" element={<ProtectedRoute allowedRoles={['student', 'admin', 'super_admin']}><Duplicates /></ProtectedRoute>} />

            {/* Supervisor routes */}
            <Route path="/supervisor-profile" element={<ProtectedRoute allowedRoles={['supervisor']}><SupervisorProfile /></ProtectedRoute>} />
            <Route path="/project-management" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin', 'super_admin']}><ProjectManagement /></ProtectedRoute>} />
            {/* duplicate-detection route removed — duplicate check is now inline in CreateProject */}
            <Route path="/allocation" element={<ProtectedRoute allowedRoles={['supervisor', 'admin', 'super_admin']}><Allocation /></ProtectedRoute>} />
            <Route path="/pending-reviews" element={<ProtectedRoute allowedRoles={['supervisor']}><PendingReviews /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Analytics /></ProtectedRoute>} />

            {/* Video call */}
            <Route path="/video-call" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin', 'super_admin']}><VideoCall /></ProtectedRoute>} />
            <Route path="/documentation" element={<ProtectedRoute allowedRoles={['admin', 'supervisor', 'student', 'super_admin']}><SystemDocumentation /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
