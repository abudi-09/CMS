import { useState, useEffect } from "react";
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
  const { user } = useAuth();
  const { toast } = useToast();

  const [staffUpdate, setStaffUpdate] = useState("");
  const [feedback, setFeedback] = useState({ rating: 0, comment: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (complaint && complaint.feedback) {
      setFeedback(complaint.feedback);
    } else {
      setFeedback({ rating: 0, comment: "" });
    }
    setStaffUpdate("");
  }, [complaint]);

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

  if (!complaint || !user) return null;

  // Hardcode a value for resolutionNote for testing
  complaint.resolutionNote =
    complaint.resolutionNote ||
    "This is a hardcoded staff update for testing purposes.";

  // Role-based View Detail button
  const showViewDetailButton =
    (user.role === "admin" || user.role === "staff") && complaint;

  const isAssigned = !!complaint.assignedStaff;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complaint Details
          </DialogTitle>
        </DialogHeader>

        {/* Complaint Information Section (always shown) */}
        <Card>
          <CardHeader>
            <CardTitle>Complaint Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-3">{complaint.title}</h3>
              <div className="flex gap-2 mb-4">
                <Badge
                  variant="outline"
                  className={getPriorityColor(complaint.priority || "")}
                >
                  <Flag className="h-3 w-3 mr-1" />
                  {complaint.priority}
                </Badge>
                {isAssigned && (
                  <Badge
                    variant="outline"
                    className={getStatusColor(complaint.status)}
                  >
                    {complaint.status}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                {complaint.description}
              </div>
            </div>

            {complaint.evidenceFile && (
              <div>
                <Label className="text-sm font-medium">Evidence</Label>
                <Button variant="outline" size="sm" className="mt-1 w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Evidence File
                </Button>
              </div>
            )}
            {/* Staff Update visible to all users if exists, but only if assigned */}
            {isAssigned && complaint.resolutionNote && (
              <div>
                <Label className="text-sm font-medium">Staff Update</Label>
                <div className="mt-1 p-3 bg-info/5 border border-info/20 rounded-lg text-sm">
                  {complaint.resolutionNote}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                  <span className="font-medium">{complaint.submittedBy}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Category
                </Label>
                <Badge variant="secondary" className="mt-1">
                  {complaint.category}
                </Badge>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Priority
                </Label>
                <Badge
                  variant="outline"
                  className={`mt-1 ${getPriorityColor(
                    complaint.priority || ""
                  )}`}
                >
                  {complaint.priority}
                </Badge>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Date Submitted
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {complaint.submittedDate
                      ? new Date(complaint.submittedDate).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </div>

              {complaint.deadline && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Deadline
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const deadlineDate = new Date(complaint.deadline);
                      const now = new Date();
                      const isOverdue =
                        now > deadlineDate &&
                        !["Resolved", "Closed"].includes(complaint.status);
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
                      {complaint.assignedStaff || "Unassigned"}
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
                      {complaint.lastUpdated
                        ? new Date(complaint.lastUpdated).toLocaleDateString()
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
              {/* Timeline steps - mock or real data */}
              {[
                {
                  label: "Submitted",
                  role: "student",
                  icon: <User className="h-4 w-4" />,
                  time: complaint.submittedDate,
                  desc: "Complaint submitted by student.",
                },
                isAssigned && {
                  label: "Assigned",
                  role: "admin",
                  icon: <UserCheck className="h-4 w-4" />,
                  time: complaint.assignedDate || complaint.submittedDate,
                  desc: `Assigned to ${complaint.assignedStaff}`,
                },
                isAssigned &&
                  complaint.status === "In Progress" && {
                    label: "In Progress",
                    role: "staff",
                    icon: <Settings className="h-4 w-4" />,
                    time: complaint.lastUpdated,
                    desc: "Staff started working on the complaint.",
                  },
                isAssigned &&
                  complaint.status === "Resolved" && {
                    label: "Resolved",
                    role: "staff",
                    icon: <CheckCircle className="h-4 w-4 text-success" />,
                    time: complaint.lastUpdated,
                    desc: "Complaint marked as resolved.",
                  },
              ]
                .filter(Boolean)
                .map((step, idx, arr) => (
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
                        {step.time instanceof Date
                          ? step.time.toLocaleString()
                          : String(step.time)}
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
