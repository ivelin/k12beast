// src/hooks/use-copy-to-clipboard.ts
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UseCopyToClipboardProps {
  text: string;
  copyMessage?: string;
}

export function useCopyToClipboard({
  text,
  copyMessage = "Copied to clipboard!",
}: UseCopyToClipboardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(copyMessage);
        setIsCopied(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        timeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((error: unknown) => {
        toast.error("Failed to copy to clipboard.");
        console.error(
          "Copy error:",
          error instanceof Error ? error.message : String(error)
        );
      });
  }, [text, copyMessage]);

  return { isCopied, handleCopy };
}