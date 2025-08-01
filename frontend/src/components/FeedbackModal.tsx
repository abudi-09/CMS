import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Complaint } from "./ComplaintCard";

interface FeedbackModalProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (complaintId: string, feedback: { rating: number; comment: string }) => void;
}

export function FeedbackModal({ complaint, open, onOpenChange, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!complaint || rating === 0) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSubmit(complaint.id, { rating, comment });
    
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback. It helps us improve our services.",
    });
    
    // Reset form
    setRating(0);
    setComment("");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setRating(0);
    setComment("");
    setHoveredStar(0);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  if (!complaint) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Give Feedback</DialogTitle>
          <DialogDescription>
            How was your experience with the resolution of your complaint?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm">
            <div className="font-medium mb-1">Complaint:</div>
            <div className="text-muted-foreground">{complaint.title}</div>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm font-medium">Rate your experience *</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`text-2xl transition-colors ${
                    star <= (hoveredStar || rating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                >
                  <Star className={`h-6 w-6 ${
                    star <= (hoveredStar || rating) ? "fill-current" : ""
                  }`} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="text-sm text-muted-foreground">
                {rating === 1 && "Poor - Very unsatisfied with the service"}
                {rating === 2 && "Fair - Below expectations"}
                {rating === 3 && "Good - Met expectations"}
                {rating === 4 && "Very Good - Exceeded expectations"}
                {rating === 5 && "Excellent - Outstanding service"}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Comments (Optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share any additional thoughts about your experience..."
              className="min-h-20"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {comment.length}/500 characters
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}