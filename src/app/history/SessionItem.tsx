// src/app/history/SessionItem.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/ui/message-list";
import { ChatMessages } from "@/components/ui/chat";
import FormattedTimestamp from "@/components/ui/formatted-timestamp"; // Import the new component

interface Message {
  role: "user" | "assistant";
  content: string;
  renderAs?: "markdown" | "html";
  experimental_attachments?: { name: string; url: string }[];
}

interface SessionItemProps {
  session: {
    id: string;
    problem?: string;
    images?: string[] | null;
    created_at?: string;
    updated_at: string;
  };
}

export default function SessionItem({ session }: SessionItemProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const shareableLink = `${window.location.origin}/public/session/${session.id}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "K12Beast Session",
          text: "Check out my tutoring session on K12Beast!",
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
    try {
      await navigator.clipboard.writeText(shareableLink);
      toast.success("Link copied to clipboard!");
      setIsShareModalOpen(false);
    } catch (err) {
      console.error("Error copying link:", err);
      toast.error("Failed to copy link to clipboard.");
    }
  };

  // Create a message object for the problem and images
  const messages: Message[] = [];
  if (session.problem || (session.images && session.images.length > 0)) {
    const attachments = session.images?.map((url, index) => ({
      name: `Image ${index + 1}`,
      url,
    })) || [];
    messages.push({
      role: "user",
      content: session.problem || "Image-based problem",
      renderAs: "markdown",
      experimental_attachments: attachments.length > 0 ? attachments : undefined,
    });
  } else {
    messages.push({
      role: "user",
      content: "No problem or images available",
      renderAs: "markdown",
    });
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition">
        <Link href={`/chat/${session.id}`} className="flex-1">
          <ChatMessages className="flex flex-col items-start">
            <MessageList messages={messages} showTimeStamps={false} />
            {session.images && session.images.length > 0 && messages[0]?.experimental_attachments?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Images failed to load
              </p>
            )}
          </ChatMessages>
          <p className="text-sm text-muted-foreground">
            {session.created_at ? (
              <FormattedTimestamp timestamp={session.created_at} format="short" />
            ) : (
              "No date available"
            )}
          </p>
          <p className="text-sm mt-2">
            Last Updated: <FormattedTimestamp timestamp={session.updated_at} format="short" />
          </p>
        </Link>
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          aria-label="Share session"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Session</DialogTitle>
          </DialogHeader>
          <p>Copy this link to share your session:</p>
          <input
            type="text"
            value={shareableLink}
            readOnly
            className="w-full p-2 border rounded"
          />
          <Button onClick={handleCopyLink}>Copy Link</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}