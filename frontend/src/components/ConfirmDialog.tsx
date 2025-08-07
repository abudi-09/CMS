import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  warning?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  warning,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {warning && <div className="text-sm text-red-600 mb-2">{warning}</div>}
        {children}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              if (onCancel) onCancel();
            }}
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
