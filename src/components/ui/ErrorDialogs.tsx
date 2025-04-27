// File path: src/components/ui/ErrorDialogs.tsx
// Component for error dialogs (retryable, non-retryable, session-expired, and simple close dialog)

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ErrorDialogsProps {
  showErrorPopup: boolean;
  errorType: "retryable" | "nonRetryable" | "sessionExpired" | "simple" | null; // Add "sessionExpired" type
  error: string | null;
  onRetry?: () => Promise<void>; // Optional for retryable errors
  onNewChat?: () => void; // Optional for non-retryable errors
  onClosePopup: () => void;
}

export function ErrorDialogs({
  showErrorPopup,
  errorType,
  error,
  onRetry,
  onNewChat,
  onClosePopup,
}: ErrorDialogsProps) {
  return (
    <>
      {/* Retryable Error Dialog (e.g., network errors) */}
      {errorType === "retryable" && onRetry && onNewChat && (
        <Dialog 
          open={showErrorPopup} 
          onOpenChange={onClosePopup}
        >
          <DialogContent aria-describedby="error-description-retryable">
            <DialogHeader>
              <DialogTitle>Oops!</DialogTitle>
            </DialogHeader>
            <p id="error-description-retryable">{error}</p>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button onClick={onRetry} variant="default">
                Retry
              </Button>
              <Button onClick={onNewChat} variant="secondary">
                Start New Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Non-Retryable Error Dialog (e.g., non-K12-related input) */}
      {errorType === "nonRetryable" && onNewChat && (
        <Dialog 
          open={showErrorPopup} 
          onOpenChange={onNewChat}
        >
          <DialogContent aria-describedby="error-description-non-retryable">
            <DialogHeader>
              <DialogTitle>Oops!</DialogTitle>
            </DialogHeader>
            <p id="error-description-non-retryable">{error}</p>
            <DialogFooter>
              <Button onClick={onNewChat} variant="default">
                Start New Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Session Expired Dialog (e.g., for layout.tsx session expiration) */}
      {errorType === "sessionExpired" && (
        <Dialog 
          open={showErrorPopup} 
          onOpenChange={onClosePopup}
        >
          <DialogContent aria-describedby="error-description-session-expired">
            <DialogHeader>
              <DialogTitle>Oops!</DialogTitle>
            </DialogHeader>
            <p id="error-description-session-expired">{error}</p>
            <DialogFooter>
              <Button onClick={onClosePopup}>Login</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Simple Error Dialog (e.g., for PublicSessionPage) */}
      {errorType === "simple" && (
        <Dialog 
          open={showErrorPopup} 
          onOpenChange={onClosePopup}
        >
          <DialogContent aria-describedby="error-description">
            <DialogHeader>
              <DialogTitle>Oops!</DialogTitle>
            </DialogHeader>
            <p id="error-description">{error}</p>
            <DialogFooter>
              <Button onClick={onClosePopup}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}