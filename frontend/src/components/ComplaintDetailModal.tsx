import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  User,
  Tag,
  FileText,
  Download,
  Star,
  Edit,
  Save,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Complaint } from "./ComplaintCard";
import { useToast } from "@/hooks/use-toast";

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Closed: "bg-muted/10 text-muted-foreground border-muted/20",
};

const priorityColors = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export function ComplaintDetailModal({
  complaint,
  open,
  onOpenChange,
}: ComplaintDetailModalProps) {
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState(
    complaint?.feedback?.comment || ""
  );
  const [feedbackRating, setFeedbackRating] = useState(
    complaint?.feedback?.rating || 0
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!complaint) return null;

  // Mock additional data
  const mockComplaintData = {
    ...complaint,
    priority: "High",
    evidenceFile:
      complaint.id === "CMP-001"
        ? {
            name: "library_issue_photo.jpg",
            size: "2.3 MB",
            url: "#",
          }
        : null,
    resolvedDate:
      complaint.status === "Resolved" ? new Date("2024-01-20") : null,
  };

  const handleSaveFeedback = async () => {
    if (feedbackRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a rating before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsEditingFeedback(false);
      toast({
        title: "Feedback Updated",
        description: "Your feedback has been successfully updated.",
      });
    }, 1000);
  };

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          interactive
            ? "cursor-pointer hover:scale-110 transition-transform"
            : ""
        } ${
          i < rating
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300 hover:text-yellow-400"
        }`}
        onClick={interactive ? () => setFeedbackRating(i + 1) : undefined}
      />
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "In Progress":
        return <AlertTriangle className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Complaint Details</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  priorityColors[
                    mockComplaintData.priority as keyof typeof priorityColors
                  ]
                }
              >
                {mockComplaintData.priority}
              </Badge>
              <Badge
                variant="outline"
                className={
                  statusColors[complaint.status as keyof typeof statusColors]
                }
              >
                {getStatusIcon(complaint.status)}
                <span className="ml-1">{complaint.status}</span>
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Complaint Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{complaint.title}</CardTitle>
              {/* Complaint ID intentionally hidden in UI */}
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Description & Evidence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description & Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {complaint.description}
                    </p>
                  </div>
                </div>

                {mockComplaintData.evidenceFile && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Evidence File</h4>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {mockComplaintData.evidenceFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mockComplaintData.evidenceFile.size}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {!mockComplaintData.evidenceFile && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No evidence file uploaded
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Complaint Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Complaint Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Category</div>
                      <div className="text-sm text-muted-foreground">
                        {complaint.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Date Submitted</div>
                      <div className="text-sm text-muted-foreground">
                        {complaint.submittedDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  {mockComplaintData.resolvedDate && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Date Resolved</div>
                        <div className="text-sm text-muted-foreground">
                          {mockComplaintData.resolvedDate.toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Assigned To</div>
                      <div className="text-sm text-muted-foreground">
                        {complaint.assignedStaff || "Not assigned yet"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Your Feedback */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Your Feedback
                </CardTitle>
                {complaint.feedback && !isEditingFeedback && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingFeedback(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Feedback
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {complaint.feedback && !isEditingFeedback ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating:</span>
                    <div className="flex items-center gap-1">
                      {renderStars(complaint.feedback.rating)}
                      <span className="text-sm text-muted-foreground ml-2">
                        ({complaint.feedback.rating}/5)
                      </span>
                    </div>
                  </div>
                  {complaint.feedback.comment && (
                    <div>
                      <span className="text-sm font-medium">Comment:</span>
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm">{complaint.feedback.comment}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : isEditingFeedback ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Rating *</label>
                    <div className="flex items-center gap-1 mt-2">
                      {renderStars(feedbackRating, true)}
                      <span className="text-sm text-muted-foreground ml-2">
                        ({feedbackRating}/5)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Comment (Optional)
                    </label>
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Share your experience with the resolution..."
                      className="mt-2"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveFeedback} disabled={isLoading}>
                      <Save className="h-4 w-4 mr-1" />
                      {isLoading ? "Saving..." : "Save Feedback"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingFeedback(false);
                        setFeedbackText(complaint.feedback?.comment || "");
                        setFeedbackRating(complaint.feedback?.rating || 0);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No feedback submitted yet
                  </p>
                  {complaint.status === "Resolved" && (
                    <Button onClick={() => setIsEditingFeedback(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Add Feedback
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
