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
import { RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ReopenComplaintModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  complaintId: string | null;
  onReopen: (opts: {
    id: string;
    reason: string;
    acceptImmediately: boolean;
  }) => Promise<void> | void;
}

export function ReopenComplaintModal({
  open,
  onOpenChange,
  complaintId,
  onReopen,
}: ReopenComplaintModalProps) {
  const [reason, setReason] = useState("");
  const [acceptImmediately, setAcceptImmediately] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setAcceptImmediately(true);
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
            <RefreshCw className="h-5 w-5" /> Reopen (Undo Rejection)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reopen-reason">
              Reason for Reopening <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reopen-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Explain why you are undoing the rejection (max 500 chars)..."
              rows={4}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/500
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={acceptImmediately}
              onCheckedChange={(v) => setAcceptImmediately(Boolean(v))}
              id="reopen-accept"
            />
            <span>Immediately accept and move to In Progress</span>
          </label>
          {acceptImmediately && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <CheckCircle className="h-4 w-4 text-success" /> This will record
              both a reopening and acceptance in the timeline.
            </div>
          )}
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
            disabled={submitting || !complaintId || !reason.trim()}
            onClick={async () => {
              if (!complaintId || !reason.trim()) return;
              try {
                setSubmitting(true);
                await onReopen({
                  id: complaintId,
                  reason: reason.trim(),
                  acceptImmediately,
                });
                reset();
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
            Reopen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
