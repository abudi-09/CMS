import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Complaint } from "./ComplaintCard";

interface StatusUpdateModalProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (complaintId: string, newStatus: string, notes: string) => void;
  userRole?: "staff" | "admin";
}

const statusOptions = [
  {
    value: "Pending",
    label: "Pending",
    description: "Waiting to be assigned or reviewed",
  },
  {
    value: "In Progress",
    label: "In Progress",
    description: "Currently being worked on",
  },
  {
    value: "Resolved",
    label: "Resolved",
    description: "Issue has been addressed",
  },
  {
    value: "Closed",
    label: "Closed",
    description: "Case is complete and closed",
  },
];

export function StatusUpdateModal({
  complaint,
  open,
  onOpenChange,
  onUpdate,
  userRole = "staff",
}: StatusUpdateModalProps) {
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!complaint || !newStatus) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onUpdate(complaint.id, newStatus, notes);

    toast({
      title: "Status Updated",
      description: `Complaint status has been updated to ${newStatus}.`,
    });

    // Reset form
    setNewStatus("");
    setNotes("");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setNewStatus("");
    setNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    } else if (complaint) {
      setNewStatus(complaint.status);
    }
    onOpenChange(open);
  };

  if (!complaint) return null;

  const availableStatuses = statusOptions.filter((option) => {
    // Staff can only move from Pending → In Progress → Resolved
    if (userRole === "staff") {
      if (complaint.status === "Pending") {
        return ["Pending", "In Progress"].includes(option.value);
      } else if (complaint.status === "In Progress") {
        return ["In Progress", "Resolved"].includes(option.value);
      } else if (complaint.status === "Resolved") {
        return ["Resolved"].includes(option.value);
      }
      return false;
    }
    // Admin can set any status
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Complaint Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm">
            <div className="font-medium mb-1">Complaint:</div>
            <div className="text-muted-foreground">{complaint.title}</div>
            {/* Complaint ID intentionally hidden in the UI */}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Status *</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
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

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Update Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this status update..."
              className="min-h-20"
              maxLength={300}
            />
            <div className="text-xs text-muted-foreground text-right">
              {notes.length}/300 characters
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
              disabled={
                !newStatus || newStatus === complaint.status || isSubmitting
              }
              className="flex-1"
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
