// File path: src/components/ui/chat-message.tsx
// Renders a chat message with support for markdown, HTML, MathML/MathJax formulas, and static SVG charts using Plotly.

"use client";

import React, { useEffect, useState, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { Ban, ChevronRight, Code2, Loader2, Terminal } from "lucide-react";
import DOMPurify from "dompurify";
import Plotly from "plotly.js-dist";
import { cn } from "@/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FilePreview } from "@/components/ui/file-preview";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { initializeMathJax, typesetMathJax } from "@/utils/mathjax-config";
import { Message, ChartConfig } from "@/store/types";

// Define Tailwind classes for the chat bubble
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
  charts?: ChartConfig[];
}

export interface ChartImage {
  id: string;
  svgContent: string;
  title: string;
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
  charts = [],
}) => {
  const [domPurify, setDomPurify] = useState<typeof DOMPurify | null>(null);
  const [isDOMPurifyLoaded, setIsDOMPurifyLoaded] = useState(false);
  const [processedContent, setProcessedContent] = useState<string>(content);
  const [processedParts, setProcessedParts] = useState<MessagePart[] | undefined>(parts);
  const [chartImages, setChartImages] = useState<ChartImage[]>([]);
  const [supportsMathML, setSupportsMathML] = useState<boolean | null>(null);

  // Load DOMPurify and initialize MathJax
  useEffect(() => {
    import("dompurify").then((module) => {
      setDomPurify(() => module.default);
      setIsDOMPurifyLoaded(true);
    });
    // Initialize MathJax for fallback
    initializeMathJax();
  }, []);

  // Detect MathML support
  useEffect(() => {
    const testMathMLSupport = () => {
      const div = document.createElement("div");
      div.innerHTML = "<math></math>";
      document.body.appendChild(div);
      const hasMathML = div.firstElementChild?.nodeName.toLowerCase() === "math";
      document.body.removeChild(div);
      console.log("MathML support detected:", hasMathML);
      setSupportsMathML(hasMathML);
      return hasMathML;
    };

    testMathMLSupport();
  }, []);

  // Function to map legacy Chart.js config to Plotly config (for transition period)
  const mapChartJsToPlotlyConfig = (chartConfig: any) => {
    const chartJsConfig = chartConfig.config;

    // Map chart type
    let plotlyType: string;
    switch (chartJsConfig.type) {
      case "line":
        plotlyType = "scatter";
        break;
      case "bar":
        plotlyType = "bar";
        break;
      case "scatter":
        plotlyType = "scatter";
        break;
      default:
        console.warn(`Unsupported Chart.js type: ${chartJsConfig.type}. Defaulting to scatter.`);
        plotlyType = "scatter";
    }

    // Map datasets to Plotly traces
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

    // Map layout options
    const layout: any = {
      margin: { t: 40, b: 40, l: 40, r: 40 },
      title: {
        text: chartJsConfig.options?.plugins?.title?.text || chartConfig.id,
        font: { size: 16 },
        x: 0.5,
        xanchor: "center",
      },
      xaxis: {
        title: chartJsConfig.options?.scales?.x?.title?.text || "",
      },
      yaxis: {
        title: chartJsConfig.options?.scales?.y?.title?.text || "",
      },
      showlegend: true,
    };

    return { data, layout };
  };

  // Function to validate Plotly configuration
  const validatePlotlyConfig = (config: any): boolean => {
    if (!config) {
      console.error("Invalid Plotly config: Config is undefined or null");
      return false;
    }
    if (!config.data) {
      console.error("Invalid Plotly config: Missing data property", config);
      return false;
    }
    if (!config.layout) {
      console.error("Invalid Plotly config: Missing layout property", config);
      return false;
    }
    if (!Array.isArray(config.data)) {
      console.error("Invalid Plotly config: Data is not an array", config.data);
      return false;
    }
    if (config.data.length === 0) {
      console.error("Invalid Plotly config: Data array is empty", config.data);
      return false;
    }
    for (let i = 0; i < config.data.length; i++) {
      const trace = config.data[i];
      if (!trace) {
        console.error(`Invalid Plotly trace at index ${i}: Trace is undefined or null`, trace);
        return false;
      }
      if (!trace.x) {
        console.error(`Invalid Plotly trace at index ${i}: Missing x property`, trace);
        return false;
      }
      if (!trace.y) {
        console.error(`Invalid Plotly trace at index ${i}: Missing y property`, trace);
        return false;
      }
      if (!trace.type) {
        console.error(`Invalid Plotly trace at index ${i}: Missing type property`, trace);
        return false;
      }
      if (!Array.isArray(trace.x) || trace.x.length === 0) {
        console.error(`Invalid Plotly trace at index ${i}: x is not a non-empty array`, trace.x);
        return false;
      }
      if (!Array.isArray(trace.y) || trace.y.length === 0) {
        console.error(`Invalid Plotly trace at index ${i}: y is not a non-empty array`, trace.y);
        return false;
      }
      if (trace.x.length !== trace.y.length) {
        console.error(`Invalid Plotly trace at index ${i}: x and y arrays have different lengths`, trace);
        return false;
      }
    }
    return true;
  };

  // Function to render a chart to an inline SVG string using Plotly
  const renderChartToSVG = (chartConfig: ChartConfig): Promise<ChartImage> => {
    return new Promise(async (resolve, reject) => {
      try {
        let plotlyData = chartConfig.config.data;
        let plotlyLayout = chartConfig.config.layout;

        // Validate Plotly configuration
        if (!validatePlotlyConfig(chartConfig.config)) {
          console.warn(`Chart ${chartConfig.id} appears to be in Chart.js format. Mapping to Plotly.`);
          const mappedConfig = mapChartJsToPlotlyConfig(chartConfig);
          plotlyData = mappedConfig.data;
          plotlyLayout = mappedConfig.layout;
        }

        // Create a temporary div to render the chart
        const tempDiv = document.createElement("div");
        document.body.appendChild(tempDiv);

        // Render the chart using Plotly without fixed dimensions
        await Plotly.newPlot(tempDiv, plotlyData, plotlyLayout, { staticPlot: true });

        // Export the chart as SVG (use temporary dimensions for rendering, will be overridden by CSS)
        const svgContent = await Plotly.toImage(tempDiv, {
          format: "svg",
          width: 400, // Temporary width for rendering
          height: 300, // Temporary height for rendering
        });

        // Clean up
        Plotly.purge(tempDiv);
        document.body.removeChild(tempDiv);

        // Extract the SVG content (remove the data:image/svg+xml;base64, prefix if present)
        let svgString: string;
        if (svgContent.startsWith("data:image/svg+xml;base64,")) {
          const base64Data = svgContent.replace("data:image/svg+xml;base64,", "");
          svgString = atob(base64Data);
        } else if (svgContent.startsWith("data:image/svg+xml,")) {
          // Handle URL-encoded SVG (e.g., data:image/svg+xml,%3Csvg...)
          const encodedData = svgContent.replace("data:image/svg+xml,", "");
          svgString = decodeURIComponent(encodedData);
        } else {
          svgString = svgContent;
        }

        // Log the raw SVG string for debugging
        console.log(`Raw SVG content for chart ${chartConfig.id}:`, svgString);

        // Remove XML declaration if present (e.g., <?xml version="1.0" encoding="UTF-8"?>)
        svgString = svgString.replace(/<\?xml[^>]*\>/g, "").trim();

        // Ensure the SVG starts with <svg> tag
        if (!svgString.startsWith("<svg")) {
          console.error(`Invalid SVG content for chart ${chartConfig.id}: Does not start with <svg>`, svgString);
          throw new Error(`Invalid SVG content: Does not start with <svg>`);
        }

        const title = plotlyLayout?.title?.text || chartConfig.id;
        resolve({ id: chartConfig.id, svgContent: svgString, title });
      } catch (error) {
        console.error(`Failed to render chart ${chartConfig.id} to SVG:`, error);
        const title = chartConfig.config.layout?.title?.text || chartConfig.id;
        resolve({
          id: chartConfig.id,
          svgContent: `<svg width="400" height="300"><text x="10" y="20" font-size="16">Failed to render chart: ${title}</text></svg>`,
          title,
        });
      }
    });
  };

  // Function to convert MathML to LaTeX for MathJax rendering
  const mathMLToLaTeX = (mathElement: Element): string => {
    // Simple conversion: extract the content and convert common MathML to LaTeX
    // This is a basic implementation; a more robust solution might use a library like MathJax's internal converters
    const convertNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim() || "";
      }
      if (node.nodeName === "mi") {
        return node.textContent || "";
      }
      if (node.nodeName === "mo") {
        return node.textContent || "";
      }
      if (node.nodeName === "mn") {
        return node.textContent || "";
      }
      if (node.nodeName === "mrow") {
        return Array.from(node.childNodes).map(convertNode).join("");
      }
      if (node.nodeName === "msup") {
        const base = convertNode(node.childNodes[0]);
        const exponent = convertNode(node.childNodes[1]);
        return `${base}^{${exponent}}`;
      }
      if (node.nodeName === "mfrac") {
        const numerator = convertNode(node.childNodes[0]);
        const denominator = convertNode(node.childNodes[1]);
        return `\\frac{${numerator}}{${denominator}}`;
      }
      if (node.nodeName === "mtext") {
        return `\\text{${node.textContent || ""}}`;
      }
      if (node.nodeName === "math") {
        return Array.from(node.childNodes).map(convertNode).join("");
      }
      return "";
    };

    const latex = convertNode(mathElement);
    const displayMode = mathElement.getAttribute("display") === "block" ? "display" : "inline";
    return `<span class="math-tex" data-math-type="${displayMode}">${latex}</span>`;
  };

  // Function to process MathML elements and apply fallback if needed
  const processMathMLContent = (html: string): string => {
    if (supportsMathML === null) {
      // If MathML support detection isn't complete, return original content
      return html;
    }

    if (supportsMathML) {
      // Browser supports MathML, so we can use it directly
      return html;
    }

    // Browser does not support MathML, convert to LaTeX for MathJax
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const mathElements = doc.querySelectorAll("math");

    mathElements.forEach((mathElement) => {
      const latexContent = mathMLToLaTeX(mathElement);
      const wrapper = doc.createElement("span");
      wrapper.innerHTML = latexContent;
      mathElement.parentNode?.replaceChild(wrapper, mathElement);
    });

    return doc.body.firstChild?.innerHTML || html;
  };

  // Process charts and append them at the end of the message
  useEffect(() => {
    if (renderAs !== "html" || !isDOMPurifyLoaded || supportsMathML === null) {
      if (renderAs === "html" && isDOMPurifyLoaded) {
        typesetMathJax().catch((error) =>
          console.error("Failed to typeset MathJax:", error)
        );
      }
      return;
    }

    const processCharts = async () => {
      try {
        // Initialize processed content and parts
        let updatedContent = content || "";
        let updatedParts = parts ? [...parts] : undefined;

        // Process MathML content
        updatedContent = processMathMLContent(updatedContent);

        // Generate SVG content for all charts if any exist
        let generatedChartImages: ChartImage[] = [];
        if (charts.length > 0) {
          console.log("Processing charts:", JSON.stringify(charts, null, 2));
          generatedChartImages = await Promise.all(
            charts.map(async (chartConfig) => {
              return await renderChartToSVG(chartConfig);
            })
          );
          setChartImages(generatedChartImages);
        }

        // Remove <div> tags (previously <canvas>) from content and update chart references
        updatedContent = updatedContent.replace(
          /<div\s+id="[^"]*"[^>]*><\/div>/gi,
          ""
        );
        updatedContent = updatedContent.replace(
          /Chart\s+(\w+)/gi,
          "Chart $1 below"
        );
        setProcessedContent(updatedContent);

        // If parts exist, process them as well
        if (parts) {
          updatedParts = await Promise.all(
            parts.map(async (part) => {
              if (part.type !== "text") return part;

              let partContent = part.text || "";
              // Process MathML in parts
              partContent = processMathMLContent(partContent);
              partContent = partContent.replace(
                /<div\s+id="[^"]*"[^>]*><\/div>/gi,
                ""
              );
              partContent = partContent.replace(
                /Chart\s+(\w+)/gi,
                "Chart $1 below"
              );
              return { ...part, text: partContent };
            })
          );
          setProcessedParts(updatedParts);
        }

        // Typeset MathJax if we had to convert MathML to LaTeX
        if (!supportsMathML) {
          await typesetMathJax();
        }
      } catch (error) {
        console.error("Failed to process charts or typeset MathJax:", error);
        // Ensure state is updated even if an error occurs
        setProcessedContent(content || "");
        setProcessedParts(parts ? [...parts] : undefined);
      }
    };

    processCharts();
  }, [content, parts, renderAs, isDOMPurifyLoaded, charts, supportsMathML]);

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
        "h4", "h5", "h6", "a", "svg", "g", "path", "text", "rect", "line",
        "table", "tr", "td", "th", "tbody", "thead", "tfoot", "caption",
        "sup", "sub", "b",
        // MathML tags
        "math", "mi", "mo", "mn", "mrow", "msup", "mfrac", "mtext",
      ],
      ALLOWED_ATTR: [
        "class", "style", "href", "src", "alt", "id", "width", "height",
        "aria-label", "data-math-type", "fill", "stroke", "stroke-width",
        "transform", "x", "y", "dx", "dy", "font-size", "text-anchor",
        "font-family", "font-weight", "d", "xmlns",
        // MathML attributes
        "display", "mathvariant",
      ],
    });
  };

  // Component to render SVG content dynamically with responsive sizing
  const SVGRenderer: React.FC<{ svgContent: string }> = ({ svgContent }) => {
    const svgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (svgRef.current) {
        try {
          // Parse the SVG string into a DOM element
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");

          // Check for parsing errors
          const parseError = svgDoc.querySelector("parsererror");
          if (parseError) {
            console.error("SVG parsing error:", parseError.textContent);
            // Fallback to dangerouslySetInnerHTML
            svgRef.current.innerHTML = svgContent;
            return;
          }

          const svgElement = svgDoc.documentElement;

          // Ensure the SVG element has the correct namespace
          if (!svgElement.hasAttribute("xmlns")) {
            svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          }

          // Remove fixed width and height to allow responsive scaling
          svgElement.removeAttribute("width");
          svgElement.removeAttribute("height");

          // Add CSS to make the SVG responsive while preserving aspect ratio
          svgElement.style.width = "100%";
          svgElement.style.height = "auto";
          svgElement.style.maxWidth = "100%";
          svgElement.style.display = "block";

          // Clear the container and append the SVG element
          svgRef.current.innerHTML = "";
          svgRef.current.appendChild(svgElement);
        } catch (error) {
          console.error("Failed to parse SVG content:", error);
          // Fallback to dangerouslySetInnerHTML
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

  if (processedParts && processedParts.length > 0) {
    return (
      <>
        {processedParts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div
                className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
                key={`text-${index}`}
              >
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
                  {/* Append chart SVGs at the end of the message */}
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
        {/* Append chart SVGs at the end of the message */}
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

// Memoize ChatMessage to prevent unnecessary re-renders
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