// File path: src/app/components/ui/ShareDialog.tsx
// Component for the share dialog to copy the session link

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareDialogProps {
  isOpen: boolean;
  shareableLink: string | null;
  onOpenChange: (open: boolean) => void;
  onCopyLink: () => Promise<void>;
}

export function ShareDialog({
  isOpen,
  shareableLink,
  onOpenChange,
  onCopyLink,
}: ShareDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="share-description">
        <DialogHeader>
          <DialogTitle>Share This Session</DialogTitle>
        </DialogHeader>
        <p id="share-description">Copy this link to share the session:</p>
        <input
          type="text"
          value={shareableLink || ""}
          readOnly
          className="w-full p-2 border rounded"
        />
        <Button onClick={onCopyLink}>Copy Link</Button>
      </DialogContent>
    </Dialog>
  );
}