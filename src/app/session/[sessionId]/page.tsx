// src/app/session/[sessionId]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ChatMessages } from "@/components/ui/chat"
import { MessageList } from "@/components/ui/message-list"
import { Button } from "@/components/ui/button"

interface Message {
  role: "user" | "assistant"
  content: string
  renderAs?: "markdown" | "html"
  experimental_attachments?: { name: string; url: string }[]
}

interface Session {
  problem: string | null
  images: string[] | null
  lesson: string
  messages: Message[]
}

export default function SessionDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const params = use(paramsPromise)
  const { sessionId } = params

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSession() {
      try {
        const token = document.cookie
          .split("; ")
          .find(row => row.startsWith("supabase-auth-token="))
          ?.split("=")[1]

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const res = await fetch(`/api/session/${sessionId}`, {
          method: "GET",
          headers,
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to fetch session")
        }

        const data = await res.json()
        const session: Session = data.session

        // Prepare messages array with problem and images at the top
        const updatedMessages: Message[] = [];
        
        // Add the original problem and images as a user message if they exist
        if (session.problem || (session.images && session.images.length > 0)) {
          updatedMessages.push({
            role: "user",
            content: session.problem || "Image-based problem",
            renderAs: "markdown",
            experimental_attachments: session.images?.map((url, index) => ({
              name: `Image ${index + 1}`,
              url,
            })),
          });
        }

        // Add the lesson as an assistant message
        updatedMessages.push({
          role: "assistant",
          content: session.lesson || "No lesson provided",
          renderAs: "html",
        });

        // Append the rest of the session messages
        updatedMessages.push(...(session.messages || []));

        setMessages(updatedMessages);
      } catch (err) {
        setError(err.message || "Error loading session")
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (error) {
    return (
      <div className="container">
        <h1 className="text-2xl font-bold mb-6">Error</h1>
        <p>{error}</p>
        <Link href="/history">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <Link href="/history">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Session Details</h1>
      <ChatMessages className="flex flex-col items-start">
        <MessageList messages={messages} />
      </ChatMessages>
    </div>
  )
}