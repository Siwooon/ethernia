import { MapNode } from "@/app/component/types/game";

export function isMerchantNode(node: MapNode) {
  return (
    node.eventType === "merchant_blacksmith" ||
    node.eventType === "merchant_alchemist" ||
    node.eventType === "merchant_mystic"
  );
}

export function isNodeCorrupted(node: MapNode, corruptedNodeIds: number[]) {
  return corruptedNodeIds.includes(node.id);
}

export function canTriggerNodeEvent(node: MapNode, corruptedNodeIds: number[]) {
  if (node.type === "start") return false;
  if (node.type === "boss") return true;
  if (isMerchantNode(node)) return true;

  const corrupted = isNodeCorrupted(node, corruptedNodeIds);

  if (!node.isConsumed) return true;
  if (corrupted) return true;

  return false;
}

export function requiresNodeInteractionChoice(node: MapNode) {
  return (
    node.eventType === "battle" ||
    node.eventType === "elite" ||
    node.type === "boss"
  );
}

export function revealAroundNode(allNodes: MapNode[], centerNodeId: number): MapNode[] {
  const centerNode = allNodes.find((n) => n.id === centerNodeId);
  if (!centerNode) return allNodes;

  const visibleIds = new Set<number>([centerNode.id, ...centerNode.neighbors]);

  return allNodes.map((node) => {
    if (node.id === centerNode.id) {
      return { ...node, visibility: "visited" };
    }

    if (visibleIds.has(node.id)) {
      return {
        ...node,
        visibility: node.visibility === "visited" ? "visited" : "discovered",
      };
    }

    return node;
  });
}

export function expandCorruptionFront(
  allNodes: MapNode[],
  currentCorruptedIds: number[],
  steps: number = 1
) {
  let corrupted = new Set(currentCorruptedIds);

  for (let i = 0; i < steps; i++) {
    const next = new Set(corrupted);

    for (const node of allNodes) {
      if (!corrupted.has(node.id)) continue;

      for (const neighborId of node.neighbors) {
        const neighbor = allNodes.find((n) => n.id === neighborId);
        if (!neighbor) continue;
        if (neighbor.type === "start") continue;

        next.add(neighbor.id);
      }
    }

    corrupted = next;
  }

  return Array.from(corrupted);
}

export function markNodeConsumed(nodes: MapNode[], nodeId: number) {
  return nodes.map((node) =>
    node.id === nodeId && !isMerchantNode(node) && node.type !== "boss"
      ? { ...node, isConsumed: true }
      : node
  );
}

export function markNodeResolved(nodes: MapNode[], nodeId: number, label: string) {
  return nodes.map((node) =>
    node.id === nodeId ? { ...node, isConsumed: true, label } : node
  );
}

export function getStartNodeId(nodes: MapNode[]) {
  const startNode = nodes.find((n) => n.kind === "start");
  return startNode?.id ?? 0;
}

export function createRevealedFloorMap(generated: { nodes: MapNode[]; width: number; height: number }) {
  const startNodeId = getStartNodeId(generated.nodes);

  return {
    nodes: revealAroundNode(generated.nodes, startNodeId),
    mapWidth: generated.width,
    mapHeight: generated.height,
    startNodeId,
  };
}
