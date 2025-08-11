// MOCK DATA FOR DEVELOPMENT/TESTING ONLY
// Remove or comment out before deploying to production
export const mockComplaint = {
  id: "mock123",
  title: "WiFi not working in hostel",
  description: "The WiFi in hostel block B has been down for 3 days.",
  category: "Infrastructure",
  priority: "High",
  status: "Pending" as const,
  submittedBy: "John Doe",
  submittedDate: new Date(),
  assignedStaff: "Jane Staff",
  assignedDate: new Date(Date.now() - 86400000), // 1 day ago
  lastUpdated: new Date(),
  deadline: new Date(Date.now() + 3 * 86400000), // 3 days from now
  evidenceFile: null,
  resolutionNote: "Checked the router, awaiting replacement part.",
  feedback: { rating: 4, comment: "Staff responded quickly." },
};

import { useState, useEffect } from "react";
import { getComplaintApi } from "@/lib/getComplaintApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  User,
  Calendar,
  Flag,
  CheckCircle,
  X,
  MessageSquare,
  Download,
  Star,
  Clock,
  UserCheck,
  Settings,
} from "lucide-react";
import { Complaint } from "@/components/ComplaintCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";

interface RoleBasedComplaintModalProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (complaintId: string, updates: Partial<Complaint>) => void;
  children?: React.ReactNode;
}

