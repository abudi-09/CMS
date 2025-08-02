import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, FileText, Info, ArrowRight } from "lucide-react";

const departments = [
  "Computer Science",
  "Information Systems",
  "Information Technology",
  "Computer Systems",
];

export function SubmitComplaint() {
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    description: "",
    priority: "Medium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [complaintId, setComplaintId] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.department || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    // TODO: Replace with real API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const newComplaintId = `CMP-${Date.now().toString().slice(-6)}`;
    setComplaintId(newComplaintId);
    setSubmitted(true);
    toast({
      title: "Complaint Submitted Successfully",
      description: `Your complaint has been assigned ID: ${newComplaintId}`,
    });
    setIsSubmitting(false);
  };
  // Reset form for submitting another complaint

  const handleSubmitAnother = () => {
    setSubmitted(false);
    setFormData({
      title: "",
      department: "",
      description: "",
      priority: "Medium",
    });
    setComplaintId("");
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-success/20 bg-success/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-success">
              Complaint Submitted Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-background/50 rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground mb-2">
                Your Complaint ID
              </p>
              <p className="text-2xl font-mono font-bold text-primary">
                {complaintId}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>
                    • Your complaint will be reviewed by our team within 24
                    hours
                  </li>
                  <li>• A staff member will be assigned to handle your case</li>
                  <li>• You'll receive email updates as the status changes</li>
                  <li>
                    • You can track progress in the "My Complaints" section
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={handleSubmitAnother} variant="outline">
                Submit Another Complaint
              </Button>
              <Button onClick={() => (window.location.href = "/my-complaints")}>
                View My Complaints
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Submit a Complaint</h1>
        <p className="text-lg text-muted-foreground">
          Please provide as much detail as possible to help us understand and
          resolve your issue.
        </p>
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complaint Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Complaint Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Brief summary of your complaint"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Select Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, department: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Select Complaint Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Provide detailed information about your complaint, including when it occurred, who was involved, and any steps you've already taken..."
                className="min-h-32"
                maxLength={1000}
                required
              />
              <div className="text-xs text-muted-foreground text-right">
                {formData.description.length}/1000 characters
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                "Submitting Complaint..."
              ) : (
                <>
                  Submit Complaint
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-info/5 border-info/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-info">
            <Info className="h-5 w-5" />
            What happens next?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-info mt-2 flex-shrink-0" />
              <p className="text-sm">
                Your complaint will be reviewed by our team within 24 hours
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-info mt-2 flex-shrink-0" />
              <p className="text-sm">
                You'll receive email updates as the status changes
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-info mt-2 flex-shrink-0" />
              <p className="text-sm">
                A staff member will be assigned to handle your case
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-info mt-2 flex-shrink-0" />
              <p className="text-sm">
                You can track progress in the "My Complaints" section
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-warning/5 border-warning/20">
        <CardHeader>
          <CardTitle className="text-warning">
            💡 Tips for Effective Complaints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• Be specific about dates, times, and locations</li>
            <li>• Include names of people involved (if applicable)</li>
            <li>• Describe what resolution you're hoping for</li>
            <li>• Attach any relevant documents or evidence</li>
            <li>• Use clear, professional language</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
