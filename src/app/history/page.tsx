// src/app/history/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import SessionItem from "./SessionItem";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("id") // Fetch only the id
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export default async function HistoryPage() {
  const sessions = await fetchSessions();

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-6">Session History</h1>
      {sessions.length === 0 ? (
        <p className="text-muted-foreground">
          No sessions found. Start a new session in the{" "}
          <Link href="/chat" className="text-primary underline">
            Chat
          </Link>{" "}
          page.
        </p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session: any) => (
            // key is for React list rendering, sessionId is for SessionItem to fetch data
            <SessionItem key={session.id} sessionId={session.id} />
          ))}
        </div>
      )}
    </div>
  );
}