import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HomePageHeader } from "@/components/HomePageHeader";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle,
  FileText,
  Settings,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Send,
} from "lucide-react";

export default function HelpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const quickLinks = [
    {
      icon: FileText,
      title: "User Guide",
      description:
        "Learn how to use the complaint management system effectively",
      action: "View Guide",
      link: "/guide",
    },
    {
      icon: Settings,
      title: "Account Settings",
      description: "Manage your profile, preferences, and security settings",
      action: "Go to Settings",
      link: "/profile",
    },
    {
      icon: Users,
      title: "Community Forum",
      description: "Connect with other users and share experiences",
      action: "Join Forum",
      link: "/forum",
    },
  ];

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us an email and we'll respond within 24 hours",
      contact: "support@uog.edu.et",
      action: "Send Email",
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Call us during business hours for immediate assistance",
      contact: "+251-58-114-7092",
      action: "Call Now",
    },
    {
      icon: MessageSquare,
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      contact: "Available 9 AM - 5 PM",
      action: "Start Chat",
    },
  ];

  const faqs = [
    {
      question: "How do I submit a complaint?",
      answer:
        "To submit a complaint, log into your account and navigate to the 'Submit Complaint' page. Fill out the required fields including the complaint type, department, priority level, and detailed description. Click 'Submit' to send your complaint to the appropriate department.",
    },
    {
      question: "How can I track my complaint status?",
      answer:
        "You can track your complaint status by visiting the 'My Complaints' page in your dashboard. Each complaint shows its current status (Pending, In Progress, Resolved, or Closed) along with any updates from the assigned staff member.",
    },
    {
      question: "What information should I include in my complaint?",
      answer:
        "Please provide as much detail as possible including: the nature of the issue, when it occurred, people involved, any relevant documentation, and your expected resolution. This helps our staff address your concern more effectively.",
    },
    {
      question: "How long does it take to resolve a complaint?",
      answer:
        "Resolution times vary depending on the complexity and priority of the complaint. Most complaints are addressed within 48-72 hours. High-priority and critical issues receive immediate attention and are typically resolved within 24 hours.",
    },
    {
      question: "Can I update my complaint after submission?",
      answer:
        "Yes, you can add additional information or comments to your complaint through the complaint details page. However, you cannot edit the original complaint details once submitted.",
    },
    {
      question: "What if I'm not satisfied with the resolution?",
      answer:
        "If you're not satisfied with the resolution, you can provide feedback through the feedback system or escalate the issue by contacting our support team directly. We take all concerns seriously and will review your case.",
    },
    {
      question: "How do I reset my password?",
      answer:
        "Click on 'Forgot Password' on the login page and enter your email address. You'll receive a password reset link via email. Follow the instructions in the email to create a new password.",
    },
    {
      question: "Who can access my complaint information?",
      answer:
        "Your complaint information is only accessible to you, the assigned staff member handling your case, and authorized administrators. We maintain strict confidentiality and data protection protocols.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Show public HomePageHeader when not authenticated; when authenticated show a compact back header */}
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
              <div className="text-lg font-semibold">Help & Support</div>
            </div>
          </div>
        </header>
      )}
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <HelpCircle className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              Help & Support
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Find answers to your questions, get help with the system, or
              contact our support team. We're here to ensure you have the best
              experience with our complaint management system.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Links section removed as requested */}

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Find quick answers to common questions
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Contact Support section removed as requested */}
      <Footer />
    </div>
  );
}
