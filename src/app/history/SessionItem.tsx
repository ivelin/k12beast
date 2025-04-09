// src/app/history/SessionItem.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SessionItemProps {
  session: {
    id: string;
    lesson?: string;
    examples?: any;
    quizzes?: any;
    performanceHistory?: any;
    created_at?: string;
    updated_at: string; // Now guaranteed to have a value
  };
}

export default function SessionItem({ session }: SessionItemProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const shareableLink = `${window.location.origin}/session/${session.id}`;

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

  const firstContent = session.lesson || "Image-based Problem";

  let lastUpdatedDisplay;
  try {
    lastUpdatedDisplay = new Date(session.updated_at).toLocaleString();
  } catch (error) {
    console.error("Error formatting updated_at:", error);
    lastUpdatedDisplay = "Invalid date";
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition">
        <Link href={`/session/${session.id}`} className="flex-1">
          <h2 className="text-lg font-semibold">{firstContent}</h2>
          <p className="text-sm text-muted-foreground">
            {session.created_at
              ? new Date(session.created_at).toLocaleString()
              : "No date available"}
          </p>
          <p className="text-sm mt-2">
            Last Updated: {lastUpdatedDisplay}
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