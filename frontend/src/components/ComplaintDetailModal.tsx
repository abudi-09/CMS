import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Tag, FileText } from "lucide-react";
import { Complaint } from "./ComplaintCard";

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors = {
  "Pending": "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Resolved": "bg-green-100 text-green-800",
  "Closed": "bg-gray-100 text-gray-800"
};

export function ComplaintDetailModal({ complaint, open, onOpenChange }: ComplaintDetailModalProps) {
  if (!complaint) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complaint Details
            </span>
            <Badge className={statusColors[complaint.status]}>
              {complaint.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">{complaint.title}</h3>
            <div className="text-sm text-muted-foreground">ID: #{complaint.id}</div>
          </div>
          
          <Separator />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Submitted Date</div>
                  <div className="text-sm text-muted-foreground">
                    {complaint.submittedDate.toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Submitted By</div>
                  <div className="text-sm text-muted-foreground">
                    {complaint.submittedBy}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Category</div>
                  <div className="text-sm text-muted-foreground">
                    {complaint.category}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Assigned Staff</div>
                  <div className="text-sm text-muted-foreground">
                    {complaint.assignedStaff || "Not assigned yet"}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Last Updated</div>
                  <div className="text-sm text-muted-foreground">
                    {complaint.lastUpdated.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-3">Description</h4>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>
          </div>
          
          {complaint.feedback && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">User Feedback</h4>
                <div className="bg-green-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-lg ${
                            star <= complaint.feedback!.rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({complaint.feedback.rating}/5)
                    </span>
                  </div>
                  {complaint.feedback.comment && (
                    <div>
                      <span className="text-sm font-medium">Comment:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {complaint.feedback.comment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}