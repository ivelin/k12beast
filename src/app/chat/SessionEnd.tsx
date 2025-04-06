"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import useAppStore from "../../store";

export default function SessionEnd() {
  const { shareableLink, reset } = useAppStore();

  const handleShare = async () => {
    console.log("Checking Web Share API support...");
    if (navigator.share && shareableLink) {
      console.log("Web Share API supported, attempting to share...");
      try {
        await navigator.share({
          title: "K12Beast Session",
          text: "Check out my K12Beast session!",
          url: shareableLink,
        });
        console.log("Successfully shared via Web Share API");
        toast.success("Session shared successfully!");
      } catch (err) {
        console.error("Error sharing session via Web Share API:", err);
        handleClipboardFallback();
      }
    } else {
      console.log("Web Share API not supported or shareableLink missing, falling back to clipboard...");
      handleClipboardFallback();
    }
  };

  const handleClipboardFallback = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink).then(() => {
        toast.success("Shareable link copied to clipboard!");
      }).catch((err) => {
        console.error("Error copying to clipboard:", err);
        toast.error("Failed to copy link to clipboard.");
      });
    } else {
      console.error("No shareable link available to copy");
      toast.error("No shareable link available.");
    }
  };

  const handleStartNewSession = () => {
    reset();
    window.location.reload(); // Optionally reload to ensure a fresh state
  };

  return (
    <div className="mt-4 flex flex-col items-center">
      {shareableLink && (
        <>
          <button
            onClick={handleShare}
            className="mb-4 p-2 bg-green-500 text-white rounded hover:bg-green-700"
          >
            Share Session
          </button>
          <button
            onClick={handleStartNewSession}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          >
            Start New Session
          </button>
        </>
      )}
    </div>
  );
}