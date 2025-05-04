// File path: src/components/ui/chat-message.tsx
// Renders a chat message with support for markdown, HTML, MathML, static SVG charts using Plotly,
// and flowcharts using React Flow for robust rendering.
// Updated to use the extracted ReactFlowDiagram component for modularity.
// Improved chart layout to stack diagrams vertically and match the width of the text content.
// Uses new title field from chart config and renders titles in a figcaption within a figure element.
// Ensured charts fully utilize the message area width with updated CSS.
// Fixed typo: experimental_assignments -> experimental_attachments.
// Extracted Plotly chart rendering into PlotlyChart component.
// Updated chart container to use full width on mobile for better readability.
// Updated message bubble width to maximize screen usage on mobile and prevent horizontal scrolling.
// Reintroduced sm:max-w-[70%] for larger screens to maintain visual cues for message roles.
// Clarified Tailwind breakpoint logic with comments.
// Restored role-based left and right alignment in the top-level return statement.
// Fixed syntax error in ReasoningBlock component by correcting className attribute.

"use client";

import React, { useEffect, useState, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { Ban, ChevronRight, Code2, Loader2, Terminal } from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FilePreview } from "@/components/ui/file-preview";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { typesetMathJax } from "@/utils/mathjax-config";
import { Message, ChartConfig } from "@/store/types";
import ReactFlowDiagram from "./react-flow-diagram";
import PlotlyChart from "./plotly-chart";

