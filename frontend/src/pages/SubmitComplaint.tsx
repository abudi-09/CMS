import { useState, useContext } from "react";
// Update the path below if your ComplaintContext file is in a different location
import { useComplaints } from "@/context/ComplaintContext";
import { CategoryContext } from "@/context/CategoryContext";
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
import { CheckCircle, FileText, Info, ArrowRight, Upload } from "lucide-react";
import { useState as useReactState } from "react";
import { RoleBasedComplaintModal } from "@/components/RoleBasedComplaintModal";
import { getComplaintApi } from "@/lib/getComplaintApi";
import { useAuth } from "@/components/auth/AuthContext";

// Categories now come from context

const priorities = [
  { value: "Critical", label: "Critical", color: "bg-red-100 text-red-800" },
  { value: "High", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "Medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "Low", label: "Low", color: "bg-green-100 text-green-800" },
];

export function SubmitComplaint() {
  const { addComplaint } = useComplaints();
  const { categories } = useContext(CategoryContext);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    priority: "",
    description: "",
    staff: "",
  });
  const [touched, setTouched] = useState({
    title: false,
    category: false,
    priority: false,
    description: false,
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [complaintId, setComplaintId] = useState("");
  const [showDetailModal, setShowDetailModal] = useReactState(false);
  const [detailComplaint, setDetailComplaint] = useReactState(null);
  const { toast } = useToast();
  const [submitAnonymously, setSubmitAnonymously] = useState(false);
  const [submitTo, setSubmitTo] = useState("staff"); // 'staff' or 'dean'
  // If you have user context, import/use it here
  // Example: const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      title: true,
      category: true,
      priority: true,
      description: true,
    });
    if (
      !formData.title ||
      !formData.category ||
      !formData.priority ||
      !formData.description
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      let evidenceFileString = "";
      if (evidenceFile) {
        // Convert file to base64 string (or use URL.createObjectURL if only for preview)
        evidenceFileString = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(evidenceFile);
        });
      }
      let submittedTo = "";
      let status = "";
      if (submitTo === "staff") {
        submittedTo = `Staff (${user?.department || "Unknown Department"})`;
        status = "Submitted to Staff";
      } else {
        submittedTo = "Dean (Head of All Departments)";
        status = "Submitted to Dean";
      }
      const savedComplaint = await addComplaint({
        ...formData,
        priority: formData.priority as "Low" | "Medium" | "High" | "Critical",
        submittedBy: submitAnonymously
          ? "Anonymous"
          : user?.username || "Current User",
        evidenceFile: evidenceFileString,
        submittedTo,
        department: user?.department || "Unknown Department",
      });
      setComplaintId(savedComplaint?.id || "");
      setSubmitted(true);
      toast({
        title: "Complaint Submitted Successfully",
        description: `Your complaint has been assigned ID: ${
          savedComplaint?.id || "(ID unavailable)"
        }. The ${
          submitTo === "staff"
            ? `Staff (${user?.department || "Unknown Department"})`
            : "Dean (Head of All Departments)"
        } has been notified and will review your complaint shortly.`,
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description:
          "There was an error submitting your complaint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setSubmitted(false);
    setFormData({
      title: "",
      category: "",
      priority: "",
      description: "",
      staff: "",
    });
    setEvidenceFile(null);
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
              <p className="text-xs text-green-700 mt-2">
                This complaint is now visible to the admin team for review.
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>
                    • Your complaint is now visible to the admin team and will
                    be reviewed within 24 hours
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
              <Button
                variant="secondary"
                onClick={async () => {
                  setShowDetailModal(true);
                  if (complaintId) {
                    try {
                      const data = await getComplaintApi(complaintId);
                      setDetailComplaint(data);
                    } catch {
                      setDetailComplaint(null);
                    }
                  }
                }}
              >
                View Details
              </Button>
            </div>
            {showDetailModal && detailComplaint && (
              <RoleBasedComplaintModal
                complaint={detailComplaint}
                open={showDetailModal}
                onOpenChange={setShowDetailModal}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Replace this with your actual staff fetching logic or context
  function getAllStaff() {
    // Example static data; replace with real data source
    return [
      { id: "1", fullName: "John Doe", department: "Computer Science" },
      { id: "2", fullName: "Jane Smith", department: "IT" },
      { id: "3", fullName: "Alice Johnson", department: "Information System" },
      { id: "4", fullName: "Bob Brown", department: "Computer System" },
    ];
  }

  // Ensure department is always one of the four for demo/testing
  const validDepartments = [
    "Computer Science",
    "IT",
    "Information System",
    "Computer System",
  ];
  let currentDepartment = user?.department;
  if (!validDepartments.includes(currentDepartment)) {
    currentDepartment = "Computer Science";
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
      <Card className="shadow-lg rounded-2xl bg-white dark:bg-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complaint Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            autoComplete="off"
          >
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={submitAnonymously}
                onChange={() => setSubmitAnonymously((prev) => !prev)}
                className="accent-blue-600 w-5 h-5"
              />
              <label
                htmlFor="anonymous"
                className="text-sm md:text-base font-medium select-none"
              >
                Submit Anonymously
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Complaint Title *</Label>
                <Input
                  id="title"
                  aria-label="Complaint Title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, title: true }))
                  }
                  placeholder="Brief summary of your complaint"
                  required
                  className="rounded-lg"
                  autoComplete="off"
                />
                {touched.title && !formData.title && (
                  <span className="text-xs text-red-600">
                    Title is required.
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, priority: value }));
                    setTouched((prev) => ({ ...prev, priority: true }));
                  }}
                  required
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select priority level" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${priority.color}`}
                          />
                          {priority.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.priority && !formData.priority && (
                  <span className="text-xs text-red-600">
                    Priority is required.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, category: value }));
                  setTouched((prev) => ({ ...prev, category: true }));
                }}
                required
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select complaint category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.category && !formData.category && (
                <span className="text-xs text-red-600">
                  Category is required.
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence File</Label>
              <div className="space-y-2">
                <Input
                  id="evidence"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.docx"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Upload evidence or related document (JPG, PNG, PDF,
                  DOCX)
                </p>
                {evidenceFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{evidenceFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEvidenceFile(null)}
                      className="ml-auto h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                aria-label="Complaint Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, description: true }))
                }
                placeholder="Provide detailed information about your complaint, including when it occurred, who was involved, and any steps you've already taken..."
                className="min-h-32 rounded-lg"
                maxLength={1000}
                required
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground text-right">
                {formData.description.length}/1000 characters
              </div>
              {touched.description && !formData.description && (
                <span className="text-xs text-red-600">
                  Description is required.
                </span>
              )}
            </div>

            {/* Department (auto-filled, read-only) */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={currentDepartment}
                readOnly
                className="rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Submit To dropdown */}
            <div className="space-y-2">
              <Label htmlFor="submitTo">Submit To *</Label>
              <Select value={submitTo} onValueChange={setSubmitTo} required>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select who to submit to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">
                    Staff ({user?.department || "Your Department"})
                  </SelectItem>
                  <SelectItem value="dean">
                    Dean (Head of All Departments)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff selection (only if Staff is selected) */}
            {submitTo === "staff" && (
              <div className="space-y-2">
                <Label htmlFor="staff">
                  Select Staff (Your Department){" "}
                  <span className="text-xs text-muted-foreground">
                    (Optional)
                  </span>
                </Label>
                <Select
                  value={formData.staff || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, staff: value }))
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select staff member (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Preference</SelectItem>
                    {getAllStaff()
                      .filter((staff) => staff.department === currentDepartment)
                      .map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.fullName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting ||
                !formData.title ||
                !formData.category ||
                !formData.priority ||
                !formData.description
              }
              size="lg"
              aria-label="Submit Complaint"
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
