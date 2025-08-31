import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  onAssign: (complaintId: string, staffId: string, notes: string) => void;
}

export function AssignStaffModal({
  complaint,
  open,
  onOpenChange,
  onAssign
}: AssignStaffModalProps) {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [notes, setNotes] = useState("");
  const { getAllStaff } = useAuth();

  const approvedStaff = getAllStaff().filter(staff => 
    staff.status === 'approved' && staff.role === 'staff'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !selectedStaff) return;

    onAssign(complaint.id, selectedStaff, notes);
    setSelectedStaff("");
    setNotes("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStaff("");
      setNotes("");
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
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium">{complaint.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              ID: #{complaint.id}
            </p>
            <p className="text-sm text-muted-foreground">
              Category: {complaint.category}
            </p>
            <p className="text-sm text-muted-foreground">
              Current Status: {complaint.assignedStaff || "Unassigned"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-select">Select Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {approvedStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div>
                        <div className="font-medium">{staff.fullName || staff.name}</div>
                        <div className="text-sm text-muted-foreground">{staff.department}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-notes">Assignment Notes (Optional)</Label>
              <Textarea
                id="assignment-notes"
                placeholder="Any specific instructions or notes for the assigned staff member..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedStaff}>
                Assign Staff
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}