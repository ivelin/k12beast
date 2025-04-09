// src/app/chat/page.tsx
import { redirect } from "next/navigation";

export default function ChatRedirect() {
  redirect("/chat/new");
}