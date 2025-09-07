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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  User,
  Calendar,
  Flag,
  CheckCircle,
  X,
  Save,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Complaint } from "@/components/ComplaintCard";
import { toast } from "@/hooks/use-toast";

type ComplaintWithEvidence = Complaint & {
  evidenceFile?: string;
  category?: string;
};

interface UnifiedActionModalProps {
  complaint: ComplaintWithEvidence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (complaintId: string, status: string, notes: string) => void;
  userRole?: "admin" | "staff";
}

const statusOptions = [
  { value: "Pending", label: "Pending", description: "Waiting for action" },
  {
    value: "In Progress",
    label: "In Progress",
    description: "Currently being worked on",
  },
  { value: "Resolved", label: "Resolved", description: "Issue has been fixed" },
  { value: "Rejected", label: "Rejected", description: "Cannot be addressed" },
  { value: "Closed", label: "Closed", description: "Completed and closed" },
];

export function UnifiedActionModal({
  complaint,
  open,
  onOpenChange,
  onUpdate,
  userRole = "staff",
}: UnifiedActionModalProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (complaint) {
      setNewStatus(complaint.status);
      setResolutionNote("");
    }
  }, [complaint]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNewStatus("");
      setResolutionNote("");
    }
    onOpenChange(open);
  };

  const handleSaveChanges = async () => {
    if (!complaint) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate(complaint.id, newStatus, resolutionNote);

      toast({
        title: "Changes Saved",
        description: `Complaint status updated to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveResolve = async () => {
    if (!complaint) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate(
        complaint.id,
        "Resolved",
        resolutionNote || "Complaint has been resolved"
      );

      toast({
        title: "Complaint Resolved",
        description: "Complaint has been approved and marked as resolved",
      });

      handleOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve complaint",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectClose = async () => {
    if (!complaint) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate(
        complaint.id,
        "Closed",
        resolutionNote || "Complaint has been rejected"
      );

      toast({
        title: "Complaint Closed",
        description: "Complaint has been rejected and closed",
      });

      handleOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close complaint",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "In Progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "Resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "Closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  if (!complaint) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            View Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Complaint Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complaint Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {complaint.title}
                </h3>
                <div className="flex gap-2 mb-3">
                  <Badge
                    className={getPriorityColor(complaint.priority)}
                    variant="outline"
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    {complaint.priority}
                  </Badge>
                  <Badge
                    className={getStatusColor(complaint.status)}
                    variant="outline"
                  >
                    {complaint.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Description
                </h4>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {complaint.description}
                </p>
              </div>

              {complaint.evidenceFile && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Evidence
                  </h4>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Evidence File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student & Submission Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Student & Submission Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    Student Name
                  </div>
                  <p className="font-medium">{complaint.submittedBy}</p>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Category
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {complaint.category}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Date Submitted
                  </div>
                  <p className="text-sm">
                    {complaint.submittedDate.toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Date Assigned
                  </div>
                  <p className="text-sm">
                    {complaint.submittedDate.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Priority
                  </div>
                  <Badge
                    className={getPriorityColor(complaint.priority)}
                    variant="outline"
                  >
                    {complaint.priority}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Assigned To
                  </div>
                  <p className="text-sm font-medium">
                    {complaint.assignedStaff || "Unassigned"}
                  </p>
                </div>
              </div>

              {complaint.feedback && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Student Feedback
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-xs ${
                            i < (complaint.feedback?.rating || 0)
                              ? "text-yellow-500"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({complaint.feedback.rating}/5)
                      </span>
                    </div>
                    <p className="text-xs">{complaint.feedback.comment}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resolution Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resolution Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Update Status
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div>
                        <div className="font-medium">{status.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {status.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Resolution Note (Optional)
              </label>
              <Textarea
                placeholder="Add resolution notes, updates, or comments..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
              <Button
                onClick={handleSaveChanges}
                disabled={isLoading || !newStatus}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                onClick={handleApproveResolve}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isLoading ? "Processing..." : "Approve & Resolve"}
              </Button>

              <Button
                onClick={handleRejectClose}
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                {isLoading ? "Processing..." : "Reject & Close"}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <AlertTriangle className="h-3 w-3" />
              <span>
                All actions will be logged and timestamped for audit purposes.
              </span>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
