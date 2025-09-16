import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomePageHeader } from "@/components/HomePageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Users,
  BookOpen,
  Target,
  Award,
  Globe,
  Heart,
  Lightbulb,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { useState, useEffect } from "react";

export default function AboutPage() {
  const [statistics, setStatistics] = useState([
    {
      icon: Users,
      value: "Loading...",
      label: "Students",
    },
    {
      icon: GraduationCap,
      value: "Loading...",
      label: "Deans",
    },
    {
      icon: Target,
      value: "Loading...",
      label: "HODs",
    },
    {
      icon: BookOpen,
      value: "Loading...",
      label: "Staff",
    },
    {
      icon: Award,
      value: "Loading...",
      label: "Years of Excellence",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const values = [
    {
      icon: Award,
      title: "Excellence in Education",
      description:
        "We strive for the highest standards in teaching, research, and service to our community.",
    },
    {
      icon: Users,
      title: "Student-Centered Approach",
      description:
        "Our students are at the heart of everything we do, ensuring their success and well-being.",
    },
    {
      icon: Target,
      title: "Innovation & Research",
      description:
        "We foster a culture of innovation and cutting-edge research to advance knowledge.",
    },
    {
      icon: Globe,
      title: "Community Impact",
      description:
        "We are committed to serving our local and global communities through our expertise.",
    },
    {
      icon: Heart,
      title: "Integrity & Ethics",
      description:
        "We maintain the highest ethical standards in all our academic and administrative activities.",
    },
    {
      icon: Lightbulb,
      title: "Lifelong Learning",
      description:
        "We promote continuous learning and intellectual curiosity among all our stakeholders.",
    },
  ];

  const history = [
    {
      year: "1954",
      title: "Foundation",
      description:
        "University of Gondar was established as a public health college, marking the beginning of higher education in the region.",
    },
    {
      year: "2003",
      title: "University Status",
      description:
        "The institution was upgraded to full university status, expanding its academic programs and research capabilities.",
    },
    {
      year: "Present",
      title: "Modern Excellence",
      description:
        "Today, we are a leading comprehensive university offering diverse programs and conducting impactful research across multiple disciplines.",
    },
  ];

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/stats/university-statistics");
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        const data = await response.json();

        // Map the API response to include the correct icon components
        const mappedStatistics = data.statistics.map((stat) => ({
          ...stat,
          icon:
            stat.label === "Students"
              ? Users
              : stat.label === "Deans"
              ? GraduationCap
              : stat.label === "HODs"
              ? Target
              : stat.label === "Staff"
              ? BookOpen
              : stat.label === "Years of Excellence"
              ? Award
              : Users,
        }));

        setStatistics(mappedStatistics);
        setError(null);
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Failed to load statistics");
        // Fallback to default values if API fails
        setStatistics([
          {
            icon: Users,
            value: "25,000+",
            label: "Students",
          },
          {
            icon: GraduationCap,
            value: "350+",
            label: "Deans",
          },
          {
            icon: Target,
            value: "45+",
            label: "HODs",
          },
          {
            icon: BookOpen,
            value: "1,200+",
            label: "Staff",
          },
          {
            icon: Award,
            value: `${new Date().getFullYear() - 1954}+`,
            label: "Years of Excellence",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {!isAuthenticated ? (
        <HomePageHeader />
      ) : (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-0">
            <div className="flex h-16 items-center gap-4 px-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm text-foreground border border-border rounded px-3 py-1 hover:bg-primary/5 transition"
              >
                ← Back
              </button>
              <div className="text-lg font-semibold">
                About University of Gondar
              </div>
            </div>
          </div>
        </header>
      )}
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              About University of Gondar
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Founded in 1954, the University of Gondar has been a beacon of
              education, innovation, and service for over seven decades. We are
              committed to excellence in teaching, research, and community
              engagement.
            </p>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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

      {/* Mission & Vision Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  To provide quality education, conduct innovative research, and
                  serve our community by developing competent, ethical, and
                  socially responsible graduates who contribute to national
                  development and global knowledge advancement.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  To be a leading comprehensive university in Africa, recognized
                  for excellence in education, research, and community service,
                  while fostering innovation and contributing to sustainable
                  development in Ethiopia and beyond.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The principles that guide our actions and define our character as
              an institution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our History
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A journey of growth, excellence, and continuous innovation
              spanning seven decades
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {history.map((item, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                    <div className="text-center md:text-left">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {item.year}
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {item.title}
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
