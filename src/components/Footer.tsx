import { Link } from "react-router-dom";
import { MapPin, Mail, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-navy-900 border-t border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src="/lovable-uploads/settld-logo-white.png" alt="Settld logo" className="h-8 w-auto" />
              <span className="text-white font-bold text-lg tracking-tight">Settld</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              The smarter way to park. Book a neighbor's driveway or list your space and earn.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {[
                { icon: Twitter, label: "Twitter", href: "#" },
                { icon: Instagram, label: "Instagram", href: "#" },
                { icon: Linkedin, label: "LinkedIn", href: "#" },
              ].map(s => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: "How It Works", to: "/how-it-works" },
                { label: "Premium", to: "/premium" },
                { label: "List Your Spot", to: "/list-spot" },
              ].map(item => (
                <li key={item.to}>
                  <Link to={item.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Resources</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Help Center", to: "/help" },
                { label: "Privacy Policy", to: "/privacy-policy" },
                { label: "Terms of Service", to: "/terms" },
              ].map(item => (
                <li key={item.to}>
                  <Link to={item.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-slate-400 text-sm">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="mailto:support@settld.com" className="hover:text-white transition-colors">
                  support@settld.com
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Available Nationwide</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Settld. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
