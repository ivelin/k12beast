// File path: src/components/ui/react-flow-diagram.tsx
// Dedicated component for rendering flowcharts using React Flow, extracted from chat-message.tsx.
// Updated to fix parent container width/height error using ResizeObserver for dynamic dimension checking.
// Uses React Flow's built-in dark mode with colorMode="dark" for better label visibility.
// Uses Dagre library to automatically layout nodes in a top-to-bottom ('TB') orientation.
// Optimizes node sizes and canvas dimensions to fully utilize the container width.
// Adjusted Dagre spacing, node sizes, and canvas height to ensure all nodes fit in mobile mode.
// Added horizontal layout ('LR') option for desktop and optimized canvas size calculation.
// Increased node width scaling to use more canvas space on desktop.
// Further optimized mobile layout with improved font sizes, spacing, and padding.

"use client";

import React, { useEffect, useState, useRef } from "react";
import { ReactFlow, Background, Node, Edge } from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";

interface ReactFlowDiagramProps {
  chartConfig: any;
  id: string;
}

const ReactFlowDiagram: React.FC<ReactFlowDiagramProps> = ({ chartConfig, id }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canRender, setCanRender] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(400); // Default height
  const [canvasWidth, setCanvasWidth] = useState("100%"); // Default width
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use ResizeObserver to monitor the container's dimensions
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log(`Container dimensions for chart ${id}: width=${width}, height=${height}`);
        if (width > 0 && height > 0) {
          setCanRender(true);
        } else {
          setCanRender(false);
        }
      }
    });

    observer.observe(container);

    // Initial check in case the container already has dimensions
    const { width, height } = container.getBoundingClientRect();
    console.log(`Initial container dimensions for chart ${id}: width=${width}, height=${height}`);
    if (width > 0 && height > 0) {
      setCanRender(true);
    }

    return () => {
      observer.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (!canRender || !containerRef.current) return;

    try {
      // Validate the chartConfig structure
      if (!chartConfig || !chartConfig.nodes || !chartConfig.edges) {
        throw new Error("Invalid React Flow configuration: Missing nodes or edges");
      }

      // Prepare nodes with initial positions (will be adjusted by Dagre)
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const isMobile = containerWidth < 640; // Detect mobile viewport (sm breakpoint)
      const useHorizontalLayout = !isMobile; // Use 'LR' layout on desktop

      // Adjust node sizes based on viewport
      const nodeWidth = isMobile ? 180 : Math.max(500, containerWidth * 0.98 / (chartConfig.nodes.length || 1)); // Smaller on mobile
      const nodeHeight = isMobile ? 60 : 100; // Smaller on mobile
      const fontSize = isMobile ? "14px" : "18px"; // Slightly larger font on mobile for readability

      const initialNodes: Node[] = chartConfig.nodes.map((node: any) => ({
        ...node,
        position: { x: 0, y: 0 }, // Initial position, will be set by Dagre
        style: {
          ...node.style,
          padding: isMobile ? 10 : 8, // More padding on mobile for readability
          borderRadius: 5,
          fontSize: fontSize,
          textAlign: "center",
          width: `${nodeWidth}px`,
        },
      }));

      const configEdges: Edge[] = chartConfig.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        labelStyle: { fontSize: isMobile ? "12px" : "16px", fontWeight: "bold" }, // Slightly larger edge labels on mobile
        labelBgStyle: { fillOpacity: 0.7, padding: 5 },
        style: { strokeWidth: 2 },
        animated: true,
      }));

      // Use Dagre to layout the nodes
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setGraph({
        rankdir: useHorizontalLayout ? "LR" : "TB", // Horizontal on desktop, vertical on mobile
        nodesep: isMobile ? 15 : 20, // Slightly more spacing on mobile for better appearance
        ranksep: isMobile ? 15 : 20, // Slightly more spacing on mobile for better appearance
      });

      // Set default options for Dagre
      dagreGraph.setDefaultEdgeLabel(() => ({}));

      // Add nodes to the Dagre graph
      initialNodes.forEach((node: Node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
      });

      // Add edges to the Dagre graph
      configEdges.forEach((edge: Edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      // Run the Dagre layout
      dagre.layout(dagreGraph);

      // Update node positions based on Dagre layout
      const adjustedNodes: Node[] = initialNodes.map((node: Node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - (useHorizontalLayout ? 0 : nodeWidth / 2), // Center horizontally for vertical layout
            y: nodeWithPosition.y - (useHorizontalLayout ? nodeHeight / 2 : 0), // Center vertically for horizontal layout
          },
        };
      });

      // Calculate optimal canvas dimensions based on Dagre layout
      const positions = adjustedNodes.map((node: Node) => node.position);
      const minX = Math.min(...positions.map((pos) => pos.x));
      const maxX = Math.max(...positions.map((pos) => pos.x + nodeWidth));
      const minY = Math.min(...positions.map((pos) => pos.y));
      const maxY = Math.max(...positions.map((pos) => pos.y + nodeHeight));

      const layoutWidth = maxX - minX + (isMobile ? 40 : 60); // Add padding
      const layoutHeight = maxY - minY + (isMobile ? 120 : 60); // Extra padding for mobile

      if (useHorizontalLayout) {
        // On desktop with horizontal layout, set canvas width dynamically
        setCanvasWidth(`${Math.max(containerWidth, layoutWidth)}px`);
        setCanvasHeight(Math.max(400, layoutHeight));
      } else {
        // On mobile with vertical layout, keep width at 100% and adjust height
        setCanvasWidth("100%");
        setCanvasHeight(Math.max(650, layoutHeight)); // Increased minimum height for mobile
      }

      setNodes(adjustedNodes);
      setEdges(configEdges);
      setError(null);
    } catch (err) {
      setError("Failed to render React Flow diagram: Invalid configuration");
      console.error(`React Flow render error for chart ${id}:`, err);
    }
  }, [chartConfig, id, canRender]);

  return (
    <div className="w-full sm:max-w-[70%] min-w-[300px] overflow-x-auto">
      <div ref={containerRef} className="w-full h-[400px]" style={{ width: canvasWidth, height: `${canvasHeight}px` }}>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : canRender ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.02, minZoom: 0.3, maxZoom: 1.2 }} // Allow smaller zoom to fit all nodes
            colorMode="system"
            style={{ width: "100%", height: "100%" }}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
          </ReactFlow>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p>Loading diagram...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReactFlowDiagram;