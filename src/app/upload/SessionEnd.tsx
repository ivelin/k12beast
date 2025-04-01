// src/app/upload/SessionEnd.tsx
"use client";

import useAppStore from "../../store";

export default function SessionEnd() {
  const { shareableLink } = useAppStore();

  return (
    <div>
      {shareableLink && (
        <div className="mt-4">
          <h2 className="text-xl mb-2">Session Ended</h2>
          <p>Share this link with a parent:</p>
          <a href={shareableLink} className="text-blue-500 underline">{shareableLink}</a>
        </div>
      )}
    </div>
  );
}