import { GraduationCap, Mail, Phone, MapPin, Github, Twitter, Linkedin, ArrowUpRight, Heart } from "lucide-react";
import footerBackground from "@/assets/footer-background.jpg";

export function Footer() {
  const links = {
    system: [
      { name: "Features", href: "#features" },
      { name: "Dashboard", href: "#dashboard" },
      { name: "Documentation", href: "#docs" },
      { name: "Support", href: "#support" }
    ],
    university: [
      { name: "About HIT", href: "#about" },
      { name: "Academic Programs", href: "#programs" },
      { name: "Research", href: "#research" },
      { name: "Contact", href: "#contact" }
    ],
    legal: [
      { name: "Privacy Policy", href: "#privacy" },
      { name: "Terms of Service", href: "#terms" },
      { name: "Academic Integrity", href: "#integrity" },
      { name: "Data Security", href: "#security" }
    ]
  };

  const socialLinks = [
    { name: "GitHub", icon: <Github className="h-5 w-5" />, href: "#github" },
    { name: "Twitter", icon: <Twitter className="h-5 w-5" />, href: "#twitter" },
    { name: "LinkedIn", icon: <Linkedin className="h-5 w-5" />, href: "#linkedin" }
  ];

  return (
    <footer id="contact" className="relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={footerBackground} alt="Footer background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/95 via-foreground/90 to-primary-dark/80"></div>
        <div className="absolute inset-0 dot-pattern opacity-10"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-background">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Logo and Description */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 group">
              <div className="p-3 gradient-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight">CIIOS</span>
                <span className="text-xs text-background/60 font-medium">Harare Institute of Technology</span>
              </div>
            </div>
            <p className="text-sm text-background/70 leading-relaxed">
              Capstone Innovation and Idea Orchestration System - Streamlining academic 
              project orchestration with intelligent tools and seamless collaboration.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((link, index) => (
                <a 
                  key={index} 
                  href={link.href} 
                  className="p-3 bg-background/10 rounded-xl hover:bg-background/20 hover:scale-110 transition-all duration-300 group" 
                  aria-label={link.name}
                >
                  <span className="group-hover:text-secondary-light transition-colors duration-300">
                    {link.icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* CIIMS Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-background mb-6 flex items-center">
              <span className="w-8 h-0.5 bg-gradient-to-r from-secondary to-primary mr-3"></span>
              System
            </h3>
            <ul className="space-y-4">
              {links.system.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="group flex items-center text-sm text-background/70 hover:text-background transition-all duration-300">
                    <ArrowUpRight className="h-3 w-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* University Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-background mb-6 flex items-center">
              <span className="w-8 h-0.5 bg-gradient-to-r from-secondary to-primary mr-3"></span>
              University
            </h3>
            <ul className="space-y-4">
              {links.university.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="group flex items-center text-sm text-background/70 hover:text-background transition-all duration-300">
                    <ArrowUpRight className="h-3 w-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-background mb-6 flex items-center">
              <span className="w-8 h-0.5 bg-gradient-to-r from-secondary to-primary mr-3"></span>
              Contact
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 text-sm text-background/70 group">
                <div className="p-2 bg-background/10 rounded-lg group-hover:bg-background/20 transition-colors duration-300">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="pt-1">Belvedere, Harare, Zimbabwe</span>
              </li>
              <li className="flex items-start space-x-3 text-sm text-background/70 group">
                <div className="p-2 bg-background/10 rounded-lg group-hover:bg-background/20 transition-colors duration-300">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="pt-1">
                  <p>+263 4 741 428</p>
                  <p>+263 780 269 090</p>
                </div>
              </li>
              <li className="flex items-start space-x-3 text-sm text-background/70 group">
                <div className="p-2 bg-background/10 rounded-lg group-hover:bg-background/20 transition-colors duration-300">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="pt-1">ciims@hit.ac.zw</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-background/50">
              © 2025 Harare Institute of Technology. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {links.legal.map((link, index) => (
                <a key={index} href={link.href} className="text-sm text-background/50 hover:text-background/80 transition-colors duration-300">
                  {link.name}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-background/5">
            <p className="text-xs text-background/40 text-center flex items-center justify-center gap-1 flex-wrap">
              Crafted with <Heart className="h-3 w-3 text-destructive animate-pulse" /> by Group 2: Willbert Pfereka, Evans Sheshe, Priveledge Mugwede, 
              Tawana Mukorera, Tadiwanashe Nyakanyanga
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
