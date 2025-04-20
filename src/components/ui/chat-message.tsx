/* src/components/ui/chat-message.tsx
 * Renders a chat message with support for markdown, HTML, MathJax formulas (math/chemical),
 * Chart.js charts, tool invocations, attachments, and reasoning blocks.
 */

"use client";

import React, { useEffect, useRef, useState } from "react"; // Added useRef for chart refs
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { Ban, ChevronRight, Code2, Loader2, Terminal } from "lucide-react";
import DOMPurify from "dompurify";
import Chart from "chart.js/auto"; // Added Chart.js import
import { cn } from "@/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FilePreview } from "@/components/ui/file-preview";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { initializeMathJax, typesetMathJax } from "@/utils/mathjax-config"; // Added MathJax imports
import { Message, ChartConfig } from "@/store/types";

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg p-3 text-sm sm:max-w-[70%]",
  {
    variants: {
      isUser: {
        true: "bg-primary text-primary-foreground",
        false: "bg-muted text-foreground",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      { isUser: true, animation: "slide", class: "slide-in-from-right" },
      { isUser: false, animation: "slide", class: "slide-in-from-left" },
      { isUser: true, animation: "scale", class: "origin-bottom-right" },
      { isUser: false, animation: "scale", class: "origin-bottom-left" },
    ],
  }
);

type Animation = VariantProps<typeof chatBubbleVariants>["animation"];

interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
}

interface PartialToolCall {
  state: "partial-call";
  toolName: string;
}

interface ToolCall {
  state: "call";
  toolName: string;
}

interface ToolResult {
  state: "result";
  toolName: string;
  result: { __cancelled?: boolean; [key: string]: unknown };
}

type ToolInvocation = PartialToolCall | ToolCall | ToolResult;

interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
}

interface ToolInvocationPart {
  type: "tool-invocation";
  toolInvocation: ToolInvocation;
}

interface TextPart {
  type: "text";
  text: string;
}

interface SourcePart {
  type: "source";
}

type MessagePart = TextPart | ReasoningPart | ToolInvocationPart | SourcePart;

export interface MessageElement extends Message {
  id?: string;
  role: "user" | "assistant" | (string & {});
  content: string;
  createdAt?: Date;
  experimental_attachments?: Attachment[];
  toolInvocations?: ToolInvocation[];
  parts?: MessagePart[];
  renderAs?: "markdown" | "html";
  charts?: ChartConfig[]; // Added to support Chart.js configurations
}

