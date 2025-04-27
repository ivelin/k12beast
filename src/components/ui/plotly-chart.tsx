// File path: src/components/ui/plotly-chart.tsx
// Dedicated component for rendering Plotly charts, extracted from chat-message.tsx.
// Handles Plotly chart rendering to SVG with dynamic sizing and improved readability for mobile.
// Increased font sizes significantly to counteract scaling effects on mobile.
// Added JavaScript to enforce minimum font size on SVG text elements.
// Updated to deep clone chart data to avoid read-only errors with Plotly.

"use client";

import React, { useEffect, useState, useRef } from "react";
import Plotly from "plotly.js-dist";

interface PlotlyChartProps {
  chartConfig: any;
  id: string;
  containerWidth: number;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ chartConfig, id, containerWidth }) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  // Validate Plotly configuration
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
        // Deep clone the chart data and layout to ensure they are mutable
        const clonedConfig = JSON.parse(JSON.stringify(chartConfig.config));
        let plotlyData = clonedConfig.data;
        let plotlyLayout = clonedConfig.layout;

        if (!validatePlotlyConfig(chartConfig)) {
          console.warn(`Chart ${id} does not appear to be a valid Plotly config.`);
          plotlyData = [];
          plotlyLayout = {};
        }

        // Detect mobile viewport for font size adjustment
        const isMobile = containerWidth < 640; // Align with sm breakpoint

        // Enhance layout for better readability
        plotlyLayout = {
          ...plotlyLayout,
          font: { size: isMobile ? 48 : 16 }, // Significantly larger font on mobile to counteract scaling
          xaxis: { ...plotlyLayout.xaxis, tickfont: { size: isMobile ? 44 : 14 } },
          yaxis: { ...plotlyLayout.yaxis, tickfont: { size: isMobile ? 44 : 14 } },
          margin: { l: 80, r: 20, t: 20, b: 80 }, // Increased margins for mobile
        };

        const tempDiv = document.createElement("div");
        document.body.appendChild(tempDiv);
        console.log(`Created tempDiv for Plotly chart ${id}`);

        // Calculate the height to maintain aspect ratio (default 800x600, aspect ratio 4:3)
        const aspectRatio = 3 / 4;
        const baseWidth = isMobile ? 1000 : 800; // Reduced base width further to minimize scaling
        const baseHeight = baseWidth * aspectRatio;

        const plotResult = await Plotly.newPlot(tempDiv, plotlyData, plotlyLayout, { staticPlot: true });
        console.log(`Plotly.newPlot result for chart ${id}:`, plotResult);

        let svgContent = await Plotly.toImage(tempDiv, { format: "svg", width: baseWidth, height: baseHeight });
        // console.log(`Plotly.toImage result for chart ${id}:`, svgContent);

        Plotly.purge(tempDiv);
        document.body.removeChild(tempDiv);
        console.log(`Cleaned up tempDiv for Plotly chart ${id}`);

        let svgString = svgContent.startsWith("data:image/svg+xml;base64,")
          ? atob(svgContent.replace("data:image/svg+xml;base64,", ""))
          : svgContent.startsWith("data:image/svg+xml,")
          ? decodeURIComponent(svgContent.replace("data:image/svg+xml,", ""))
          : svgContent;
        svgString = svgString.replace(/<\?xml[^>]*\>/g, "").trim();
        if (!svgString.startsWith("<svg")) throw new Error("Invalid SVG content");

        // Enforce minimum font size on all text elements in the SVG
        if (isMobile) {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
          const textElements = svgDoc.getElementsByTagName("text");
          for (let i = 0; i < textElements.length; i++) {
            const fontSize = parseFloat(textElements[i].getAttribute("font-size") || "0");
            if (fontSize < 16) {
              textElements[i].setAttribute("font-size", "16");
            }
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
        svgElement.style.width = "100%";
        svgElement.style.height = "auto";
        svgElement.style.maxWidth = "100%";
        svgElement.style.display = "block";
        svgElement.style.minHeight = containerWidth < 640 ? "450px" : "auto"; // Ensure minimum height on mobile
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
    <div className="w-full sm:max-w-[70%] min-w-[300px]">
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