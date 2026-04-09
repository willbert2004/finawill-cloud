import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Shield, Users, BookOpen } from 'lucide-react';
import hitLogo from '@/assets/hit-logo.jpg';

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary">
        <div className="absolute inset-0 dot-pattern opacity-10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-secondary/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-light/20 rounded-full blur-[120px]"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-primary-foreground">
          <div className="flex items-center gap-4 mb-10">
            <img src={hitLogo} alt="HIT" className="h-14 w-14 rounded-xl object-contain bg-white/10 p-1" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CIIOS</h1>
              <p className="text-sm text-primary-foreground/70">Harare Institute of Technology</p>
            </div>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-6">
            Capstone Innovation &<br />
            <span className="text-secondary-light">Idea Orchestration</span>
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10 leading-relaxed">
            Streamline your academic projects with intelligent tools for duplicate detection,
            supervisor allocation, and progress tracking.
          </p>

          <div className="space-y-4">
            {[
              { icon: Shield, label: "AI-Powered Duplicate Detection" },
              { icon: Users, label: "Smart Supervisor Allocation" },
              { icon: BookOpen, label: "Centralized Project Repository" },
              { icon: GraduationCap, label: "Progress & Milestone Tracking" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/90">
                <div className="p-2 bg-primary-foreground/10 rounded-lg">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 bg-muted/30 overflow-auto">
        <div className="w-full max-w-md">
          <AuthForm onSuccess={() => navigate('/', { replace: true })} />
        </div>
      </div>
    </div>
  );
}
