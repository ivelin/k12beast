// src/app/history/SessionItem.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import supabase from "@/supabase/browserClient";

interface SessionItemProps {
  sessionId: string;
}

export default function SessionItem({ sessionId }: SessionItemProps) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const shareableLink = `${window.location.origin}/session/${sessionId}`;

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("id, created_at, completed, messages")
          .eq("id", sessionId)
          .single();

        if (error) throw new Error(error.message);
        setSession(data);
      } catch (err: any) {
        console.error("Error fetching session:", err);
        setError("Failed to load session. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

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
      console.log("Triggering toast.success for copy link");
      toast.success("Link copied to clipboard!");
      setIsShareModalOpen(false);
    } catch (err) {
      console.error("Error copying link:", err);
      console.log("Triggering toast.error for copy link failure");
      toast.error("Failed to copy link to clipboard.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center p-4 rounded-lg border bg-card">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <p>Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border bg-card text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 rounded-lg border bg-card text-muted-foreground">
        <p>Session not found.</p>
      </div>
    );
  }

  const firstUserMessage =
    session.messages?.find((msg: any) => msg.role === "user")?.content || "Image-based Problem";

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition">
        <Link href={`/session/${session.id}`} className="flex-1">
          <h2 className="text-lg font-semibold">{firstUserMessage}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(session.created_at).toLocaleString()}
          </p>
          <p className="text-sm mt-2">
            {session.completed ? "Completed" : "In Progress"}
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