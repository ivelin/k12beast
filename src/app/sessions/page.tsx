"use client";

import { useEffect, useState } from "react";
import supabase from "../../supabase/browserClient";
import Link from "next/link";

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          setError("Please log in to view your sessions.");
          return;
        }

        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error("Failed to fetch sessions: " + error.message);
        }

        setSessions(data || []);
      } catch (err) {
        setError(err.message || "Failed to load sessions. Please try again.");
      }
    };

    fetchSessions();
  }, []);

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  };

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">K12Beast</h1>
          <div className="space-x-4">
            <Link href="/upload" className="hover:underline">Chat</Link>
            <Link href="/sessions" className="hover:underline">Sessions</Link>
          </div>
        </div>
      </nav>
      <div className="flex-1 max-w-4xl mx-auto p-4">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Your Sessions</h1>
        {sessions.length === 0 ? (
          <p className="text-gray-500">No sessions found. Start a new session to begin learning!</p>
        ) : (
          <ul className="space-y-4">
            {sessions.map((session) => {
              const summary = session.problem
                ? session.problem.length > 50
                  ? session.problem.substring(0, 50) + "..."
                  : session.problem
                : "Untitled Session";
              return (
                <li
                  key={session.id}
                  className="p-4 bg-white rounded-lg shadow-sm flex justify-between items-center"
                >
                  <div>
                    <Link href={`/session/${session.id}`} className="text-blue-500 hover:underline">
                      {summary}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {formatRelativeTime(session.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/session/${session.id}`}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}