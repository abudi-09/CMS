import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Complaint } from "./ComplaintCard";
import { useAuth } from "./auth/AuthContext";

interface AssignStaffModalProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Handler invoked when user confirms assignment.
   * deadline will be an ISO-like yyyy-mm-dd string when provided.
   */
  onAssign: (
    complaintId: string,
    staffId: string,
    notes: string,
    deadline?: string
  ) => Promise<void> | void;
  /** Optional explicit staff list (defaults to all approved staff from auth context) */
  staffList?: Array<{
    id: string;
    name?: string;
    fullName?: string;
    email: string;
    department?: string;
  }>;
  /** Whether deadline is required (default true to mirror previous inline UI) */
  requireDeadline?: boolean;
}

export function AssignStaffModal({
  complaint,
  open,
  onOpenChange,
  onAssign,
  staffList,
  requireDeadline = true,
}: AssignStaffModalProps) {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { getAllStaff } = useAuth();

  // Derive staff options
  const internalStaff = staffList
    ? staffList
    : getAllStaff()
        .filter(
          (s) =>
            s.status === "approved" && (s.role === "staff" || s.role === "hod")
        )
        .map((s) => ({
          id: s.id,
          name: s.name,
          fullName: s.fullName,
          email: s.email,
          department: s.department,
        }));

  // Reset form whenever we close or switch complaint
  useEffect(() => {
    if (!open) {
      setSelectedStaff("");
      setNotes("");
      setDeadline("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !selectedStaff || (requireDeadline && !deadline)) return;
    try {
      setSubmitting(true);
      await onAssign(complaint.id, selectedStaff, notes, deadline || undefined);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStaff("");
      setNotes("");
      setDeadline("");
      setSubmitting(false);
    }
    onOpenChange(newOpen);
  };

  if (!complaint) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Staff Member</DialogTitle>
          <DialogDescription>
            Assign a staff member to handle this complaint
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-1">
            <h4 className="font-medium truncate" title={complaint.title}>
              {complaint.title}
            </h4>
            <p className="text-xs text-muted-foreground">ID: #{complaint.id}</p>
            <p className="text-xs text-muted-foreground">
              Category: {complaint.category}
            </p>
            <p className="text-xs text-muted-foreground">
              Current Assignee: {complaint.assignedStaff || "Unassigned"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-select">Select Staff Member</Label>
              <Select
                value={selectedStaff}
                onValueChange={setSelectedStaff}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {internalStaff.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      No staff found
                    </div>
                  )}
                  {internalStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-sm">
                          {staff.fullName || staff.name || staff.email}
                        </span>
                        {staff.department && (
                          <span className="text-[11px] text-muted-foreground">
                            {staff.department}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">
                Deadline{" "}
                {requireDeadline && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required={requireDeadline}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-notes">
                Assignment Notes (Optional)
              </Label>
              <Textarea
                id="assignment-notes"
                placeholder="Any specific instructions or notes for the assigned staff member..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting || !selectedStaff || (requireDeadline && !deadline)
                }
              >
                {submitting
                  ? "Assigning..."
                  : complaint.assignedStaff
                  ? "Reassign"
                  : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
