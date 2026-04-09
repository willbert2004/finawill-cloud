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
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin']}><DashboardHub /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin']}><MyProfile /></ProtectedRoute>} />

            {/* Student routes */}
            <Route path="/projects" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin']}><Projects /></ProtectedRoute>} />
            <Route path="/create-project" element={<ProtectedRoute allowedRoles={['student', 'admin']}><CreateProject /></ProtectedRoute>} />
            <Route path="/student-groups" element={<ProtectedRoute allowedRoles={['student', 'admin']}><StudentGroups /></ProtectedRoute>} />
            <Route path="/repository" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin']}><Repository /></ProtectedRoute>} />

            {/* Supervisor routes */}
            <Route path="/supervisor-profile" element={<ProtectedRoute allowedRoles={['supervisor']}><SupervisorProfile /></ProtectedRoute>} />
            <Route path="/project-management" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin']}><ProjectManagement /></ProtectedRoute>} />
            {/* duplicate-detection route removed — duplicate check is now inline in CreateProject */}
            <Route path="/allocation" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Allocation /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />

            {/* Video call */}
            <Route path="/video-call" element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'admin']}><VideoCall /></ProtectedRoute>} />
            <Route path="/documentation" element={<ProtectedRoute allowedRoles={['admin', 'supervisor', 'student']}><SystemDocumentation /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
