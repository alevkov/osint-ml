import React, { useEffect, useRef } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import { TOPIC_COLORS } from "@/lib/topics";

interface GraphData {
  nodes: any[];
  links: any[];
}

interface VisNetworkGraphProps {
  data: GraphData;
}

export default function VisNetworkGraph({ data }: VisNetworkGraphProps) {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstanceRef = useRef<Network | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Group nodes by topic
    const nodesByTopic = data.nodes.reduce(
      (acc: Record<string, any[]>, node: any) => {
        const topic = node.metadata?.topic || "misc";
        if (!acc[topic]) acc[topic] = [];
        acc[topic].push(node);
        return acc;
      },
      {},
    );

    // Create nodes with properly positioned labels
    const allNodes = [];

    // First, add content nodes
    data.nodes.forEach((node) => {
      const topic = node.metadata?.topic || "misc";
      const topicColor = TOPIC_COLORS[topic];

      allNodes.push({
        id: node.id,
        label: node.content,
        metadata: node.metadata,
        font: {
          size: 32,
          face: "Monospace",
          color: "#FFFFFF",
          strokeWidth: 14,
          strokeColor: "rgba(0,0,0,0.8)",
          bold: true,
          background: "rgba(0,0,0,0.7)",
          align: "center",
          multi: true,
          vadjust: -200, // Move label above node
        },
        shape: "dot",
        size: 40,
        color: {
          border: topicColor,
          background: "rgba(0,0,0,0.8)",
          highlight: {
            border: topicColor,
            background: "#FFFFFF",
          },
          hover: {
            border: topicColor,
            background: "#FFFFFF",
          },
        },
        borderWidth: 2,
        chosen: {
          node: (values: any, id: any, selected: any, hovering: any) => {
            if (hovering) {
              values.borderWidth = 4;
              values.size = 40;
            }
          },
          label: (values: any, id: any, selected: any, hovering: any) => {
            if (hovering) {
              values.size = 40;
              values.strokeWidth = 6;
            }
          },
        },
      });
    });

    // Then add topic label nodes
    Object.entries(nodesByTopic).forEach(([topic, nodes]) => {
      if (nodes.length === 0) return;

      const topicColor = TOPIC_COLORS[topic];
      const topicLabel = topic.toUpperCase().replace("_", " ");

      // Calculate average position of nodes in this topic
      const avgX =
        nodes.reduce((sum, node) => sum + (node.x || 0), 0) / nodes.length;
      const avgY =
        nodes.reduce((sum, node) => sum + (node.y || 0), 0) / nodes.length;

      allNodes.push({
        id: `topic-${topic}`,
        label: `${topicLabel}`,
        x: avgX - 200,
        y: avgY - 5000, // Position above the node cluster
        font: {
          size: 64,
          face: "Inter",
          color: topicColor,
          strokeWidth: 4,
          strokeColor: "rgba(0,0,0,0.8)",
          bold: true,
          background: "rgba(0,0,0,0.8)",
          borderColor: topicColor,
          align: "top",
        },
        color: {
          border: topicColor,
          background: "rgba(0,0,0,0.8)",
          highlight: {
            border: topicColor,
            background: "#FFFFFF",
          },
          hover: {
            border: topicColor,
            background: "#FFFFFF",
          },
        },
        shape: "box",
        fixed: false,
        physics: false,
      });

      // Add invisible edges to maintain clustering
      nodes.forEach((node) => {
        data.links.push({
          from: node.id,
          to: `topic-${topic}`,
          hidden: true,
          physics: false,
          length: 200,
        });
      });
    });

    const nodes = new DataSet(allNodes);
    const edges = new DataSet(
      data.links.map((link) => ({
        from: link.source,
        to: link.target,
        color: {
          color: getEdgeColor(link),
          opacity: 0.8,
          hover: getEdgeColor(link, 1),
        },
        width: 2,
        hoverWidth: 4,
        selectionWidth: 3,
        smooth: {
          type: "continuous",
          roundness: 0.2,
        },
        hidden: link.hidden || false,
      })),
    );

    const options = {
      nodes: {
        shape: "dot",
        scaling: {
          min: 10,
          max: 20,
          label: {
            enabled: true,
            min: 14,
            max: 24,
            maxVisible: 24,
            drawThreshold: 5,
          },
        },
      },
      edges: {
        smooth: {
          type: "continuous",
          forceDirection: "none",
          roundness: 0.2,
        },
        selectionWidth: 3,
        hoverWidth: 2,
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        hideEdgesOnDrag: true,
        multiselect: false,
        zoomView: true,
        dragView: true,
        keyboard: {
          enabled: true,
          bindToWindow: true,
        },
      },
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -2000,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.05,
          damping: 0.4,
          avoidOverlap: 1,
        },
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 25,
        },
      },
    };

    if (networkRef.current) {
      networkInstanceRef.current = new Network(
        networkRef.current,
        { nodes, edges },
        options,
      );

      // Add hover event listeners for custom tooltip
      networkInstanceRef.current.on("hoverNode", (params) => {
        const node = nodes.get(params.node);
        if (node && tooltipRef.current && networkRef.current) {
          // Get node position on screen
          const position = networkInstanceRef.current.getPositions([
            params.node,
          ])[params.node];
          const canvasPosition =
            networkInstanceRef.current.canvasToDOM(position);

          // Update tooltip content and position
          tooltipRef.current.innerHTML = `
            <div class="p-4 rounded-lg bg-background/95 backdrop-blur border border-primary/20 shadow-xl">
              <h3 class="text-lg font-bold mb-2">${node.label}</h3>
              ${
                node.metadata?.topic
                  ? `
                <div class="mb-2">
                  <span class="text-sm font-semibold text-muted-foreground">Topic:</span>
                  <span class="ml-2 text-sm">${node.metadata.topic.toUpperCase()}</span>
                </div>
              `
                  : ""
              }
              ${
                node.metadata?.description
                  ? `
                <div class="mb-2">
                  <span class="text-sm font-semibold text-muted-foreground">Description:</span>
                  <p class="mt-1 text-sm">${node.metadata.description}</p>
                </div>
              `
                  : ""
              }
              ${
                node.metadata?.source
                  ? `
                <div>
                  <span class="text-sm font-semibold text-muted-foreground">Source:</span>
                  <span class="ml-2 text-sm">${node.metadata.source}</span>
                </div>
              `
                  : ""
              }
            </div>
          `;

          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = `${canvasPosition.x + 10}px`;
          tooltipRef.current.style.top = `${canvasPosition.y + 10}px`;
          networkInstanceRef.current.canvas.body.container.style.cursor =
            "pointer";
        }
      });

      networkInstanceRef.current.on("blurNode", () => {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "none";
        }
        if (networkInstanceRef.current) {
          networkInstanceRef.current.canvas.body.container.style.cursor =
            "default";
        }
      });

      // Position topic labels after initial stabilization
      networkInstanceRef.current.once("stabilizationIterationsDone", () => {
        Object.entries(nodesByTopic).forEach(([topic, topicNodes]) => {
          if (topicNodes.length > 0) {
            // Calculate the center of the topic cluster
            const positions = topicNodes.map((node) =>
              networkInstanceRef.current!.getPosition(node.id),
            );
            const avgX =
              positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
            const avgY =
              positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;

            // Position topic label above the cluster
            networkInstanceRef.current!.moveNode(
              `topic-${topic}`,
              avgX,
              avgY - 150,
            );
          }
        });

        // Fit the network to view all nodes
        networkInstanceRef.current!.fit({
          animation: {
            duration: 1000,
            easingFunction: "easeInOutQuad",
          },
        });
      });
    }

    return () => {
      if (networkInstanceRef.current) {
        networkInstanceRef.current.destroy();
      }
    };
  }, [data]);

  function getEdgeColor(link: any, opacity = 0.8) {
    if (link.type?.endsWith("_related")) {
      const topic = link.type.replace("_related", "");
      const color = TOPIC_COLORS[topic] || TOPIC_COLORS.misc;
      return color.replace("hsl", "hsla").replace(")", `, ${opacity})`);
    } else if (link.type === "strong_semantic") {
      return `rgba(255, 255, 255, ${opacity})`;
    }
    return `rgba(0, 255, 255, ${opacity})`;
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={networkRef}
        className="w-full h-full"
        style={{ background: "transparent" }}
      />
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none"
        style={{ display: "none" }}
      />
    </div>
  );
}
