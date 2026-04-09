import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Search,
  Users,
  BarChart3,
  Shield,
  Clock,
  FileText,
  Bell,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export function Features() {
  const mainFeatures = [
    {
      icon: <Database className="h-8 w-8" />,
      title: "Centralized Project Repository",
      description: "Store all student projects in one secure, organized location with advanced search and filtering capabilities.",
      features: ["Secure cloud storage", "Advanced search filters", "Category organization", "Version control"],
      gradient: "from-blue-600 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/5"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Smart Supervisor Allocation",
      description: "Automatically match students with supervisors based on expertise, availability, and current workload.",
      features: ["Expertise matching", "Workload balancing", "Availability tracking", "Performance metrics"],
      gradient: "from-emerald-600 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/5"
    }
  ];

  const additionalFeatures = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Progress Dashboard",
      description: "Real-time project tracking and analytics",
      gradient: "from-orange-500 to-amber-500"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Academic Integrity",
      description: "Ensure originality and prevent plagiarism",
      gradient: "from-red-500 to-rose-500"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Deadline Orchestration",
      description: "Automated reminders and milestone tracking",
      gradient: "from-indigo-500 to-violet-500"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Document Orchestration",
      description: "Organize proposals, reports, and submissions",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: "Smart Notifications",
      description: "Keep all stakeholders informed and updated",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: "Approval Workflow",
      description: "Streamlined review and approval process",
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 via-background to-muted/30 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 dot-pattern opacity-30"></div>
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[150px] translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 mb-20">
          <Badge variant="secondary" className="mx-auto px-4 py-2 shadow-sm">
            <Sparkles className="h-3 w-3 mr-2" />
            Core Features
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Everything You Need to Manage 
            <span className="text-gradient"> Academic Projects</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            CIIOS provides a comprehensive suite of tools designed specifically for academic institutions 
            to streamline capstone project orchestration from submission to completion.
          </p>
        </div>

        {/* Main Features */}
        <div className="space-y-12 mb-24">
          {mainFeatures.map((feature, index) => (
            <Card 
              key={index} 
              className={`p-8 md:p-10 shadow-card hover:shadow-hover transition-all duration-500 border-0 gradient-card relative overflow-hidden group`}
            >
              {/* Background Gradient on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              
              <div className="relative z-10 space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-4 bg-gradient-to-br ${feature.gradient} rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 group-hover:bg-muted/80 transition-colors duration-300">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${feature.gradient}`}></div>
                        <span className="text-sm font-medium text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div>
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Additional Powerful Features
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover more tools that make CIIOS the complete solution for academic project orchestration
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <Card 
                key={index} 
                className="group p-6 shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-2 border-0 gradient-card relative overflow-hidden"
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-start space-x-4">
                  <div className={`p-3 bg-gradient-to-br ${feature.gradient} rounded-xl text-white flex-shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    {feature.icon}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors duration-300">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
                
                {/* Bottom Border Gradient */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