export interface ChatMessageProps extends MessageElement {
  showTimeStamp?: boolean;
  animation?: Animation;
  actions?: React.ReactNode;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  createdAt,
  showTimeStamp = false,
  animation = "scale",
  actions,
  experimental_attachments,
  toolInvocations,
  parts,
  renderAs = "markdown",
  charts = [], // Added default empty array for charts
}) => {
  const [domPurify, setDomPurify] = useState<typeof DOMPurify | null>(null);
  const [isDOMPurifyLoaded, setIsDOMPurifyLoaded] = useState(false);
  const chartRefs = useRef<Map<string, Chart>>(new Map()); // Added to track Chart.js instances
  const containerRef = useRef<HTMLDivElement>(null); // Added to reference the container for chart rendering

  // Load DOMPurify and initialize MathJax
  useEffect(() => {
    import("dompurify").then((module) => {
      setDomPurify(() => module.default);
      setIsDOMPurifyLoaded(true);
    });
    initializeMathJax(); // Initialize MathJax on mount
  }, []);

  // Typeset MathJax and initialize charts after content updates
  useEffect(() => {
    if (renderAs === "html" && containerRef.current && isDOMPurifyLoaded) {
      // Typeset MathJax for LaTeX formulas
      typesetMathJax();

      // Initialize Chart.js charts using configurations from the charts field
      if (charts.length > 0) {
        const canvases = containerRef.current.querySelectorAll("canvas");
        canvases.forEach((canvas) => {
          const id = canvas.id;
          if (!id || chartRefs.current.has(id)) return;

          const chartConfig = charts.find((chart) => chart.id === id);
          if (chartConfig) {
            try {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const chartInstance = new Chart(ctx, chartConfig.config);
                chartRefs.current.set(id, chartInstance);
              }
            } catch (error) {
              console.error(`Failed to initialize Chart.js for canvas ${id}:`, error);
              console.debug(`Chart config:`, chartConfig.config);
            }
          } else {
            console.warn(`No Chart.js config found for canvas ${id}`);
          }
        });
      }
    }

    // Cleanup charts on unmount
    return () => {
      chartRefs.current.forEach((chart) => chart.destroy());
      chartRefs.current.clear();
    };
  }, [content, renderAs, isDOMPurifyLoaded, charts]); // Added charts as dependency

  const isUser = role === "user";

  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sanitizeContent = (html: string) => {
    if (!domPurify) {
      console.error("DOMPurify not loaded. Falling back to plain text.");
      return html;
    }
    return domPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p", "strong", "ul", "li", "br", "span", "div", "h1", "h2", "h3",
        "h4", "h5", "h6", "a", "img", "table", "tr", "td", "th", "tbody",
        "thead", "tfoot", "caption", "sup", "sub", "canvas", "b",
      ],
      ALLOWED_ATTR: [
        "class", "style", "href", "src", "alt", "id", "width", "height",
        "aria-label", "data-math-type",
      ],
    });
  };

  if (isUser) {
    return (
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
        {experimental_attachments && (
          <div className="mb-1 flex flex-wrap gap-2">
            {experimental_attachments.map((attachment, index) => (
              <FilePreview key={index} url={attachment.url} name={attachment.name} />
            ))}
          </div>
        )}
        <div className={cn(chatBubbleVariants({ isUser, animation }))}>
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </div>
        {showTimeStamp && createdAt && (
          <time
            dateTime={createdAt.toISOString()}
            className={cn(
              "mt-1 block px-1 text-xs opacity-50",
              animation !== "none" && "duration-500 animate-in fade-in-0"
            )}
          >
            {formattedTime}
          </time>
        )}
      </div>
    );
  }

  if (parts && parts.length > 0) {
    return (
      <>
        {parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div
                className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
                key={`text-${index}`}
              >
                <div
                  ref={containerRef} // Added ref for chart rendering
                  className={cn(chatBubbleVariants({ isUser, animation }))}
                >
                  {renderAs === "html" ? (
                    isDOMPurifyLoaded ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeContent(part.text) }} />
                    ) : (
                      <div>Loading HTML content...</div>
                    )
                  ) : (
                    <MarkdownRenderer>{part.text}</MarkdownRenderer>
                  )}
                  {actions && (
                    <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
                      {actions}
                    </div>
                  )}
                </div>
                {showTimeStamp && createdAt && (
                  <time
                    dateTime={createdAt.toISOString()}
                    className={cn(
                      "mt-1 block px-1 text-xs opacity-50",
                      animation !== "none" && "duration-500 animate-in fade-in-0"
                    )}
                  >
                    {formattedTime}
                  </time>
                )}
              </div>
            );
          } else if (part.type === "reasoning") {
            return <ReasoningBlock key={`reasoning-${index}`} part={part} />;
          } else if (part.type === "tool-invocation") {
            return (
              <ToolCall
                key={`tool-${index}`}
                toolInvocations={[part.toolInvocation]}
              />
            );
          }
          return null;
        })}
      </>
    );
  }

  if (toolInvocations && toolInvocations.length > 0) {
    return <ToolCall toolInvocations={toolInvocations} />;
  }

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        ref={containerRef} // Added ref for chart rendering
        className={cn(chatBubbleVariants({ isUser, animation }))}
      >
        {renderAs === "html" ? (
          isDOMPurifyLoaded ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeContent(content) }} />
          ) : (
            <div>Loading HTML content...</div>
          )
        ) : (
          <MarkdownRenderer>{content}</MarkdownRenderer>
        )}
        {actions && (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        )}
      </div>
      {showTimeStamp && createdAt && (
        <time
          dateTime={createdAt.toISOString()}
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0"
          )}
        >
          {formattedTime}
        </time>
      )}
    </div>
  );
};

const ReasoningBlock = ({ part }: { part: ReasoningPart }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-2 flex flex-col items-start sm:max-w-[70%]">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group w-full overflow-hidden rounded-lg border bg-muted/50"
      >
        <div className="flex items-center p-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              <span>Thinking</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent forceMount>
          <motion.div
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="border-t"
          >
            <div className="p-2">
              <div className="whitespace-pre-wrap text-xs">{part.reasoning}</div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

function ToolCall({ toolInvocations }: Pick<ChatMessageProps, "toolInvocations">) {
  if (!toolInvocations?.length) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      {toolInvocations.map((invocation, index) => {
        const isCancelled =
          invocation.state === "result" && invocation.result.__cancelled === true;

        if (isCancelled) {
          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            >
              <Ban className="h-4 w-4" />
              <span>
                Cancelled{" "}
                <span className="font-mono">{`\`${invocation.toolName}\``}</span>
              </span>
            </div>
          );
        }

        switch (invocation.state) {
          case "partial-call":
          case "call":
            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              >
                <Terminal className="h-4 w-4" />
                <span>
                  Calling{" "}
                  <span className="font-mono">{`\`${invocation.toolName}\``}</span>...
                </span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            );
          case "result":
            return (
              <div
                key={index}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  <span>
                    Result from{" "}
                    <span className="font-mono">{`\`${invocation.toolName}\``}</span>
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-foreground">
                  {JSON.stringify(invocation.result, null, 2)}
                </pre>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}