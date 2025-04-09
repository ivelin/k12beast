// src/app/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import SessionItem from "./SessionItem";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  problem?: string;
  images?: string[] | null;
  created_at?: string;
  updated_at: string;
}

export default function HistoryPage() {
  const PAGE_SIZE = 20;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (pageToFetch: number, lastUpdatedAt?: string | null, lastId?: string | null) => {
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Construct the URL with cursor parameters if provided
      let url = `/api/history?page=${pageToFetch}&pageSize=${PAGE_SIZE}`;
      if (lastUpdatedAt && lastId) {
        url += `&lastUpdatedAt=${encodeURIComponent(lastUpdatedAt)}&lastId=${encodeURIComponent(lastId)}`;
      }

      console.log(`Fetching sessions with URL: ${url}`);

      const res = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await res.json();
      const newSessions: Session[] = data.sessions.map((session: Session) => ({
        ...session,
        updated_at: session.updated_at || session.created_at,
      }));

      // Debug: Log the fetched sessions and their IDs
      console.log(`Fetched sessions (page ${pageToFetch}):`, JSON.stringify(newSessions, null, 2));
      console.log(`Fetched session IDs (page ${pageToFetch}):`, newSessions.map(s => s.id));

      return newSessions;
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err.message || "Failed to fetch sessions");
      return [];
    }
  };

  // Fetch initial sessions on mount
  useEffect(() => {
    const loadInitialSessions = async () => {
      setLoading(true);
      const initialSessions = await fetchSessions(1);
      setSessions(initialSessions);
      setHasMore(initialSessions.length === PAGE_SIZE);
      setLoading(false);
    };
    loadInitialSessions();
  }, []);

  const loadMoreSessions = async () => {
    const nextPage = page + 1;

    // Get the last session's updated_at and id for cursor-based pagination
    const lastSession = sessions[sessions.length - 1];
    const lastUpdatedAt = lastSession ? lastSession.updated_at : null;
    const lastId = lastSession ? lastSession.id : null;

    console.log(`Loading more sessions for page ${nextPage}, lastUpdatedAt: ${lastUpdatedAt}, lastId: ${lastId}`);

    const newSessions = await fetchSessions(nextPage, lastUpdatedAt, lastId);

    // Debug: Log the current sessions and new sessions before merging
    console.log("Current session IDs before merge:", sessions.map(s => s.id));
    console.log("New session IDs to merge:", newSessions.map(s => s.id));

    // Filter out duplicates
    const existingIds = new Set(sessions.map(s => s.id));
    const uniqueNewSessions = newSessions.filter(s => !existingIds.has(s.id));

    // Debug: Log duplicates if any were filtered
    const duplicates = newSessions.filter(s => existingIds.has(s.id));
    if (duplicates.length > 0) {
      console.warn("Filtered out duplicate sessions:", duplicates);
    }

    // Use functional update to ensure we merge with the latest state
    setSessions(prevSessions => {
      const updatedSessions = [...prevSessions, ...uniqueNewSessions];
      // Debug: Log the updated sessions after merging
      console.log("Updated session IDs after merge:", updatedSessions.map(s => s.id));
      return updatedSessions;
    });

    setPage(nextPage);
    setHasMore(uniqueNewSessions.length > 0 && newSessions.length === PAGE_SIZE);
  };

  // Debug: Log the render state
  console.log("Rendering HistoryPage with sessions:", sessions);

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Session History</h1>
      {sessions.length === 0 ? (
        <p>No sessions found.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </ul>
      )}
      {hasMore && (
        <Button onClick={loadMoreSessions} className="mt-4">
          Load More
        </Button>
      )}
    </div>
  );
}