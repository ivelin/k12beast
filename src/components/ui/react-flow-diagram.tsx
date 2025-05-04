// File path: src/components/ui/react-flow-diagram.tsx
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
  const [canvasHeight, setCanvasHeight] = useState(400);
  const [canvasWidth, setCanvasWidth] = useState("100%");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
      if (!chartConfig || !chartConfig.nodes || !chartConfig.edges) {
        throw new Error("Invalid React Flow configuration: Missing nodes or edges");
      }

      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const isMobile = containerWidth < 640;
      const useHorizontalLayout = !isMobile;

      const nodeWidth = isMobile ? 180 : Math.max(500, containerWidth * 0.98 / (chartConfig.nodes.length || 1));
      const nodeHeight = isMobile ? 60 : 100;
      const fontSize = isMobile ? "14px" : "18px";

      const initialNodes: Node[] = chartConfig.nodes.map((node: any) => ({
        ...node,
        position: { x: 0, y: 0 },
        style: {
          ...node.style,
          padding: isMobile ? 10 : 8,
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
        labelStyle: { fontSize: isMobile ? "12px" : "16px", fontWeight: "bold" },
        labelBgStyle: { fillOpacity: 0.7, padding: 5 },
        style: { strokeWidth: 2 },
        animated: true,
      }));

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setGraph({
        rankdir: useHorizontalLayout ? "LR" : "TB",
        nodesep: isMobile ? 15 : 20,
        ranksep: isMobile ? 15 : 20,
      });

      dagreGraph.setDefaultEdgeLabel(() => ({}));

      initialNodes.forEach((node: Node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
      });

      configEdges.forEach((edge: Edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      const adjustedNodes: Node[] = initialNodes.map((node: Node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - (useHorizontalLayout ? 0 : nodeWidth / 2),
            y: nodeWithPosition.y - (useHorizontalLayout ? nodeHeight / 2 : 0),
          },
        };
      });

      const positions = adjustedNodes.map((node: Node) => node.position);
      const minX = Math.min(...positions.map((pos) => pos.x));
      const maxX = Math.max(...positions.map((pos) => pos.x + nodeWidth));
      const minY = Math.min(...positions.map((pos) => pos.y));
      const maxY = Math.max(...positions.map((pos) => pos.y + nodeHeight));

      const layoutWidth = maxX - minX + (isMobile ? 40 : 60);
      const layoutHeight = maxY - minY + (isMobile ? 120 : 60);

      if (useHorizontalLayout) {
        setCanvasWidth(`${Math.max(containerWidth, layoutWidth)}px`);
        setCanvasHeight(Math.max(400, layoutHeight));
      } else {
        setCanvasWidth("100%");
        setCanvasHeight(Math.max(650, layoutHeight));
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
    <div className="w-full sm:max-w-[70%] overflow-x-auto">
      <div ref={containerRef} className="w-full" style={{ width: canvasWidth, height: `${canvasHeight}px`, maxWidth: "100%" }}>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : canRender ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.02, minZoom: 0.1, maxZoom: 1.2 }}
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