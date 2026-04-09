import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Users, 
  Shield, 
  TrendingUp, 
  ArrowRight,
  Database,
  UserCheck,
  Sparkles,
  Zap
} from "lucide-react";
import heroImage from "@/assets/campus-night.jpg";

export function Hero() {
  const navigate = useNavigate();
  const features = [
    { icon: <Database className="h-5 w-5" />, title: "Centralized Repository", description: "All projects in one secure location" },
    { icon: <Shield className="h-5 w-5" />, title: "Duplicate Detection", description: "AI-powered similarity analysis" },
    { icon: <UserCheck className="h-5 w-5" />, title: "Smart Allocation", description: "Automated supervisor matching" },
    { icon: <TrendingUp className="h-5 w-5" />, title: "Progress Tracking", description: "Real-time project monitoring" }
  ];

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Top Right Dashboard Button */}
      <div className="absolute top-6 right-6 z-20 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <Button variant="ghost" size="lg" className="group !bg-white !text-primary font-bold shadow-xl hover:shadow-2xl hover:!bg-white/95 transition-all duration-300 hover:-translate-y-0.5 text-base px-6" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
          <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="University Campus" className="w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 gradient-hero"></div>
        <div className="absolute inset-0 dot-pattern opacity-20"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-float-reverse"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-5">
          <div className="animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <Badge variant="secondary" className="mx-auto glass px-4 py-1.5 text-primary-foreground border-primary-foreground/20">
              <Sparkles className="h-3 w-3 mr-2 animate-pulse-glow" />
              Trusted by Harare Institute of Technology
            </Badge>
          </div>

          <div className="space-y-4 animate-slide-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight tracking-tight">
              Capstone Innovation &
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-light via-secondary to-primary-light animate-gradient">
                Idea Orchestration
              </span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed font-light">
              Streamline your capstone projects with intelligent duplicate detection, 
              automated supervisor allocation, and comprehensive progress tracking.
            </p>
          </div>


          {/* Feature Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group gradient-card p-4 shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 border-0 animate-slide-up opacity-0"
                style={{ animationDelay: `${600 + index * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center space-x-2 mb-1.5">
                  <div className="p-2 gradient-primary rounded-lg text-primary-foreground shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-card-foreground text-sm">{feature.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
