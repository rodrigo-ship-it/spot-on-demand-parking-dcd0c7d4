import { Link } from "react-router-dom";
import { MapPin, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#0F172A] border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img
                src="/lovable-uploads/settld-logo-with-text.png"
                alt="Settld"
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Find and rent parking spots from your neighbors. The smarter way to park.
            </p>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/how-it-works" className="text-slate-400 hover:text-white transition-colors text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/premium" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Premium
                </Link>
              </li>
              <li>
                <Link to="/list-spot" className="text-slate-400 hover:text-white transition-colors text-sm">
                  List Your Spot
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Resources</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/help" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <Mail className="w-4 h-4 text-blue-400" />
                <a href="mailto:support@settld.com" className="hover:text-white transition-colors">
                  support@settld.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>Available Nationwide</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-400 text-sm text-center md:text-left">
            © {new Date().getFullYear()} Settld. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;