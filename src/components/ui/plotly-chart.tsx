// File path: src/components/ui/plotly-chart.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import Plotly from "plotly.js-dist";

// Define props interface for better TypeScript type checking
interface PlotlyChartProps {
  chartConfig: any;
  id: string;
  containerWidth: number;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ chartConfig, id, containerWidth }) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  // Validates Plotly configuration for correctness
  const validatePlotlyConfig = (chartData: any): boolean => {
    const config = chartData.config;
    if (chartData?.format !== "plotly" || !config) return false;
    if (!config?.data || !config.layout || !Array.isArray(config.data) || config.data.length === 0) return false;
    for (const trace of config.data) {
      if (
        !trace?.x ||
        !trace.y ||
        !trace.type ||
        !Array.isArray(trace.x) ||
        !Array.isArray(trace.y) ||
        trace.x.length !== trace.y.length ||
        trace.x.length === 0
      )
        return false;
    }
    return true;
  };

  useEffect(() => {
    const renderPlotlyChart = async () => {
      try {
        // Clone chart config to ensure mutability
        const clonedConfig = JSON.parse(JSON.stringify(chartConfig.config));
        let plotlyData = clonedConfig.data;
        let plotlyLayout = clonedConfig.layout;

        if (!validatePlotlyConfig(chartConfig)) {
          console.warn(`Chart ${id} does not appear to be a valid Plotly config.`);
          plotlyData = [];
          plotlyLayout = {};
        }

        // Adjust font sizes and layout for mobile readability
        const isMobile = containerWidth < 640;
        plotlyLayout = {
          ...plotlyLayout,
          responsive: true, // Makes chart resize with container
          autosize: true, // Ensure responsiveness
          font: { size: isMobile ? 14 : 16 }, // Adjusted font size for readability
          xaxis: { ...plotlyLayout.xaxis, tickfont: { size: isMobile ? 12 : 14 } },
          yaxis: { ...plotlyLayout.yaxis, tickfont: { size: isMobile ? 12 : 14 } },
          margin: { l: isMobile ? 60 : 80, r: 20, t: 20, b: isMobile ? 60 : 80 }, // Adjusted margins for mobile
        };

        const tempDiv = document.createElement("div");
        document.body.appendChild(tempDiv);

        // Adjust dimensions for mobile screens
        const aspectRatio = 3 / 4;
        const baseWidth = isMobile ? 600 : 800; // Reduced base width for mobile
        const baseHeight = baseWidth * aspectRatio;

        await Plotly.newPlot(tempDiv, plotlyData, plotlyLayout, { staticPlot: true });
        let svgContent = await Plotly.toImage(tempDiv, { format: "svg", width: baseWidth, height: baseHeight });

        Plotly.purge(tempDiv);
        document.body.removeChild(tempDiv);

        // Process SVG string for rendering
        let svgString = svgContent.startsWith("data:image/svg+xml;base64,")
          ? atob(svgContent.replace("data:image/svg+xml;base64,", ""))
          : svgContent.startsWith("data:image/svg+xml,")
          ? decodeURIComponent(svgContent.replace("data:image/svg+xml,", ""))
          : svgContent;
        svgString = svgString.replace(/<\?xml[^>]*\>/g, "").trim();
        if (!svgString.startsWith("<svg")) throw new Error("Invalid SVG content");

        // Enforce minimum font size on mobile
        if (isMobile) {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
          const textElements = svgDoc.getElementsByTagName("text");
          for (let i = 0; i < textElements.length; i++) {
            const fontSize = parseFloat(textElements[i].getAttribute("font-size") || "0");
            if (fontSize < 12) textElements[i].setAttribute("font-size", "12"); // Adjusted minimum
          }
          svgString = new XMLSerializer().serializeToString(svgDoc.documentElement);
        }

        setSvgContent(svgString);
        setError(null);
      } catch (error) {
        setError(`Failed to render Plotly chart: ${id}`);
        console.error(`Failed to render Plotly chart ${id}:`, error);
      }
    };

    renderPlotlyChart();
  }, [chartConfig, id, containerWidth]);

  useEffect(() => {
    if (svgRef.current && svgContent) {
      try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
        const parseError = svgDoc.querySelector("parsererror");
        if (parseError) {
          console.error("SVG parsing error for chart", id, ":", parseError.textContent);
          svgRef.current.innerHTML = svgContent;
          return;
        }
        const svgElement = svgDoc.documentElement;
        if (!svgElement.hasAttribute("xmlns")) svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgElement.removeAttribute("width");
        svgElement.removeAttribute("height");
        svgElement.style.width = "100%"; // Ensures SVG scales with container
        svgElement.style.height = "auto";
        svgElement.style.maxWidth = "100%"; // Prevents overflow
        svgElement.style.display = "block";
        svgElement.style.minHeight = containerWidth < 640 ? "400px" : "auto"; // Adjusted min height
        svgElement.setAttribute("aria-labelledby", `caption-${id}`);
        svgRef.current.innerHTML = "";
        svgRef.current.appendChild(svgElement);
      } catch (error) {
        console.error("Failed to parse SVG content for chart", id, ":", error);
        svgRef.current.innerHTML = svgContent;
      }
    }
  }, [svgContent, id, containerWidth]);

  return (
    // Container adapts to parent width with responsive classes
    <div className="w-full sm:p-2">
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : svgContent ? (
        <div ref={svgRef} className="w-full max-w-full plotly-svg" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p>Loading chart...</p>
        </div>
      )}
    </div>
  );
};

export default PlotlyChart;