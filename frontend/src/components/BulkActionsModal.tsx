import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Complaint } from "@/components/ComplaintCard";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Users,
  Settings,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComplaints: Complaint[];
  onBulkAction: (
    action: string,
    data: {
      complaints: Complaint[];
      staffId?: string;
      status?: string;
      note?: string;
      action: string;
    }
  ) => void;
}

const bulkActions = [
  {
    id: "assign",
    label: "Assign to Staff",
    icon: Users,
    description: "Assign selected complaints to a staff member",
    requiresStaff: true,
  },
  {
    id: "status",
    label: "Change Status",
    icon: Settings,
    description: "Update status of selected complaints",
    requiresStatus: true,
  },
  {
    id: "resolve",
    label: "Mark as Resolved",
    icon: CheckCircle2,
    description: "Mark all selected complaints as resolved",
    requiresNote: true,
  },
  {
    id: "close",
    label: "Close Complaints",
    icon: Settings,
    description: "Close all selected complaints",
    requiresNote: true,
  },
  {
    id: "delete",
    label: "Delete Complaints",
    icon: Trash2,
    description: "Permanently delete selected complaints",
    destructive: true,
    requiresConfirmation: true,
  },
];

const mockStaffMembers = [
  { id: "1", name: "Dr. Sarah Johnson", department: "IT Services" },
  { id: "2", name: "Mark Thompson", department: "Academic Affairs" },
  { id: "3", name: "Lisa Chen", department: "Facilities" },
  { id: "4", name: "James Wilson", department: "Student Services" },
];

export function BulkActionsModal({
  isOpen,
  onClose,
  selectedComplaints,
  onBulkAction,
}: BulkActionsModalProps) {
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [note, setNote] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    const action = bulkActions.find((a) => a.id === selectedAction);
    if (!action) return;

    // Validation
    if (action.requiresStaff && !selectedStaff) {
      toast({
        title: "Error",
        description: "Please select a staff member",
        variant: "destructive",
      });
      return;
    }

    if (action.requiresStatus && !selectedStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    if (action.requiresConfirmation && confirmationText !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm",
        variant: "destructive",
      });
      return;
    }

    // Prepare action data
    const actionData = {
      complaints: selectedComplaints,
      staffId: selectedStaff,
      status: selectedStatus,
      note: note.trim(),
      action: selectedAction,
    };

    onBulkAction(selectedAction, actionData);

    // Reset form
    setSelectedAction("");
    setSelectedStaff("");
    setSelectedStatus("");
    setNote("");
    setConfirmationText("");
    onClose();
  };

  const selectedActionConfig = bulkActions.find((a) => a.id === selectedAction);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bulk Actions - {selectedComplaints.length} complaint
            {selectedComplaints.length !== 1 ? "s" : ""} selected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Complaints Preview */}
          <div>
            <Label className="text-sm font-medium">Selected Complaints</Label>
            <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-3 bg-muted/50">
              <div className="space-y-2">
                {selectedComplaints.slice(0, 5).map((complaint) => (
                  <div
                    key={complaint.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {/* Complaint ID intentionally hidden in UI */}{" "}
                      {complaint.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {complaint.status}
                    </Badge>
                  </div>
                ))}
                {selectedComplaints.length > 5 && (
                  <div className="text-sm text-muted-foreground">
                    ... and {selectedComplaints.length - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <Label htmlFor="action">Select Action</Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose an action to perform" />
              </SelectTrigger>
              <SelectContent>
                {bulkActions.map((action) => (
                  <SelectItem key={action.id} value={action.id}>
                    <div className="flex items-center gap-2">
                      <action.icon className="h-4 w-4" />
                      <div>
                        <div
                          className={
                            action.destructive ? "text-destructive" : ""
                          }
                        >
                          {action.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Fields Based on Action */}
          {selectedActionConfig?.requiresStaff && (
            <div>
              <Label htmlFor="staff">Assign to Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {mockStaffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} - {staff.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedActionConfig?.requiresStatus && (
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedActionConfig?.requiresNote && (
            <div>
              <Label htmlFor="note">
                {selectedAction === "resolve" ? "Resolution Note" : "Note"}{" "}
                (Optional)
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  selectedAction === "resolve"
                    ? "Describe how the complaints were resolved..."
                    : "Add a note about this action..."
                }
                className="mt-2"
                rows={3}
              />
            </div>
          )}

          {selectedActionConfig?.requiresConfirmation && (
            <div className="border border-destructive/20 rounded-md p-4 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Destructive Action</span>
              </div>
              <p className="text-sm text-destructive/80 mb-3">
                This action cannot be undone. All selected complaints will be
                permanently deleted.
              </p>
              <Label htmlFor="confirmation">Type "DELETE" to confirm</Label>
              <input
                id="confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-destructive/30 rounded-md focus:ring-2 focus:ring-destructive focus:border-destructive"
                placeholder="Type DELETE"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedAction}
              variant={
                selectedActionConfig?.destructive ? "destructive" : "default"
              }
            >
              {selectedActionConfig?.destructive ? "Delete" : "Apply Action"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
