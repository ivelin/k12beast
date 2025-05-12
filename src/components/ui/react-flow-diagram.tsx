// File path: src/components/ui/react-flow-diagram.tsx
// Client-side React Flow diagram component for rendering flowcharts and sequence diagrams.
// Updated to reduce arrowhead size for better proportionality.

"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ReactFlow, Background, Node, Edge } from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";

// Utility to debounce resize events to prevent excessive re-renders
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface ReactFlowDiagramProps {
  chartConfig: any;
  id: string;
}

const ReactFlowDiagram: React.FC<ReactFlowDiagramProps> = ({ chartConfig, id }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canRender, setCanRender] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(400);
  const [canvasWidth, setCanvasWidth] = useState("100%");
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute the layout using Dagre with TB layout and center it
  const computeLayout = useCallback(() => {
    if (!containerRef.current || !chartConfig || !chartConfig.nodes || !chartConfig.edges) {
      setError("Invalid React Flow configuration: Missing nodes, edges, or container");
      return;
    }

    try {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const isMobile = containerWidth < 640;

      console.log(`Computing layout for chart ${id}: containerWidth=${containerWidth}, isMobile=${isMobile}`);

      // Use Dagre's default node dimensions
      const nodeWidth = 150; // Dagre default width
      const nodeHeight = 50; // Dagre default height
      const fontSize = isMobile ? "14px" : "18px";

      // Initialize nodes without custom sizing
      const initialNodes: Node[] = chartConfig.nodes.map((node: any) => ({
        ...node,
        position: { x: 0, y: 0 },
        style: {
          ...node.style,
          padding: isMobile ? 10 : 8,
          borderRadius: 5,
          fontSize: fontSize,
          textAlign: "center",
        },
      }));

      // Configure edges with improved visibility
      const configEdges: Edge[] = chartConfig.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        labelStyle: { 
          fontSize: isMobile ? "14px" : "18px",
          fontWeight: "bold",
          fill: "#333333",
        },
        style: { 
          strokeWidth: 3,
          stroke: "#666666", // Medium gray for contrast in both light and dark modes
        },
        animated: true,
        type: "smoothstep",
        markerEnd: {
          type: "arrowclosed",
          width: 15, // Reduced arrowhead size
          height: 15,
          color: "#666666", // Match edge color
        },
      }));

      // Set up Dagre layout with TB layout
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setGraph({
        rankdir: "TB", // Always use top-to-bottom layout
        nodesep: 25, // Dagre default node separation
        ranksep: 50, // Dagre default rank separation
        marginx: 40, // Add margins to ensure nodes use full canvas space
        marginy: 40,
      });

      dagreGraph.setDefaultEdgeLabel(() => ({}));

      initialNodes.forEach((node: Node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
      });

      configEdges.forEach((edge: Edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      // Use Dagre's positions and center the layout
      let adjustedNodes: Node[] = initialNodes.map((node: Node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x,
            y: nodeWithPosition.y,
          },
        };
      });

      // Calculate layout bounding box
      const positions = adjustedNodes.map((node: Node) => node.position);
      const minX = Math.min(...positions.map((pos) => pos.x));
      const maxX = Math.max(...positions.map((pos) => pos.x + nodeWidth));
      const minY = Math.min(...positions.map((pos) => pos.y));
      const maxY = Math.max(...positions.map((pos) => pos.y + nodeHeight));
      const layoutWidth = maxX - minX;
      const layoutHeight = maxY - minY;

      console.log(`Layout dimensions: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}, layoutWidth=${layoutWidth}, layoutHeight=${layoutHeight}`);

      // Center the layout horizontally within the canvas
      const offsetX = (containerWidth - layoutWidth) / 2 - minX;
      adjustedNodes = adjustedNodes.map((node: Node) => ({
        ...node,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y,
        },
      }));

      // Set canvas dimensions to match the layout size with additional padding
      setCanvasWidth("100%");
      setCanvasHeight(layoutHeight + 80); // Consistent padding for both mobile and desktop

      setNodes(adjustedNodes);
      setEdges(configEdges);
      setError(null);
    } catch (err) {
      setError("Failed to render React Flow diagram: " + (err instanceof Error ? err.message : "Unknown error"));
      console.error(`React Flow render error for chart ${id}:`, err);
    }
  }, [chartConfig, id]);

  // Handle container resizing with debouncing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(
      debounce((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          console.log(`Resize detected for chart ${id}: width=${width}, height=${height}`);
          if (width > 0 && height > 0) {
            setCanRender(true);
            computeLayout();
          } else {
            setCanRender(false);
          }
        }
      }, 200)
    );

    observer.observe(container);

    const { width, height } = container.getBoundingClientRect();
    console.log(`Initial container dimensions for chart ${id}: width=${width}, height=${height}`);
    if (width > 0 && height > 0) {
      setCanRender(true);
      computeLayout();
    }

    return () => {
      observer.disconnect();
    };
  }, [id, computeLayout]);

  return (
    <div className="w-full overflow-x-hidden">
      <div ref={containerRef} className="w-full" style={{ width: canvasWidth, height: `${canvasHeight}px`, maxWidth: "100%" }}>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : canRender ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
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