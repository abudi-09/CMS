import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2 } from "lucide-react";

interface AcceptComplaintModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  complaintId: string | null;
  defaultAssignToSelf?: boolean;
  onAccepted: (opts: {
    id: string;
    note?: string;
    assignToSelf: boolean;
  }) => Promise<void> | void;
  title?: string;
  confirmLabel?: string;
}

export function AcceptComplaintModal({
  open,
  onOpenChange,
  complaintId,
  defaultAssignToSelf = true,
  onAccepted,
  title = "Accept Complaint",
  confirmLabel = "Accept",
}: AcceptComplaintModalProps) {
  const [note, setNote] = useState("");
  const [assignToSelf, setAssignToSelf] = useState(defaultAssignToSelf);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setNote("");
    setAssignToSelf(defaultAssignToSelf);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="accept-note">
              Optional Note (visible to student)
            </Label>
            <Textarea
              id="accept-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Add an optional note or context..."
              rows={3}
            />
            <div className="text-xs text-muted-foreground text-right">
              {note.length}/500
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={assignToSelf}
              onCheckedChange={(v) => setAssignToSelf(Boolean(v))}
              id="assign-self"
            />
            <span>Assign to me and move to In Progress</span>
          </label>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || !complaintId}
            onClick={async () => {
              if (!complaintId) return;
              try {
                setSubmitting(true);
                await onAccepted({
                  id: complaintId,
                  note: note.trim() || undefined,
                  assignToSelf,
                });
                reset();
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
