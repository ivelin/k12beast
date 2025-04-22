// File path: src/app/public/session/[sessionId]/page.tsx
// Renders a public view of a shared session, displaying messages and diagrams.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { ChatContainer, ChatMessages } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Session } from "@/store/types";
import { buildSessionMessages, injectChatScripts } from "@/utils/sessionUtils";
import React from "react";

export default function PublicSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = React.use(params);
  const [messages, setMessages] = useState<any[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [clonedFrom, setClonedFrom] = useState<string | null>(null);

  // Inject MathJax scripts once per page
  useEffect(() => {
    injectChatScripts();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const res = await fetch(`/api/session/${sessionId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch session");
        }

        const data = await res.json();
        const fetchedSession: Session = data.session;

        const updatedMessages = buildSessionMessages(fetchedSession);
        setMessages(updatedMessages);
        setClonedFrom(fetchedSession.cloned_from || null);
        setShareableLink(`${window.location.origin}/public/session/${sessionId}`);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Error loading session");
          setShowErrorPopup(true);
        }
      } finally {
        setIsLoadingSession(false);
      }
    }

    loadSession();
    return () => controller.abort();
  }, [sessionId]);

  const handleShare = async () => {
    if (!shareableLink) {
      alert("No active session to share.");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "K12Beast Session",
          text: "Check out this tutoring session on K12Beast!",
          url: shareableLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
        setIsShareModalOpen(true);
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handleCopyLink = async () => {
    if (shareableLink) {
      try {
        toast.dismiss();
        await navigator.clipboard.writeText(shareableLink);
        toast.success("Link copied to clipboard!", { duration: 2000 });
        setIsShareModalOpen(false);
      } catch (err) {
        console.error("Error copying link:", err);
        toast.dismiss();
        toast.error("Failed to copy link to clipboard.", { duration: 2000 });
      }
    }
  };

  const handleClosePopup = () => {
    setShowErrorPopup(false);
    setError(null);
    window.location.href = "/public/login";
  };

  if (isLoadingSession) {
    return <div className="container mx-auto p-4">Loading session, please wait...</div>;
  }

  return (
    <div className="container">
      {/* Cloned From Label */}
      {clonedFrom && (
        <div className="text-sm text-muted-foreground mb-4">
          <p>
            This session was cloned from{" "}
            <Link
              href={`/public/session/${clonedFrom}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-dark"
            >
              a shared session
            </Link>.
          </p>
        </div>
      )}
      <div className="flex justify-end items-center mb-4">
        <div className="flex space-x-2">
          <div className="relative group">
            <Button
              onClick={handleShare}
              className="bg-muted text-foreground rounded-md p-3 shadow-lg hover:bg-muted/90"
              aria-label="Share session"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <span className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-background text-foreground text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity sm:hidden">
              Share
            </span>
            <span className="hidden sm:block absolute top-12 left-1/2 transform -translate-x-1/2 bg-background text-foreground text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Share Session
            </span>
          </div>
        </div>
      </div>
      <ChatContainer className="flex-1">
        <ChatMessages className="flex flex-col items-start">
          <MessageList messages={messages} isTyping={false} />
        </ChatMessages>
      </ChatContainer>

      <Dialog open={showErrorPopup} onOpenChange={handleClosePopup}>
        <DialogContent aria-describedby="error-description">
          <DialogHeader>
            <DialogTitle>Oops!</DialogTitle>
          </DialogHeader>
          <p id="error-description">{error}</p>
          <DialogFooter>
            <Button onClick={handleClosePopup}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
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
          <Button onClick={handleCopyLink}>Copy Link</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
