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

  const fetchSessions = async (pageToFetch: number, controller: AbortController) => {
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

      const res = await fetch(`/api/history?page=${pageToFetch}&pageSize=${PAGE_SIZE}`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await res.json();
      const newSessions: Session[] = data.sessions.map((session: Session) => ({
        ...session,
        updated_at: session.updated_at || session.created_at,
      }));

      return newSessions;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching sessions:", err);
        setError(err.message || "Failed to fetch sessions");
      }
      return [];
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const loadInitialSessions = async () => {
      setLoading(true);
      const initialSessions = await fetchSessions(1, controller);
      setSessions(initialSessions);
      setHasMore(initialSessions.length === PAGE_SIZE);
      setLoading(false);
    };
    loadInitialSessions();
    return () => controller.abort();
  }, []);

  const loadMoreSessions = async () => {
    const controller = new AbortController();
    const nextPage = page + 1;
    const newSessions = await fetchSessions(nextPage, controller);

    const existingIds = new Set(sessions.map(s => s.id));
    const uniqueNewSessions = newSessions.filter(s => !existingIds.has(s.id));

    setSessions(prevSessions => [...prevSessions, ...uniqueNewSessions]);
    setPage(nextPage);
    setHasMore(uniqueNewSessions.length > 0 && newSessions.length === PAGE_SIZE);
  };

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