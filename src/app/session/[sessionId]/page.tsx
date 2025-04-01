// src/app/session/[sessionId]/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { sessionId } = await params; // Await params to access sessionId
        const response = await fetch(`/api/session/${sessionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch session: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.session) {
          throw new Error("Session not found");
        }

        setSession(data.session);
      } catch (err) {
        console.error("Error fetching session:", err);
        setError("Failed to load session history. Please try again.");
      }
    };

    fetchSession();
  }, [params]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Session History</h1>
      <p>Session ID: {session.id}</p>
      <p>Status: {session.completed ? "Completed" : "In Progress"}</p>
      {session.completed && <p>Completed At: {new Date(session.completed_at).toLocaleString()}</p>}
      <p>Lesson: {session.lesson || "N/A"}</p>
      <h2>Examples</h2>
      <pre>{JSON.stringify(session.examples, null, 2)}</pre>
      <h2>Quizzes</h2>
      <pre>{JSON.stringify(session.quizzes, null, 2)}</pre>
      <h2>Performance History</h2>
      <pre>{JSON.stringify(session.performanceHistory, null, 2)}</pre>
    </div>
  );
}