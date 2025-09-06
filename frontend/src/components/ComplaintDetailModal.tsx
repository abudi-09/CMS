import { useState, useEffect } from "react";
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
import { useAuth } from "@/components/auth/AuthContext";
import {
  getComplaintFeedbackApi,
  addComplaintFeedbackApi,
  updateComplaintFeedbackApi,
  deleteComplaintFeedbackApi,
  addAdminTargetedFeedbackApi,
  markFeedbackReviewedApi,
  listUsersApi,
  type ComplaintFeedback,
} from "@/lib/api";
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
  const { user } = useAuth();
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState(
    complaint?.feedback?.comment || ""
  );
  const [feedbackRating, setFeedbackRating] = useState(
    complaint?.feedback?.rating || 0
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [feedbackItems, setFeedbackItems] = useState<ComplaintFeedback[]>([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  // admin-targeted feedback state
  const [admins, setAdmins] = useState<
    Array<{ _id: string; name?: string; email?: string }>
  >([]);
  const [adminTarget, setAdminTarget] = useState<string>("");
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";

  // Extract user id from auth object (support _id or id) without using any
  const currentUserId = (() => {
    if (!user) return undefined;
    const u = user as unknown as Record<string, unknown>;
    const v = u["_id"] || u["id"];
    return typeof v === "string" ? v : undefined;
  })();
  const canSubmitFeedback = Boolean(
    user &&
      currentUserId &&
      complaint &&
      complaint.submittedBy === currentUserId &&
      complaint.status === "Resolved"
  );

  // Load feedback entries when modal opens
  useEffect(() => {
    if (!(open && complaint)) return;
    (async () => {
      setFbLoading(true);
      try {
        const res = await getComplaintFeedbackApi(complaint.id);
        setFeedbackItems(res.items);
      } catch (e) {
        // silent
      } finally {
        setFbLoading(false);
      }
    })();
    if (isStudent) {
      (async () => {
        setLoadingAdmins(true);
        try {
          const res = await listUsersApi();
          setAdmins(res.users.filter((u) => u.role === "admin"));
        } catch (e) {
          // ignore
        } finally {
          setLoadingAdmins(false);
        }
      })();
    }
  }, [open, complaint, isStudent]);

  const handleAddFeedback = async () => {
    if (newRating === 0) return;
    setAdding(true);
    try {
      let res;
      if (adminTarget) {
        res = await addAdminTargetedFeedbackApi(complaint!.id, {
          rating: newRating,
          comment: newComment.trim() || undefined,
          adminTarget,
        });
      } else {
        res = await addComplaintFeedbackApi(complaint!.id, {
          rating: newRating,
          comment: newComment.trim() || undefined,
        });
      }
      setFeedbackItems((prev) => [res.feedback, ...prev]);
      setNewRating(0);
      setNewComment("");
      setAdminTarget("");
      toast({ title: "Feedback Added" });
    } catch (e) {
      toast({
        title: "Failed",
        description: "Could not add feedback",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (f: ComplaintFeedback) => {
    setEditingId(f._id);
    setEditRating(f.rating);
    setEditComment(f.comments || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await updateComplaintFeedbackApi(editingId, {
        rating: editRating,
        comment: editComment,
      });
      setFeedbackItems((prev) =>
        prev.map((f) => (f._id === editingId ? res.feedback : f))
      );
      setEditingId(null);
      toast({ title: "Feedback Updated" });
    } catch (e) {
      toast({
        title: "Failed",
        description: "Could not update feedback",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComplaintFeedbackApi(id);
      setFeedbackItems((prev) => prev.filter((f) => f._id !== id));
      toast({ title: "Feedback Deleted" });
    } catch (e) {
      toast({
        title: "Failed",
        description: "Could not delete",
        variant: "destructive",
      });
    }
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      const res = await markFeedbackReviewedApi(id);
      setFeedbackItems((prev) =>
        prev.map((f) => (f._id === id ? res.feedback : f))
      );
      toast({ title: "Marked Reviewed" });
    } catch (e) {
      toast({
        title: "Failed",
        description: "Could not mark reviewed",
        variant: "destructive",
      });
    }
  };

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
              <p className="text-sm text-muted-foreground">
                ID: #{complaint.id}
              </p>
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

          {/* Student Feedback (multi-entry) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4" /> Student Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fbLoading && (
                <div className="text-sm text-muted-foreground">
                  Loading feedback...
                </div>
              )}
              {!fbLoading && feedbackItems.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No feedback yet
                </div>
              )}
              {canSubmitFeedback && (
                <div className="border rounded-md p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating *</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          onClick={() => setNewRating(i + 1)}
                          className={`h-5 w-5 cursor-pointer transition ${
                            i < newRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300 hover:text-yellow-400"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {isStudent && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Target Admin (optional)
                      </label>
                      <select
                        className="w-full border rounded-md px-2 py-1 text-sm bg-background"
                        value={adminTarget}
                        onChange={(e) => setAdminTarget(e.target.value)}
                      >
                        <option value="">-- None (public) --</option>
                        {admins.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name || a.email || a._id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Textarea
                    placeholder="Share your experience..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    disabled={adding || newRating === 0}
                    onClick={handleAddFeedback}
                  >
                    {adding ? "Adding..." : "Submit Feedback"}
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {feedbackItems.map((f) => {
                  const mine =
                    currentUserId &&
                    (typeof f.user === "string"
                      ? f.user === currentUserId
                      : f.user?._id === currentUserId);
                  const editable = mine && f.reviewStatus !== "Reviewed";
                  const isTargetAdmin =
                    isAdmin &&
                    ((typeof f.targetAdmin === "string" &&
                      f.targetAdmin === currentUserId) ||
                      (typeof f.targetAdmin !== "string" &&
                        f.targetAdmin?._id === currentUserId) ||
                      !f.targetAdmin); // public admin feedback visible to all admins
                  return (
                    <div key={f._id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < f.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground">
                            {new Date(f.createdAt).toLocaleString()}
                          </span>
                          {isAdmin && (
                            <Badge
                              variant={
                                f.reviewStatus === "Reviewed"
                                  ? "default"
                                  : "outline"
                              }
                              className="ml-2 text-[10px] uppercase tracking-wide"
                            >
                              {f.reviewStatus === "Reviewed"
                                ? "Reviewed"
                                : "Pending"}
                            </Badge>
                          )}
                          {f.isAdminFeedback && isAdmin && f.targetAdmin && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              Targeted
                            </span>
                          )}
                        </div>
                        {editable && !editingId && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(f)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(f._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                        {!editable &&
                          isTargetAdmin &&
                          f.reviewStatus !== "Reviewed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkReviewed(f._id)}
                            >
                              Mark Reviewed
                            </Button>
                          )}
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        {typeof f.user === "string"
                          ? f.user
                          : f.user?.name || f.user?.email || "Student"}
                      </div>
                      {editingId === f._id ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                onClick={() => setEditRating(i + 1)}
                                className={`h-5 w-5 cursor-pointer ${
                                  i < editRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <Textarea
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm whitespace-pre-wrap">
                          {f.comments || "No comment provided."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Original single-feedback card retained below (optional could be removed) */}
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
