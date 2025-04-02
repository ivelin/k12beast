"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chat, ChatContainer, ChatForm, ChatMessages } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import { MessageInput } from "@/components/ui/message-input";
import useAppStore from "../../store";

export default function ChatPage() {
  const {
    problem,
    submittedProblem,
    imageUrls,
    lesson,
    examples,
    quiz,
    step,
    shareableLink,
    sessionEnded,
    reset,
    setStep,
    setSessionId,
    setSubmittedProblem,
    setImages,
    setImageUrls,
    setLesson,
    setExamples,
    setQuiz,
    setShareableLink,
    setError,
    setLoading,
    setHasSubmittedProblem,
    setSessionEnded,
    hasSubmittedProblem,    
  } = useAppStore();

  const [messages, setMessages] = useState<any[]>([]);

  // Handle session ID from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("sessionId");
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      setStep("quizzes");
    }
  }, [setSessionId, setStep]);

  // Add user-submitted problem to messages
  useEffect(() => {
    if (submittedProblem && hasSubmittedProblem) {
      const problemContent = {
        role: "user",
        content: submittedProblem,
        images: imageUrls,
      };
      setMessages((prev) => {
        const hasProblemMessage = prev.some((msg) => msg.content === submittedProblem);
        if (!hasProblemMessage) {
          return [...prev, problemContent];
        }
        return prev;
      });
    }
  }, [submittedProblem, imageUrls, hasSubmittedProblem]);

  // Add lesson to messages
  useEffect(() => {
    if (lesson) {
      setMessages((prev) => {
        const hasLessonMessage = prev.some((msg) => msg.content === lesson);
        if (!hasLessonMessage) {
          return [...prev, { role: "assistant", content: lesson }];
        }
        return prev;
      });
    }
  }, [lesson]);

  // Add examples to messages
  useEffect(() => {
    if (examples) {
      const exampleContent = {
        role: "assistant",
        content: `**Example Problem:** ${examples.problem}\n\n${examples.solution
          .map((step) => `**${step.title}**\n${step.content}`)
          .join("\n\n")}`,
      };
      setMessages((prev) => [...prev, exampleContent]);
    }
  }, [examples]);

  // Reset session
  const handleStartNewSession = () => {
    reset();
    setMessages([]);
  };

  // Handle message submission
  const handleSubmit = async (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => {
    if (event?.preventDefault) event.preventDefault();

    const message = problem;
    const files = options?.experimental_attachments
      ? Array.from(options.experimental_attachments)
      : [];

    if (!message && files.length === 0) return;

    setLoading(true);
    try {
      // Handle file uploads if present
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to upload images");
        }

        const newImageUrls = data.files.map((file: any) => file.url);
        setImages(files);
        setImageUrls(newImageUrls);
        setSubmittedProblem(message || "Image-based problem");
        setHasSubmittedProblem(true);
      } else {
        // Handle text-only submission
        setSubmittedProblem(message);
        setImageUrls([]);
        setHasSubmittedProblem(true);
      }

      // Clear the input
      setProblem("");
      setImages([]);
    } catch (err) {
      setError(err.message || "Failed to submit problem. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <nav className="p-4 border-b border-border">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-bold">K12Beast</h1>
          <div className="space-x-4">
            <Link href="/chat" className="text-foreground hover:text-primary">
              Chat
            </Link>
            <Link href="/history" className="text-foreground hover:text-primary">
              History
            </Link>
          </div>
        </div>
      </nav>
      <div className="flex-1 flex flex-col max-w-3xl mx-auto p-4 sm:p-6">
        <ChatContainer className="flex-1">
          <ChatMessages messages={messages}>
            {messages.length === 0 && !sessionEnded ? (
              <div className="text-center text-muted-foreground mt-8">
                Enter a problem below to start a new session
              </div>
            ) : (
              <MessageList
                messages={messages}
                isTyping={false}
                messageOptions={() => ({ actions: null })}
              />
            )}
          </ChatMessages>
          <ChatForm
            className="mt-auto"
            isPending={useAppStore.getState().loading}
            handleSubmit={handleSubmit}
          >
            {({ files, setFiles }) => (
              <MessageInput
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Enter a problem or attach an image"
                allowAttachments
                files={files}
                setFiles={setFiles}
                isGenerating={useAppStore.getState().loading}
              />
            )}
          </ChatForm>
        </ChatContainer>
      </div>
    </div>
  );
}