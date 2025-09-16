import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { HomePageHeader } from "@/components/HomePageHeader";
import {
  CheckCircle,
  Clock,
  Star,
  Users,
  MessageSquare,
  ArrowRight,
  GraduationCap,
  Zap,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/footer";
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";

export default function HomePage() {
  // Live stats from backend public endpoint
  const [stats, setStats] = useState<{
    totalResolved: number;
    averageResponseHours: number | null;
    averageRating: number | null;
    activeStudentsAndStaff: number;
    activeUsers?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/stats/public/home`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch (_) {
        // swallow errors on public landing; keep placeholders
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statistics = useMemo(() => {
    const fmtNumber = (n: number) =>
      n >= 1000 ? `${Math.floor(n / 1000)}k+` : String(n);
    const fmtHours = (h: number | null) =>
      h == null ? "--" : h < 1 ? `${Math.round(h * 60)}m` : `${Math.round(h)}h`;
    const fmtRating = (r: number | null) =>
      r == null ? "--" : `${r.toFixed(1)}/5`;

    return [
      {
        icon: CheckCircle,
        value: stats ? fmtNumber(stats.totalResolved) : loading ? "--" : "0",
        label: "Total Complaints Resolved",
      },
      {
        icon: Clock,
        value: stats ? fmtHours(stats.averageResponseHours) : "--",
        label: "Average Response Time",
      },
      {
        icon: Star,
        value: stats ? fmtRating(stats.averageRating) : "--",
        label: "User Satisfaction Rating",
      },
      {
        icon: Users,
        value: stats
          ? fmtNumber(
              typeof stats.activeUsers === "number" && stats.activeUsers >= 0
                ? stats.activeUsers
                : stats.activeStudentsAndStaff
            )
          : loading
          ? "--"
          : "0",
        label: "Active Users",
      },
    ];
  }, [stats, loading]);

  const features = [
    {
      icon: MessageSquare,
      title: "Easy Complaint Submission",
      description:
        "Submit complaints quickly with our intuitive form system designed for all users.",
    },
    {
      icon: Clock,
      title: "Real-time Tracking",
      description:
        "Track your complaint status in real-time and receive updates on progress.",
    },
    {
      icon: UserCheck,
      title: "Dedicated Staff Support",
      description:
        "Our trained staff members are dedicated to resolving your concerns efficiently.",
    },
    {
      icon: Zap,
      title: "Quick Resolution",
      description:
        "Most complaints are resolved within 48 hours through our streamlined process.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <HomePageHeader />
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 text-sm font-medium">
              <GraduationCap className="w-9 h-9 mr-2" />
              University of Gondar
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              University of Gondar
              <span className="text-primary block mt-2">
                Complaint Management System
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Submit, track, and resolve complaints efficiently. Our streamlined
              system ensures your voice is heard and issues are addressed
              promptly by our dedicated team.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8"
              >
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {statistics.map((stat, index) => (
              <Card
                key={index}
                className="text-center hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-6xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Our System?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the benefits of a modern, efficient complaint
              management system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of students and staff who trust our complaint
              management system. Create your account today and experience
              seamless issue resolution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="text-lg px-8"
              >
                <Link to="/signup">
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-lg px-8 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