const chatBubbleVariants = cva(
  // Tailwind breakpoints are mobile-first:
  // - max-w-[95%] applies by default (all screens, including mobile <640px)
  // - sm:max-w-[70%] applies on sm and larger (≥640px), providing visual distinction on larger screens
  "group/message relative break-words rounded-lg p-3 text-sm max-w-[95%] sm:max-w-[70%] mx-auto",
  {
    variants: {
      isUser: { true: "bg-primary text-primary-foreground", false: "bg-muted text-foreground" },
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

interface Attachment { name?: string; contentType?: string; url: string; }
interface PartialToolCall { state: "partial-call"; toolName: string; }
interface ToolCall { state: "call"; toolName: string; }
interface ToolResult { state: "result"; toolName: string; result: { __cancelled?: boolean; [key: string]: unknown }; }
type ToolInvocation = PartialToolCall | ToolCall | ToolResult;
interface ReasoningPart { type: "reasoning"; reasoning: string; }
interface ToolInvocationPart { type: "tool-invocation"; toolInvocation: ToolInvocation; }
interface TextPart { type: "text"; text: string; }
interface SourcePart { type: "source"; }
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
  charts?: ChartConfig[];
}

export interface ChatMessageProps extends MessageElement {
  showTimeStamp?: boolean;
  animation?: Animation;
  actions?: React.ReactNode;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role, content, createdAt, showTimeStamp = false, animation = "scale", actions,
  experimental_attachments, toolInvocations, parts, renderAs = "markdown", charts = [],
}) => {
  const [domPurify, setDomPurify] = useState<typeof DOMPurify | null>(null);
  const [isDOMPurifyLoaded, setIsDOMPurifyLoaded] = useState(false);
  const [processedContent, setProcessedContent] = useState<string>(content);
  const [processedParts, setProcessedParts] = useState<MessagePart[] | undefined>(parts);
  const messageRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import("dompurify").then((module) => {
      setDomPurify(() => module.default);
      setIsDOMPurifyLoaded(true);
    });
  }, []);

  // Debug container widths
  useEffect(() => {
    if (messageRef.current && chartContainerRef.current) {
      console.log(`Message container width: ${messageRef.current.getBoundingClientRect().width}`);
      console.log(`Chart container width: ${chartContainerRef.current.getBoundingClientRect().width}`);
    }
  }, [charts]);

  // Clean chart placeholders and references from content
  const cleanChartContent = (text: string): string => {
    return text
      .replace(/<div\s+id="[^"]*"[^>]*><\/div>/gi, "") // Remove Plotly placeholders
      .replace(/Chart\s+(\w+)/gi, "Chart $1 below");
  };

  // Process content and parts
  useEffect(() => {
    if (renderAs !== "html" || !isDOMPurifyLoaded || !messageRef.current) return;

    const processContent = async () => {
      try {
        let updatedContent = content || "";
        let updatedParts = parts ? [...parts] : undefined;

        const hasTextParts = parts?.some(part => part.type === "text");
        if (charts.length > 0 || hasTextParts) {
          updatedContent = cleanChartContent(updatedContent);
          setProcessedContent(updatedContent);

          if (hasTextParts) {
            updatedParts = parts!.map((part) => {
              if (part.type !== "text") return part;
              return { ...part, text: cleanChartContent(part.text || "") };
            });
            setProcessedParts(updatedParts);
          }
        }

        await typesetMathJax();
      } catch (error) {
        console.error("Failed to process content or typeset MathML:", error);
        setProcessedContent(content || "");
        setProcessedParts(parts ? [...parts] : undefined);
      }
    };

    processContent();
  }, [content, parts, renderAs, isDOMPurifyLoaded, charts]);

  const isUser = role === "user";
  const formattedTime = createdAt?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const sanitizeContent = (html: string) => {
    if (!domPurify) {
      console.error("DOMPurify not loaded. Falling back to plain text.");
      return html;
    }
    return domPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p", "strong", "ul", "li", "br", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "a", "svg", "g", "path", "text", "rect", "line",
        "table", "tr", "td", "th", "tbody", "thead", "tfoot", "caption", "sup", "sub", "b", "math", "mi", "mo", "mn", "mrow", "msup", "mfrac", "mtext",
        "figure", "figcaption"
      ],
      ALLOWED_ATTR: [
        "class", "style", "href", "src", "alt", "id", "width", "height", "aria-label", "aria-labelledby", "fill", "stroke", "stroke-width", "transform", "x", "y",
        "dx", "dy", "font-size", "text-anchor", "font-family", "font-weight", "d", "xmlns", "display", "mathvariant",
        "data-mermaid-id", "data-processed"
      ],
    });
  };

  // Render message content based on role and parts
  const renderMessageContent = () => {
    if (isUser) {
      return (
        <>
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
        </>
      );
    }

    if (processedParts && processedParts.length > 0) {
      return processedParts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")} key={`text-${index}`}>
              <div className={cn(chatBubbleVariants({ isUser, animation }))}>
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
            </div>
          );
        } else if (part.type === "reasoning") {
          return <ReasoningBlock key={`reasoning-${index}`} part={part} />;
        } else if (part.type === "tool-invocation") {
          return <ToolCall key={`tool-${index}`} toolInvocations={[part.toolInvocation]} />;
        }
        return null;
      });
    }

    if (toolInvocations && toolInvocations.length > 0) {
      return <ToolCall toolInvocations={toolInvocations} />;
    }

    return (
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
        <div className={cn(chatBubbleVariants({ isUser, animation }))} id={role}>
          {renderAs === "html" ? (
            isDOMPurifyLoaded ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeContent(processedContent) }} />
            ) : (
              <div>Loading HTML content...</div>
            )
          ) : (
            <MarkdownRenderer>{processedContent}</MarkdownRenderer>
          )}
          {actions && (
            <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
              {actions}
            </div>
          )}
        </div>
        {charts.length > 0 && (
          <div ref={chartContainerRef} className="mt-2 space-y-4 w-full overflow-x-hidden">
            {charts.map((chart) => (
              <figure key={chart.id} id={`figure-${chart.id}`} className="w-full">
                {chart.title && (
                  <figcaption id={`caption-${chart.id}`} className="text-center text-lg font-bold text-foreground mb-2">
                    {chart.title}
                  </figcaption>
                )}
                {chart.format === "reactflow" ? (
                  <ReactFlowDiagram chartConfig={chart.config} id={chart.id} />
                ) : chart.format === "plotly" ? (
                  <PlotlyChart chartConfig={chart} id={chart.id} containerWidth={messageRef.current?.getBoundingClientRect().width || 300} />
                ) : (
                  <p className="text-red-500">Unsupported chart format: {chart.id}</p>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={messageRef} className={cn("w-full px-2 flex flex-col", isUser ? "items-end" : "items-start")}>
      {/* Restored role-based alignment for the entire message block */}
      {renderMessageContent()}
      {showTimeStamp && createdAt && (
        <time dateTime={createdAt.toISOString()} className={cn("mt-1 block px-1 text-xs opacity-50", animation !== "none" && "duration-500 animate-in fade-in-0")}>
          {formattedTime}
        </time>
      )}
    </div>
  );
};

const ReasoningBlock = ({ part }: { part: ReasoningPart }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // Apply same width constraints as message bubbles for consistency
    <div className="mb-2 flex flex-col items-start max-w-[95%] sm:max-w-[70%] mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group w-full overflow-hidden rounded-lg border bg-muted/50">
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
            variants={{ open: { height: "auto", opacity: 1 }, closed: { height: 0, opacity: 0 } }}
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
        const isCancelled = invocation.state === "result" && invocation.result.__cancelled === true;
        if (isCancelled) {
          return (
            <div key={index} className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <Ban className="h-4 w-4" />
              <span>Cancelled <span className="font-mono">{`\`${invocation.toolName}\``}</span></span>
            </div>
          );
        }
        switch (invocation.state) {
          case "partial-call":
          case "call":
            return (
              <div key={index} className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <Terminal className="h-4 w-4" />
                <span>Calling <span className="font-mono">{`\`${invocation.toolName}\``}</span>...</span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            );
          case "result":
            return (
              <div key={index} className="flex flex-col gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  <span>Result from <span className="font-mono">{`\`${invocation.toolName}\``}</span></span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-foreground">{JSON.stringify(invocation.result, null, 2)}</pre>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export const MemoizedChatMessage = React.memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.role === nextProps.role &&
    prevProps.renderAs === nextProps.renderAs &&
    prevProps.charts === nextProps.charts &&
    prevProps.createdAt?.getTime() === nextProps.createdAt?.getTime() &&
    prevProps.experimental_attachments === nextProps.experimental_attachments &&
    prevProps.toolInvocations === nextProps.toolInvocations &&
    prevProps.parts === nextProps.parts &&
    prevProps.actions === nextProps.actions &&
    prevProps.showTimeStamp === nextProps.showTimeStamp &&
    prevProps.animation === nextProps.animation
  );
});