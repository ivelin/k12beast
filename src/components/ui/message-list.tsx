// File path: src/components/ui/message-list.tsx
import React from "react";
import { cn } from "@/utils";
import {
  MemoizedChatMessage as ChatMessage,
  type ChatMessageProps,
  type MessageElement,
} from "@/components/ui/chat-message";
import { TypingIndicator } from "@/components/ui/typing-indicator";

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof MessageElement>;

interface MessageListProps {
  messages: MessageElement[];
  showTimeStamps?: boolean;
  isTyping?: boolean;
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: MessageElement) => AdditionalMessageOptions);
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
}: MessageListProps) {
  return (
    <div
      className={cn(
        "space-y-4 overflow-y-auto",
        "scrollbar-thin scrollbar-track-background scrollbar-thumb-muted"
      )}
    >
      {messages.map((message, index) => {
        const additionalOptions =
          typeof messageOptions === "function"
            ? messageOptions(message)
            : messageOptions;

        const messageKey = message.id ?? `message-${index}-${message.createdAt?.toISOString() ?? index}`;

        return (
          <div key={messageKey}>
            <ChatMessage
              {...message}
              showTimeStamp={showTimeStamps}
              animation={index === messages.length - 1 ? "scale" : "none"}
              actions={additionalOptions?.actions}
              {...additionalOptions}
            />
          </div>
        );
      })}
      {isTyping && <TypingIndicator />}
    </div>
  );
}