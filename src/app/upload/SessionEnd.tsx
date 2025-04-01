"use client";

interface SessionEndProps {
  sessionId: string | null;
  setShareableLink: (value: string | null) => void;
  setError: (value: string | null) => void;
  shareableLink: string | null;
}

export default function SessionEnd({
  shareableLink,
}: SessionEndProps) {
  return (
    <div>
      {shareableLink && (
        <div>
          <h2>Session Ended</h2>
          <p>Share this link with a parent:</p>
          <a href={shareableLink}>{shareableLink}</a>
        </div>
      )}
    </div>
  );
}