// File path: src/components/ui/chat-message.tsx
// Renders a chat message with support for markdown, HTML, MathML, and static SVG charts using Plotly.

"use client";

import React, { useEffect, useState, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { Ban, ChevronRight, Code2, Loader2, Terminal } from "lucide-react";
import DOMPurify from "dompurify";
import Plotly from "plotly.js-dist";
import { cn } from "@/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FilePreview } from "@/components/ui/file-preview";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { initializeMathJax, typesetMathJax } from "@/utils/mathjax-config";
import { Message, ChartConfig } from "@/store/types";

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg p-3 text-sm sm:max-w-[70%]",
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

export interface ChartImage { id: string; svgContent: string; title: string; }

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
  const [chartImages, setChartImages] = useState<ChartImage[]>([]);

  useEffect(() => {
    import("dompurify").then((module) => {
      setDomPurify(() => module.default);
      setIsDOMPurifyLoaded(true);
    });
    initializeMathJax();
  }, []);

  // Validate Plotly configuration
  const validatePlotlyConfig = (config: any): boolean => {
    if (!config?.data || !config.layout || !Array.isArray(config.data) || config.data.length === 0) return false;
    for (const trace of config.data) {
      if (!trace?.x || !trace.y || !trace.type || !Array.isArray(trace.x) || !Array.isArray(trace.y) || trace.x.length !== trace.y.length || trace.x.length === 0) return false;
    }
    return true;
  };

  // Map legacy Chart.js config to Plotly config
  const mapChartJsToPlotlyConfig = (chartConfig: any) => {
    const chartJsConfig = chartConfig.config;
    const plotlyType = chartJsConfig.type === "line" ? "scatter" : chartJsConfig.type === "bar" ? "bar" : "scatter";
    const data = chartJsConfig.data.datasets.map((dataset: any) => ({
      x: chartJsConfig.data.labels,
      y: dataset.data,
      type: plotlyType,
      mode: chartJsConfig.type === "line" ? "lines" : undefined,
      name: dataset.label || "",
      line: dataset.borderColor ? { color: dataset.borderColor } : undefined,
      marker: dataset.borderColor ? { color: dataset.borderColor } : undefined,
      fill: dataset.fill ? "tozeroy" : "none",
    }));
    const layout: any = {
      margin: { t: 40, b: 40, l: 40, r: 40 },
      title: { text: chartJsConfig.options?.plugins?.title?.text || chartConfig.id, font: { size: 16 }, x: 0.5, xanchor: "center" },
      xaxis: { title: chartJsConfig.options?.scales?.x?.title?.text || "" },
      yaxis: { title: chartJsConfig.options?.scales?.y?.title?.text || "" },
      showlegend: true,
    };
    return { data, layout };
  };

  // Render chart to SVG using Plotly
  const renderChartToSVG = (chartConfig: ChartConfig): Promise<ChartImage> => {
    return new Promise(async (resolve) => {
      try {
        let plotlyData = chartConfig.config.data;
        let plotlyLayout = chartConfig.config.layout;
        if (!validatePlotlyConfig(chartConfig.config)) {
          console.warn(`Chart ${chartConfig.id} appears to be in Chart.js format. Mapping to Plotly.`);
          const mappedConfig = mapChartJsToPlotlyConfig(chartConfig);
          plotlyData = mappedConfig.data;
          plotlyLayout = mappedConfig.layout;
        }

        const tempDiv = document.createElement("div");
        document.body.appendChild(tempDiv);
        await Plotly.newPlot(tempDiv, plotlyData, plotlyLayout, { staticPlot: true });
        const svgContent = await Plotly.toImage(tempDiv, { format: "svg", width: 400, height: 300 });
        Plotly.purge(tempDiv);
        document.body.removeChild(tempDiv);

        let svgString = svgContent.startsWith("data:image/svg+xml;base64,") ? atob(svgContent.replace("data:image/svg+xml;base64,", ""))
          : svgContent.startsWith("data:image/svg+xml,") ? decodeURIComponent(svgContent.replace("data:image/svg+xml,", "")) : svgContent;
        svgString = svgString.replace(/<\?xml[^>]*\>/g, "").trim();
        if (!svgString.startsWith("<svg")) throw new Error("Invalid SVG content");

        const title = plotlyLayout?.title?.text || chartConfig.id;
        resolve({ id: chartConfig.id, svgContent: svgString, title });
      } catch (error) {
        console.error(`Failed to render chart ${chartConfig.id}:`, error);
        const title = chartConfig.config.layout?.title?.text || chartConfig.id;
        resolve({ id: chartConfig.id, svgContent: `<svg width="400" height="300"><text x="10" y="20" font-size="16">Failed to render chart: ${title}</text></svg>`, title });
      }
    });
  };

  useEffect(() => {
    if (renderAs !== "html" || !isDOMPurifyLoaded) return;

    const processContent = async () => {
      try {
        let updatedContent = content || "";
        let updatedParts = parts ? [...parts] : undefined;

        let generatedChartImages: ChartImage[] = [];
        if (charts.length > 0) {
          console.log("Processing charts:", JSON.stringify(charts, null, 2));
          generatedChartImages = await Promise.all(charts.map(renderChartToSVG));
          setChartImages(generatedChartImages);
        }

        updatedContent = updatedContent.replace(/<div\s+id="[^"]*"[^>]*><\/div>/gi, "").replace(/Chart\s+(\w+)/gi, "Chart $1 below");
        setProcessedContent(updatedContent);

        if (parts) {
          updatedParts = parts.map((part) => {
            if (part.type !== "text") return part;
            let partContent = part.text || "";
            partContent = partContent.replace(/<div\s+id="[^"]*"[^>]*><\/div>/gi, "").replace(/Chart\s+(\w+)/gi, "Chart $1 below");
            return { ...part, text: partContent };
          });
          setProcessedParts(updatedParts);
        }

        await typesetMathJax();
      } catch (error) {
        console.error("Failed to process charts or typeset MathML:", error);
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
      ALLOWED_TAGS: ["p", "strong", "ul", "li", "br", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "a", "svg", "g", "path", "text", "rect", "line",
        "table", "tr", "td", "th", "tbody", "thead", "tfoot", "caption", "sup", "sub", "b", "math", "mi", "mo", "mn", "mrow", "msup", "mfrac", "mtext"],
      ALLOWED_ATTR: ["class", "style", "href", "src", "alt", "id", "width", "height", "aria-label", "fill", "stroke", "stroke-width", "transform", "x", "y",
        "dx", "dy", "font-size", "text-anchor", "font-family", "font-weight", "d", "xmlns", "display", "mathvariant"],
    });
  };

  const SVGRenderer: React.FC<{ svgContent: string }> = ({ svgContent }) => {
    const svgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (svgRef.current) {
        try {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
          const parseError = svgDoc.querySelector("parsererror");
          if (parseError) {
            console.error("SVG parsing error:", parseError.textContent);
            svgRef.current.innerHTML = svgContent;
            return;
          }
          const svgElement = svgDoc.documentElement;
          if (!svgElement.hasAttribute("xmlns")) svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svgElement.removeAttribute("width");
          svgElement.removeAttribute("height");
          svgElement.style.width = "100%";
          svgElement.style.height = "auto";
          svgElement.style.maxWidth = "100%";
          svgElement.style.display = "block";
          svgRef.current.innerHTML = "";
          svgRef.current.appendChild(svgElement);
        } catch (error) {
          console.error("Failed to parse SVG content:", error);
          svgRef.current.innerHTML = svgContent;
        }
      }
    }, [svgContent]);

    return <div ref={svgRef} className="w-full max-w-full" />;
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
          <time dateTime={createdAt.toISOString()} className={cn("mt-1 block px-1 text-xs opacity-50", animation !== "none" && "duration-500 animate-in fade-in-0")}>
            {formattedTime}
          </time>
        )}
      </div>
    );
  }

  if (processedParts && processedParts.length > 0) {
    return (
      <>
        {processedParts.map((part, index) => {
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
                  {chartImages.length > 0 && index === processedParts.length - 1 && (
                    <div className="mt-2 space-y-2">
                      {chartImages.map((chart) => (
                        <div key={chart.id}>
                          <p className="text-sm font-semibold">{chart.title}</p>
                          <SVGRenderer svgContent={chart.svgContent} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {showTimeStamp && createdAt && (
                  <time dateTime={createdAt.toISOString()} className={cn("mt-1 block px-1 text-xs opacity-50", animation !== "none" && "duration-500 animate-in fade-in-0")}>
                    {formattedTime}
                  </time>
                )}
              </div>
            );
          } else if (part.type === "reasoning") {
            return <ReasoningBlock key={`reasoning-${index}`} part={part} />;
          } else if (part.type === "tool-invocation") {
            return <ToolCall key={`tool-${index}`} toolInvocations={[part.toolInvocation]} />;
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
        {chartImages.length > 0 && (
          <div className="mt-2 space-y-2">
            {chartImages.map((chart) => (
              <div key={chart.id}>
                <p className="text-sm font-semibold">{chart.title}</p>
                <SVGRenderer svgContent={chart.svgContent} />
              </div>
            ))}
          </div>
        )}
      </div>
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
    <div className="mb-2 flex flex-col items-start sm:max-w-[70%]">
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