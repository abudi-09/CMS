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
import { Layout } from "@/components/Layout";
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

      {/* Quick Links Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Quick Links
            </h2>
            <p className="text-xl text-muted-foreground">
              Access the most commonly requested resources
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickLinks.map((link, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <link.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button asChild className="w-full">
                    <a href={link.link}>{link.action}</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

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

      {/* Contact Support Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Contact Support
            </h2>
            <p className="text-xl text-muted-foreground">
              Get in touch with our support team
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {contactMethods.map((method, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <method.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{method.title}</CardTitle>
                  <CardDescription>{method.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {method.contact}
                  </p>
                  <Button variant="outline" className="w-full">
                    {method.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as
                  possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="rounded-md border p-2 dark:bg-gray-800 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="rounded-md border p-2 dark:bg-gray-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Subject
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="rounded-md border p-2 dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Message
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      className="rounded-md border p-2 dark:bg-gray-800 dark:text-white min-h-[120px]"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full hover:shadow-md transition-shadow"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
