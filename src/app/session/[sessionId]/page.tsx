// src/app/session/[sessionId]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { MessageList } from "@/components/ui/message-list";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchSession(sessionId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Session not found");
  return data;
}

export default async function SessionDetailPage({ params }: { params: { sessionId: string } }) {
  const session = await fetchSession(params.sessionId);

  // Use the messages array directly from the session
  const messages = session.messages || [];

  return (
    <div className="container flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-4">
        Session Details
        <Link href="/history" className="text-sm text-primary underline ml-4">
          Back to History
        </Link>
      </h1>
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MessageList messages={messages} showTimeStamps={false} />
          </motion.div>
        </AnimatePresence>
      </div>
      {session.notes && (
        <div className="mt-4 p-4 rounded-lg border bg-muted">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p>{session.notes}</p>
        </div>
      )}
    </div>
  );
}