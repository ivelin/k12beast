// src/app/public/session/[sessionId]/ClientCloneButton.tsx
"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ClientCloneButton({ sessionId }: { sessionId: string }) {
  const [isCloning, setIsCloning] = useState(false);

  const handleCloneSession = async () => {
    setIsCloning(true);
    try {
      const res = await fetch(`/api/session/clone/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to clone session");
      }

      const { sessionId: newSessionId } = await res.json();
      toast.success("Session cloned successfully!");
      window.location.href = `/chat/${newSessionId}`;
    } catch (err: any) {
      toast.error(err.message || "Error cloning session");
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Button onClick={handleCloneSession} className="mb-4" disabled={isCloning}>
      <Copy className="mr-2 h-4 w-4" />
      Clone
    </Button>
  );
}