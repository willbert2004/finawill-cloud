import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, ArrowRight, Home, Layers, Info, Phone } from "lucide-react";
import hitLogo from "@/assets/hit-logo.jpg";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onNavigate?: (section: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const navigation = [
    { name: "Home", href: "#home", icon: Home },
    { name: "Features", href: "#features", icon: Layers },
    { name: "About", href: "#about", icon: Info },
    { name: "Contact", href: "#contact", icon: Phone },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={hitLogo} alt="HIT Logo" className="h-10 w-10 rounded-lg object-contain" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">CIIOS</span>
              <span className="text-xs text-muted-foreground">Harare Institute of Technology</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate?.(item.href.slice(1));
                }}
                className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200 font-medium gap-1.5"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            ))}
            <div className="h-6 w-px bg-border mx-2" />
            {user ? (
              <Button size="sm" onClick={() => navigate('/projects')} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground gap-2 shadow-card hover:shadow-elegant transition-all">
                <LogIn className="h-4 w-4" />
                Login / Sign Up
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu — vertical buttons */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-1 bg-card shadow-card rounded-lg p-3 mt-2">
              {navigation.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate?.(item.href.slice(1));
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              ))}
              <div className="h-px bg-border my-2" />
              {user ? (
                <Button className="w-full gap-2" onClick={() => navigate('/projects')}>
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="w-full gap-2 gradient-primary text-primary-foreground" onClick={() => navigate('/auth')}>
                  <LogIn className="h-4 w-4" />
                  Login / Sign Up
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
