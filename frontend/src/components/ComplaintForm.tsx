import { useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CategoryContext, Category } from "@/context/CategoryContext";
import { submitComplaintApi, type Complaint as ApiComplaint } from "@/lib/api";

const departments = [
  "ICT",
  "Finance",
  "Registrar",
  "Library",
  "Academic Affairs",
]; // TODO: move to backend if needed

export function ComplaintForm() {
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    category: "",
    description: "",
    priority: "Medium",
  });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const categoryCtx = useContext(CategoryContext);
  const categories = categoryCtx?.categories || [];
  type Priority = "Low" | "Medium" | "High" | "Critical";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: ApiComplaint = {
        title: formData.title,
        department: formData.department,
        category: formData.category,
        description: formData.description,
        priority: formData.priority as Priority,
        isAnonymous,
        sourceRole: "student",
      } as ApiComplaint;
      await submitComplaintApi(payload);
      setSubmitted(true);
      toast({
        title: "Complaint Submitted Successfully",
        description:
          "Your complaint has been received and will be reviewed shortly.",
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? (e as { message?: string }).message
          : undefined;
      toast({
        title: "Submission Failed",
        description: msg || "Could not submit complaint",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
    // Reset form after success
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        title: "",
        department: "",
        category: "",
        description: "",
        priority: "Medium",
      });
      setIsAnonymous(false);
    }, 3000);
  };
  <div className="space-y-2">
    <Label htmlFor="category">Select Category *</Label>
    <Select
      value={formData.category}
      onValueChange={(value) =>
        setFormData((prev) => ({ ...prev, category: value }))
      }
      required
    >
      <SelectTrigger>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {categories
          .filter((c: Category) => c.status !== "inactive")
          .map((cat: Category) => (
            <SelectItem key={cat._id} value={cat.name}>
              {cat.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>;

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border border-success/20 bg-success/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-success mb-4" />
            <h3 className="text-2xl font-semibold text-success mb-2">
              Complaint Submitted!
            </h3>
            <p className="text-center text-muted-foreground mb-6">
              Your complaint has been received and assigned ID #CMP-
              {Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, "0")}
            </p>
            <Button
              onClick={() => setSubmitted(false)}
              variant="outline"
              className="w-full max-w-xs"
            >
              Submit Another Complaint
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Submit a Complaint</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Please provide as much detail as possible to help us understand and
          resolve your issue effectively.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Complaint Details
              </CardTitle>
              <CardDescription>
                Fill out the form below with your complaint information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Complaint Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Brief description of your issue"
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
                    placeholder="Please provide detailed information about your complaint..."
                    className="min-h-32"
                    maxLength={1000}
                    required
                  />
                  <div className="text-sm text-muted-foreground text-right">
                    {formData.description.length}/1000 characters
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="anonymous"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="anonymous">Send complaint anonymously</Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Complaint"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <strong>What happens next?</strong>
              <ul className="space-y-2 text-sm">
                <li>• Your complaint will be reviewed by our team</li>
                <li>• You'll receive updates as the status changes</li>
                <li>• A staff member will be assigned to handle your case</li>
                <li>• You can track progress in "My Complaints"</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Tips for Better Resolution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Be Specific:</strong> Include dates, locations, and
                names when relevant
              </div>
              <div>
                <strong>Stay Factual:</strong> Focus on facts rather than
                emotions
              </div>
              <div>
                <strong>Include Evidence:</strong> Mention any supporting
                documents or witnesses
              </div>
              <div>
                <strong>Suggest Solutions:</strong> If you have ideas for
                resolution, include them
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
