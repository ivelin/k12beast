// src/app/history/page.tsx
import supabase from "@/supabase/serverClient";
import SessionItem from "./SessionItem";

export default async function HistoryPage() {
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, lesson, examples, quizzes, performanceHistory, created_at, updated_at")
    .order("updated_at", { ascending: false, nullsLast: true });

  if (error) {
    console.error("Error fetching sessions:", error);
    return <div>Error loading history</div>;
  }

  // Debug: Log the sessions to verify updated_at
  console.log("Fetched sessions:", JSON.stringify(sessions, null, 2));

  // Ensure updated_at has a fallback to created_at
  const sessionsWithFallback = sessions.map((session) => ({
    ...session,
    updated_at: session.updated_at || session.created_at,
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Session History</h1>
      {sessionsWithFallback.length === 0 ? (
        <p>No sessions found.</p>
      ) : (
        <ul className="space-y-2">
          {sessionsWithFallback.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </ul>
      )}
    </div>
  );
}