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
      <DialogContent className="w-[95vw] max-w-md mx-auto sm:w-full sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {warning && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-200 dark:border-red-800">
              {warning}
            </div>
          )}
          {children && (
            <div className="text-sm text-muted-foreground leading-relaxed">
              {children}
            </div>
          )}
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              if (onCancel) onCancel();
            }}
            className="w-full sm:w-auto h-10 sm:h-9"
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            className="w-full sm:w-auto h-10 sm:h-9"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
