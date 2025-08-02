import { GraduationCap } from "lucide-react";

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
              <a href="/about" className="hover:underline">
                About Us
              </a>
            </li>
            <li>
              <a href="/help" className="hover:underline">
                Help &amp; Support
              </a>
            </li>
            <li>
              <a href="/privacy-policy" className="hover:underline">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms" className="hover:underline">
                Terms of Service
              </a>
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
