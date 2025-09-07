import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-muted rounded-lg mt-8 p-6">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: University Info */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">University of Gondar</span>
          </div>
          <div className="text-sm text-muted-foreground mb-1">
            Excellence in Education
          </div>
          <p className="text-sm text-muted-foreground">
            Committed to providing quality education and ensuring student voices
            are heard through our complaint management system.
          </p>
        </div>

        {/* Middle: Contact Us */}
        <div>
          <h4 className="font-semibold mb-2">Contact Us</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span role="img" aria-label="location">
                📍
              </span>
              P.O. Box 196, Gondar, Ethiopia
            </li>
            <li className="flex items-center gap-2">
              <span role="img" aria-label="phone">
                📞
              </span>
              +251-58-114-1240
            </li>
            <li className="flex items-center gap-2">
              <span role="img" aria-label="email">
                ✉️
              </span>
              info@uog.edu.et
            </li>
          </ul>
        </div>

        {/* Right: Quick Links */}
        <div>
          <h4 className="font-semibold mb-2">Quick Links</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <Link to="/about" className="hover:underline">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/help" className="hover:underline">
                Help &amp; Support
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:underline">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Divider and copyright */}
      <hr className="my-4 border-muted-foreground/20" />
      <div className="text-xs text-muted-foreground text-center">
        © 2025 University of Gondar. All rights reserved.
      </div>
    </footer>
  );
}
