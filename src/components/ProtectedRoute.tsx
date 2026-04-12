import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'supervisor' | 'student' | 'super_admin')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isSupervisor, isStudent, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const loading = authLoading || roleLoading;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && allowedRoles) {
      const hasAccess =
        (allowedRoles.includes('admin') && isAdmin) ||
        (allowedRoles.includes('super_admin') && isSuperAdmin) ||
        (allowedRoles.includes('supervisor') && isSupervisor) ||
        (allowedRoles.includes('student') && isStudent);

      if (!hasAccess) {
        navigate('/projects', { replace: true });
      }
    }
  }, [loading, user, allowedRoles, isAdmin, isSupervisor, isStudent, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  if (allowedRoles) {
    const hasAccess =
      (allowedRoles.includes('admin') && isAdmin) ||
      (allowedRoles.includes('super_admin') && isSuperAdmin) ||
      (allowedRoles.includes('supervisor') && isSupervisor) ||
      (allowedRoles.includes('student') && isStudent);
    if (!hasAccess) return null;
  }

  return <>{children}</>;
}
