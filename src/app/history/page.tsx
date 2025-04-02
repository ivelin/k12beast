import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
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
        <p className="text-muted-foreground">No sessions found. Start a new session in the <Link href="/chat" className="text-primary underline">Chat</Link> page.</p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session: any) => (
            <Link
              key={session.id}
              href={`/session/${session.id}`}
              className="block p-4 rounded-lg border bg-card hover:bg-muted transition"
            >
              <h2 className="text-lg font-semibold">
                {session.problem || "Image-based Problem"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {new Date(session.created_at).toLocaleString()}
              </p>
              <p className="text-sm mt-2">
                {session.completed ? "Completed" : "In Progress"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}