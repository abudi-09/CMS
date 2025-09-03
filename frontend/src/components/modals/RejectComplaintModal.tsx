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
import { XCircle, Loader2 } from "lucide-react";

interface RejectComplaintModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  complaintId: string | null;
  onRejected: (opts: { id: string; reason: string }) => Promise<void> | void;
  title?: string;
  confirmLabel?: string;
  requireReason?: boolean;
}

export function RejectComplaintModal({
  open,
  onOpenChange,
  complaintId,
  onRejected,
  title = "Reject Complaint",
  confirmLabel = "Reject",
  requireReason = true,
}: RejectComplaintModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => setReason("");

  const disabled =
    submitting || !complaintId || (requireReason && !reason.trim());

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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Reason{" "}
              {requireReason && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Provide a clear reason (max 500 chars)..."
              rows={4}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/500
            </div>
          </div>
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
            variant="destructive"
            disabled={disabled}
            onClick={async () => {
              if (!complaintId) return;
              try {
                setSubmitting(true);
                await onRejected({ id: complaintId, reason: reason.trim() });
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
