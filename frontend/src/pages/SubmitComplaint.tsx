// Mock data for demonstration. Replace with API/context data as needed.
// Mock data for demonstration. Replace with API/context data as needed.
const staffList = [
  { id: "s1", fullName: "Alice Smith", department: "Computer Science" },
  { id: "s2", fullName: "Bob Johnson", department: "IT" },
  { id: "s3", fullName: "Carol Lee", department: "Information System" },
  { id: "s4", fullName: "David Kim", department: "Computer System" },
];
const hodList = [
  { id: "h1", fullName: "Dr. HoD CS", department: "Computer Science" },
  { id: "h2", fullName: "Dr. HoD IT", department: "IT" },
  { id: "h3", fullName: "Dr. HoD IS", department: "Information System" },
  { id: "h4", fullName: "Dr. HoD CSystem", department: "Computer System" },
];
const dean = { id: "d1", fullName: "Dean of College" };
const admin = { id: "a1", fullName: "System Admin" };
import { useState, useContext } from "react";
// Role-based categories
const roleCategories = {
  staff: [
    "Teacher Missed Class",
    "Lab / Equipment Issue",
    "Dormitory / Hostel Issue",
    "Cafeteria Issue",
    "Assignment / Coursework Issue",
    "Attendance / Roll-call Issue",
    "Classroom Maintenance (lights, fans, AC)",
    "Miscommunication regarding class or assignments",
    "Minor IT issues in department lab",
    "Student behavior or peer conflict in class",
  ],
  hod: [
    "Major Grade / Exam Issue",
    "Staff Misconduct (department-level)",
    "Department Resource Issue (labs, classrooms, equipment)",
    "Curriculum / Schedule Issue",
    "Class Allocation / Timetable Conflicts",
    "Student Disciplinary Issue (academic behavior)",
    "Department Events / Program Issues",
    "Faculty Absence or Unavailability",
    "Lab Safety or Compliance Issues",
    "Requests for Special Accommodations (exam or lab)",
  ],
  dean: [
    "College Facility Issue (lecture halls, auditoriums)",
    "Campus-wide Infrastructure Issue (internet, electricity, water)",
    "College Policy / Administration Issue",
    "Department Conflicts / Inter-department Issues",
    "College-wide Events / Program Issues",
    "Security / Safety Concerns affecting multiple departments",
    "Major Academic Policy Changes or Complaints",
    "Complaints related to Staff Promotions / Transfers",
    "College Transportation or Shuttle Issues",
    "Appeals for Cross-department Issues",
  ],
  admin: [
    "College Portal Issue",
    "System Errors / Technical Failures",
    "Feedback & Reports Management",
    "Student Account / Registration Issue",
    "Lost Access / Password Recovery",
    "Admin Notifications or Alerts Issue",
    "Data / Database Issue (Grades, Attendance)",
    "Complaint Analytics / Reporting Issue",
    "IT System Upgrades / Maintenance Feedback",
    "System-wide Communication Issue",
  ],
};
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
  // Ensure department is always one of the four for demo/testing
  const validDepartments = [
    "Computer Science",
    "IT",
    "Information System",
    "Computer System",
  ];
  const { addComplaint } = useComplaints();
  const { categories } = useContext(CategoryContext);
  const { user } = useAuth();
  let currentDepartment = user?.department;
  if (!validDepartments.includes(currentDepartment)) {
    currentDepartment = "Computer Science";
  }
  // End of submitted block

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    priority: "",
    description: "",
    role: "", // staff | hod | dean | admin
    recipient: "", // staffId, hodId, deanId, adminId
    deadline: "",
    anonymous: false,
  });
  const [touched, setTouched] = useState({
    title: false,
    category: false,
    priority: false,
    description: false,
    role: false,
    recipient: false,
    deadline: false,
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [complaintId, setComplaintId] = useState("");
  const [showDetailModal, setShowDetailModal] = useReactState(false);
  const [detailComplaint, setDetailComplaint] = useReactState(null);
  const { toast } = useToast();
  // Remove old submitTo, use formData.role
  // If you have user context, import/use it here
  // Example: const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      title: true,
      category: true,
      priority: true,
      description: true,
      role: touched.role,
      recipient: touched.recipient,
      deadline: touched.deadline,
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
      if (formData.role === "staff") {
        submittedTo = `Staff (${user?.department || "Unknown Department"})`;
        status = "Submitted to Staff";
      } else if (formData.role === "hod") {
        submittedTo = `HoD (${user?.department || "Unknown Department"})`;
        status = "Submitted to HoD";
      } else if (formData.role === "dean") {
        submittedTo = "Dean (Head of All Departments)";
        status = "Submitted to Dean";
      } else if (formData.role === "admin") {
        submittedTo = "Admin (System Administrator)";
        status = "Submitted to Admin";
      }
      // Map UI role value to canonical role keys
      const roleMap: Record<
        string,
        "staff" | "headOfDepartment" | "dean" | "admin"
      > = {
        staff: "staff",
        hod: "headOfDepartment",
        dean: "dean",
        admin: "admin",
      } as const;
      const targetRole = roleMap[formData.role as keyof typeof roleMap];
      const assignmentPath: Array<
        "student" | "headOfDepartment" | "dean" | "admin" | "staff"
      > = ["student"];
      if (targetRole === "headOfDepartment")
        assignmentPath.push("headOfDepartment");
      if (targetRole === "dean") assignmentPath.push("dean");
      if (targetRole === "admin") assignmentPath.push("admin");

      const savedComplaint = await addComplaint({
        ...formData,
        priority: formData.priority as "Low" | "Medium" | "High" | "Critical",
        submittedBy: formData.anonymous
          ? "Anonymous"
          : user?.username || "Current User",
        evidenceFile: evidenceFileString,
        submittedTo,
        department: user?.department || "Unknown Department",
        // Who created the complaint (role)
        sourceRole: "student",
        // If sent directly to staff, assignedByRole is student; else it's whoever routes next
        assignedByRole:
          targetRole === "staff"
            ? "student"
            : targetRole === "headOfDepartment"
            ? "headOfDepartment"
            : targetRole === "dean"
            ? "dean"
            : targetRole === "admin"
            ? "admin"
            : undefined,
        assignmentPath,
        deadline:
          formData.role === "staff" && formData.deadline
            ? new Date(formData.deadline)
            : undefined,
      });
      setComplaintId(savedComplaint?.id || "");
      setSubmitted(true);
      toast({
        title: "Complaint Submitted Successfully",
        description: `Your complaint has been assigned ID: ${
          savedComplaint?.id || "(ID unavailable)"
        }. The ${
          formData.role === "staff"
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
      role: "",
      recipient: "",
      deadline: "",
      anonymous: false,
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

  // Main Form and Cards must be wrapped in a single parent element
  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            className="space-y-6"
            autoComplete="off"
            onSubmit={handleSubmit}
          >
            {/* Anonymous Submission */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.anonymous}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    anonymous: !prev.anonymous,
                  }))
                }
                className="accent-blue-600 w-5 h-5"
              />
              <label
                htmlFor="anonymous"
                className="text-sm md:text-base font-medium select-none"
              >
                Submit Anonymously
              </label>
            </div>

            {/* Title & Priority */}
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

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Send To *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    role: value,
                    category: "",
                    recipient: "",
                  }));
                  setTouched((prev) => ({ ...prev, role: true }));
                }}
                required
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select recipient role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff (Your Department)</SelectItem>
                  <SelectItem value="hod">HoD (Head of Department)</SelectItem>
                  <SelectItem value="dean">
                    Dean (Head of All Departments)
                  </SelectItem>
                  <SelectItem value="admin">
                    Admin (System Administrator)
                  </SelectItem>
                </SelectContent>
              </Select>
              {touched.role && !formData.role && (
                <span className="text-xs text-red-600">
                  Recipient role is required.
                </span>
              )}
            </div>

            {/* Category Selection (filtered by role) */}
            {formData.role && (
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
                    {roleCategories[formData.role].map((category) => (
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
            )}

            {/* Recipient Selection (filtered by role and department) */}
            {formData.role && (
              <div className="space-y-2">
                <Label htmlFor="recipient">Select Recipient *</Label>
                <Select
                  value={formData.recipient}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, recipient: value }));
                    setTouched((prev) => ({ ...prev, recipient: true }));
                  }}
                  required
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRecipients(formData.role, currentDepartment).map(
                      (person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.fullName}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {touched.recipient && !formData.recipient && (
                  <span className="text-xs text-red-600">
                    Recipient is required.
                  </span>
                )}
              </div>
            )}

            {/* Deadline Field (only for staff) */}
            {formData.role === "staff" && (
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deadline: e.target.value,
                    }))
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, deadline: true }))
                  }
                  required
                  className="rounded-lg"
                />
                {touched.deadline && !formData.deadline && (
                  <span className="text-xs text-red-600">
                    Deadline is required for staff complaints.
                  </span>
                )}
              </div>
            )}

            {/* Evidence File */}
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

            {/* Description */}
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

            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting ||
                !formData.title ||
                !formData.category ||
                !formData.priority ||
                !formData.role ||
                !formData.recipient ||
                !formData.description ||
                (formData.role === "staff" && !formData.deadline)
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

  function getRecipients(role: string, currentDepartment: string) {
    switch (role) {
      case "staff":
        return staffList.filter((s) => s.department === currentDepartment);
      case "hod":
        return hodList.filter((h) => h.department === currentDepartment);
      case "dean":
        return [dean];
      case "admin":
        return [admin];
      default:
        return [];
    }
  }
}