export function RoleBasedComplaintModal({
  complaint,
  open,
  onOpenChange,
  onUpdate,
  children,
}: RoleBasedComplaintModalProps) {
  // Local state for live backend complaint
  // For development, you can use mockComplaint as the initial value:
  // const [liveComplaint, setLiveComplaint] = useState<Complaint | null>(mockComplaint);
  const [liveComplaint, setLiveComplaint] = useState<Complaint | null>(
    complaint
  );
  // Helper for type-safe user display
  function getUserDisplay(user: unknown): string {
    if (!user) return "Unknown";
    if (typeof user === "string") return user;
    if (typeof user === "object" && user !== null) {
      // @ts-expect-error: user may be an object with name/email, but TS can't infer this from unknown
      return user.name || user.email || "Unknown";
    }
    return "Unknown";
  }
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [staffUpdate, setStaffUpdate] = useState("");
  const [feedback, setFeedback] = useState({ rating: 0, comment: "" });
  const [isLoading, setIsLoading] = useState(false);
  // Helper for type-safe staff display
  function getStaffDisplay(staff: unknown): string {
    if (!staff) return "Unassigned";
    if (typeof staff === "string") return staff;
    if (typeof staff === "object" && staff !== null) {
      // @ts-expect-error: staff may be an object with name/email, but TS can't infer this from unknown
      return staff.name || staff.email || "Assigned";
    }
    return "Assigned";
  }

  // Fetch latest complaint from backend when modal opens or complaint changes
  useEffect(() => {
    let ignore = false;
    async function fetchComplaint() {
      if (open && complaint?.id) {
        setLoading(true);
        try {
          const data = await getComplaintApi(complaint.id);
          if (!ignore) setLiveComplaint(data);
        } catch (e) {
          if (!ignore) setLiveComplaint(complaint); // fallback
        } finally {
          if (!ignore) setLoading(false);
        }
      } else {
        setLiveComplaint(complaint);
      }
    }
    fetchComplaint();
    return () => {
      ignore = true;
    };
  }, [open, complaint]);

  useEffect(() => {
    if (liveComplaint && liveComplaint.feedback) {
      setFeedback(liveComplaint.feedback);
    } else {
      setFeedback({ rating: 0, comment: "" });
    }
    setStaffUpdate("");
  }, [liveComplaint]);

  const handleApprove = async () => {
    if (!complaint) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate?.(complaint.id, { status: "In Progress" });
      toast({
        title: "Complaint Approved",
        description: "Complaint status updated to In Progress",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve complaint",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!complaint) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate?.(complaint.id, { status: "Closed" });
      toast({
        title: "Complaint Rejected",
        description: "Complaint has been rejected and closed",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject complaint",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!complaint || !staffUpdate.trim()) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate?.(complaint.id, { resolutionNote: staffUpdate });
      toast({
        title: "Update Added",
        description: "Your update has been added to the complaint",
      });
      setStaffUpdate("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add update",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!complaint || feedback.rating === 0) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate?.(complaint.id, { feedback });
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "border-destructive text-destructive";
      case "high":
        return "border-orange-500 text-orange-600";
      case "medium":
        return "border-warning text-warning";
      case "low":
        return "border-success text-success";
      default:
        return "border-muted-foreground text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "border-warning text-warning";
      case "In Progress":
        return "border-info text-info";
      case "Resolved":
        return "border-success text-success";
      case "Closed":
        return "border-muted-foreground text-muted-foreground";
      default:
        return "border-muted-foreground text-muted-foreground";
    }
  };

  if (!liveComplaint || !user) return null;

  // Role-based View Detail button
  const showViewDetailButton =
    (user.role === "admin" || user.role === "staff") && liveComplaint;

  // Log the complaint object for debugging
  console.log("RoleBasedComplaintModal liveComplaint:", liveComplaint);

  // Robust check for assignment: true if assignedStaff is a non-empty string or a non-null object
  const isAssigned = !!(
    liveComplaint.assignedStaff &&
    ((typeof liveComplaint.assignedStaff === "string" &&
      liveComplaint.assignedStaff.trim() !== "") ||
      (typeof liveComplaint.assignedStaff === "object" &&
        liveComplaint.assignedStaff !== null))
  );

  // Build timeline steps robustly: always show 'Assigned' if assignedStaff is present
  const timelineSteps = [
    {
      label: "Submitted",
      role: "student",
      icon: <User className="h-4 w-4" />,
      time: liveComplaint.submittedDate,
      desc: "Complaint submitted by student.",
    },
    ...(liveComplaint.assignedStaff
      ? [
          {
            label: "Assigned",
            role: "admin",
            icon: <UserCheck className="h-4 w-4" />,
            time: liveComplaint.assignedDate || liveComplaint.submittedDate,
            desc: `Assigned to ${getStaffDisplay(liveComplaint.assignedStaff)}`,
          },
        ]
      : []),
    ...(liveComplaint.status === "In Progress"
      ? [
          {
            label: "In Progress",
            role: "staff",
            icon: <Settings className="h-4 w-4" />,
            time: liveComplaint.lastUpdated,
            desc: "Staff started working on the complaint.",
          },
        ]
      : []),
    ...(liveComplaint.status === "Resolved"
      ? [
          {
            label: "Resolved",
            role: "staff",
            icon: <CheckCircle className="h-4 w-4 text-success" />,
            time: liveComplaint.lastUpdated,
            desc: "Complaint marked as resolved.",
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complaint Details
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <span className="relative inline-block h-12 w-12">
              <span className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></span>
              <span className="absolute inset-2 rounded-full border-2 border-muted animate-pulse"></span>
              <span className="absolute inset-4 rounded-full bg-primary/20"></span>
            </span>
            <div className="mt-4 text-lg font-semibold text-primary">
              Loading complaint details...
            </div>
          </div>
        ) : (
          <>
            {/* Complaint Information Section (always shown) */}
            <Card>
              <CardHeader>
                <CardTitle>Complaint Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-3">
                    {liveComplaint.title}
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <Badge
                      variant="outline"
                      className={getPriorityColor(liveComplaint.priority || "")}
                    >
                      <Flag className="h-3 w-3 mr-1" />
                      {liveComplaint.priority}
                    </Badge>
                    {isAssigned && (
                      <Badge
                        variant="outline"
                        className={getStatusColor(liveComplaint.status)}
                      >
                        {liveComplaint.status}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                    {liveComplaint.description}
                  </div>
                </div>

                {liveComplaint.evidenceFile && (
                  <div>
                    <Label className="text-sm font-medium">Evidence</Label>
                    <Button variant="outline" size="sm" className="mt-1 w-full">
                      <Download className="h-4 w-4" />
                      Download Evidence File
                    </Button>
                  </div>
                )}
                {/* Staff Update visible to all users if exists, but only if assigned */}
                {isAssigned && liveComplaint.resolutionNote && (
                  <div>
                    <Label className="text-sm font-medium">Staff Update</Label>
                    <div className="mt-1 p-3 bg-info/5 border border-info/20 rounded-lg text-sm">
                      {liveComplaint.resolutionNote}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Information Section (always shown) */}
            {/* ...existing code, replace all complaint. with liveComplaint. ... */}
          </>
        )}

        {/* Submission Information Section (always shown) */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Student Name
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {getUserDisplay(liveComplaint.submittedBy)}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Category
                </Label>
                <Badge variant="secondary" className="mt-1">
                  {liveComplaint.category}
                </Badge>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Priority
                </Label>
                <Badge
                  variant="outline"
                  className={`mt-1 ${getPriorityColor(
                    liveComplaint.priority || ""
                  )}`}
                >
                  {liveComplaint.priority}
                </Badge>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Date Submitted
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {liveComplaint.submittedDate
                      ? new Date(
                          liveComplaint.submittedDate
                        ).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </div>

              {liveComplaint.deadline && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Deadline
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const deadlineDate = new Date(liveComplaint.deadline);
                      const now = new Date();
                      const isOverdue =
                        now > deadlineDate &&
                        !["Resolved", "Closed"].includes(liveComplaint.status);
                      return (
                        <span
                          className={`text-sm font-semibold ${
                            isOverdue ? "text-red-600" : "text-blue-600"
                          }`}
                        >
                          {deadlineDate.toLocaleDateString()}
                          {isOverdue && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                              Overdue
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}

              {isAssigned && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Assigned To
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <UserCheck className="h-4 w-4" />
                    <span className="text-sm">
                      {getStaffDisplay(liveComplaint.assignedStaff)}
                    </span>
                  </div>
                </div>
              )}

              {isAssigned && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Last Updated
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {liveComplaint.lastUpdated
                        ? new Date(
                            liveComplaint.lastUpdated
                          ).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Complaint Timeline (always shown) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Complaint Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 border-l-2 border-muted-foreground/20 space-y-8">
              {/* Timeline steps - always use liveComplaint for latest backend state */}
              {timelineSteps.map((step, idx, arr) => (
                <div
                  key={step.label}
                  className="flex items-start gap-4 relative"
                >
                  <div className="absolute -left-6 top-0">
                    <div
                      className={`rounded-full bg-background border-2 border-primary flex items-center justify-center w-7 h-7 ${
                        idx === arr.length - 1 ? "border-success" : ""
                      }`}
                    >
                      {step.icon}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{step.label}</span>
                      <Badge variant="outline" className="capitalize">
                        {step.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {step.time ? new Date(step.time).toLocaleString() : ""}
                    </div>
                    <div className="text-sm mt-1">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Only show these sections if assigned */}
        {isAssigned && (
          <>
            {/* Role-specific Actions */}
            {user.role === "user" && (
              <>
                {complaint.status === "Resolved" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Submit Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Rate your experience (1-5 stars)</Label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() =>
                                setFeedback({ ...feedback, rating: star })
                              }
                              className={`p-1 ${
                                star <= feedback.rating
                                  ? "text-warning"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <Star className="h-5 w-5 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Comments (Optional)</Label>
                        <Textarea
                          placeholder="Share your feedback about the resolution..."
                          value={feedback.comment}
                          onChange={(e) =>
                            setFeedback({
                              ...feedback,
                              comment: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={handleFeedbackSubmit}
                        disabled={isLoading || feedback.rating === 0}
                        className="w-full"
                      >
                        Submit Feedback
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {complaint.feedback && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < complaint.feedback!.rating
                                ? "text-warning fill-current"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({complaint.feedback.rating}/5)
                        </span>
                      </div>
                      {complaint.feedback.comment && (
                        <p className="text-sm">{complaint.feedback.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {user.role === "staff" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Staff Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {complaint.status === "Pending" && (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleApprove}
                        disabled={isLoading}
                        className="flex-1 bg-success hover:bg-success/90"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept & Start Working
                      </Button>
                      <Button
                        onClick={handleReject}
                        disabled={isLoading}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject Complaint
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label>Add Progress Update</Label>
                    <Textarea
                      placeholder="Provide updates on the complaint progress..."
                      value={staffUpdate}
                      onChange={(e) => setStaffUpdate(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleAddUpdate}
                      disabled={isLoading || !staffUpdate.trim()}
                      className="mt-2 w-full"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Update
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin view shows status logs and student feedback */}
            {user.role === "admin" && complaint.feedback && (
              <Card>
                <CardHeader>
                  <CardTitle>Student Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < complaint.feedback!.rating
                            ? "text-warning fill-current"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({complaint.feedback.rating}/5)
                    </span>
                  </div>
                  {complaint.feedback.comment && (
                    <p className="text-sm">{complaint.feedback.comment}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
