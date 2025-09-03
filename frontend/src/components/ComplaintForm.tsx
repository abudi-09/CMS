import { useContext, useEffect, useMemo, useState } from "react";
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
import {
  listActiveAdminsPublicApi,
  listActiveDeansPublicApi,
  listMyDepartmentActiveStaffApi,
} from "@/lib/api";

type Priority = "Low" | "Medium" | "High" | "Critical";

type ApiComplaint = {
  title: string;
  department: string;
  category: string;
  description: string;
  priority: Priority;
  isAnonymous: boolean;
  sourceRole: "student";
  recipientRole: "admin" | "dean" | "hod" | "staff" | null;
  recipientId: string | null;
  submittedTo?: "admin" | "dean" | "hod";
  recipientStaffId?: string;
  recipientHodId?: string;
};

async function submitComplaintApi(payload: ApiComplaint): Promise<void> {
  try {
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let message = "Could not submit complaint";
      try {
        const data = await res.json();
        if (data && typeof data.message === "string") {
          message = data.message;
        }
      } catch {
        // ignore parse error
      }
      throw new Error(message);
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error("Could not submit complaint");
  }
}

export default function ComplaintForm() {
  const departments = [
    "ICT",
    "Finance",
    "Registrar",
    "Library",
    "Academic Affairs",
  ];
  const { toast } = useToast();
  const categoryCtx = useContext(CategoryContext);
  const categories = categoryCtx?.categories || [];

  const [formData, setFormData] = useState<{
    title: string;
    department: string;
    category: string;
    description: string;
    priority: Priority;
    recipientRole: "" | "admin" | "dean" | "hod" | "staff";
    recipientId: string;
  }>({
    title: "",
    department: "",
    category: "",
    description: "",
    priority: "Medium",
    recipientRole: "",
    recipientId: "",
  });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load dynamic recipients for selection
  const [admins, setAdmins] = useState<
    Array<{ _id: string; name?: string; email: string }>
  >([]);
  const [deans, setDeans] = useState<
    Array<{ _id: string; name?: string; email: string }>
  >([]);
  const [staff, setStaff] = useState<
    Array<{ _id: string; name?: string; fullName?: string; email: string }>
  >([]);

  useEffect(() => {
    // Fire-and-forget; errors will be ignored and lists remain empty
    (async () => {
      try {
        const [adminsRes, deansRes, staffRes] = await Promise.allSettled([
          listActiveAdminsPublicApi(),
          listActiveDeansPublicApi(),
          listMyDepartmentActiveStaffApi(),
        ]);
        if (adminsRes.status === "fulfilled") setAdmins(adminsRes.value || []);
        if (deansRes.status === "fulfilled") setDeans(deansRes.value || []);
        if (staffRes.status === "fulfilled") setStaff(staffRes.value || []);
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  const selectedRoleRequiresUser = useMemo(() => {
    // Require explicit user selection for admin, dean, staff. HoD selection can be role-only (department HoD).
    return (
      formData.recipientRole === "admin" ||
      formData.recipientRole === "dean" ||
      formData.recipientRole === "staff"
    );
  }, [formData.recipientRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: ApiComplaint = {
        title: formData.title,
        department: formData.department,
        category: formData.category,
        description: formData.description,
        priority: formData.priority,
        isAnonymous,
        sourceRole: "student",
        recipientRole: formData.recipientRole || null,
        recipientId: formData.recipientId || null,
      };
      if (formData.recipientRole === "hod") payload.submittedTo = "hod";
      // If sending directly to staff or HoD with a specific person, use direct recipient ids for immediate assignment semantics supported by backend
      if (formData.recipientRole === "staff" && formData.recipientId) {
        payload.recipientStaffId = formData.recipientId;
      }
      if (formData.recipientRole === "hod" && formData.recipientId) {
        payload.recipientHodId = formData.recipientId;
      }
      // For role-routed visibility: set submittedTo for admin/dean/hod inboxes
      if (formData.recipientRole === "admin") payload.submittedTo = "admin";
      if (formData.recipientRole === "dean") payload.submittedTo = "dean";
      if (formData.recipientRole === "hod") payload.submittedTo = "hod";
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
        recipientRole: "",
        recipientId: "",
      });
      setIsAnonymous(false);
    }, 3000);
  };

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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientRole">Send To *</Label>
                  <Select
                    value={formData.recipientRole}
                    onValueChange={(
                      value: "admin" | "dean" | "hod" | "staff"
                    ) =>
                      setFormData((prev) => ({
                        ...prev,
                        recipientRole: value,
                        recipientId: "",
                      }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="dean">Dean</SelectItem>
                      <SelectItem value="hod">Head of Department</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedRoleRequiresUser && (
                  <div className="space-y-2">
                    <Label htmlFor="recipientId">
                      Select Specific Recipient *
                    </Label>
                    <Select
                      value={formData.recipientId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, recipientId: value }))
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.recipientRole === "admin" &&
                          admins.map((u) => (
                            <SelectItem key={u._id} value={u._id}>
                              {u.name || u.email}
                            </SelectItem>
                          ))}
                        {formData.recipientRole === "dean" &&
                          deans.map((u) => (
                            <SelectItem key={u._id} value={u._id}>
                              {u.name || u.email}
                            </SelectItem>
                          ))}
                        {formData.recipientRole === "staff" &&
                          staff.map((u) => (
                            <SelectItem key={u._id} value={u._id}>
                              {u.fullName || u.name || u.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="priority">Select Complaint Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: Priority) =>
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
