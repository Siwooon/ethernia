import { EventType, MapNode, NodeState } from "@/shared/types/game";
import { getCorruptionStage } from "@/shared/engine/game/corruptionEngine";

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

function getCorruptedNodeLabel(node: MapNode) {
  switch (node.eventType) {
    case "battle":
    case "elite":
      return "Combat";
    case "treasure":
      return "Coffre";
    case "rest":
      return "Refuge";
    case "scripted_shrine":
      return "Autel";
    case "statuette":
      return "Relique";
    case "merchant_blacksmith":
    case "merchant_alchemist":
    case "merchant_mystic":
      return "Camp";
    case "random":
      return "Trouble";
    default:
      return node.type === "boss" ? "Boss" : "Lieu";
  }
}

export function applyCorruptionMutations(params: {
  nodes: MapNode[];
  corruptedNodeIds: number[];
  corruptionLevel: number;
  corruptionCharge: number;
}) {
  const stage = getCorruptionStage(params.corruptionLevel, params.corruptionCharge);
  const corruptedIds = new Set(params.corruptedNodeIds);

  return params.nodes.map((node) => {
    if (!corruptedIds.has(node.id) || node.type === "start") return node;

    const shouldMark =
      node.nodeState === "corrupted" ||
      node.isConsumed ||
      stage.id === "infestation" ||
      stage.id === "rupture" ||
      stage.id === "apocalypse";

    if (!shouldMark) return node;

    return {
      ...node,
      nodeState: "corrupted" as NodeState,
      label: getCorruptedNodeLabel(node),
    };
  });
}

export function purifyNode(nodes: MapNode[], nodeId: number, label = "Apaisé") {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          nodeState: node.isConsumed ? ("exhausted" as NodeState) : ("revealed" as NodeState),
          label,
        }
      : node
  );
}

function getResolvedNodeStateByEvent(eventType: EventType): NodeState {
  switch (eventType) {
    case "treasure":
    case "random":
    case "battle":
    case "elite":
      return "revisitable";
    case "rest":
    case "scripted_shrine":
    case "statuette":
    case "merchant_blacksmith":
    case "merchant_alchemist":
    case "merchant_mystic":
      return "exhausted";
    default:
      return "resolved";
  }
}

function getResolvedNodeLabel(node: MapNode, fallback?: string) {
  if (fallback && fallback !== "Résolu") return fallback;

  switch (node.eventType) {
    case "battle":
      return "Silence après l'affrontement";
    case "elite":
      return "Marque d'une victoire coûteuse";
    case "treasure":
      return "Coffre pillé";
    case "rest":
      return "Abri froid";
    case "random":
      return "Lieu marqué";
    case "scripted_shrine":
      return "Sanctuaire épuisé";
    case "statuette":
      return "Relique arrachée";
    case "merchant_blacksmith":
    case "merchant_alchemist":
    case "merchant_mystic":
      return "Camp abandonné";
    default:
      return fallback ?? "Passage ouvert";
  }
}

export function getNarrativeNodeState(node: MapNode, corruptedNodeIds: number[] = []): NodeState {
  const corrupted = isNodeCorrupted(node, corruptedNodeIds);

  if (node.visibility === "hidden" && !node.isConsumed) return "hidden";

  if (node.isConsumed) {
    const persistedState = node.nodeState ?? getResolvedNodeStateByEvent(node.eventType);
    if (corrupted && persistedState !== "exhausted" && node.kind !== "start" && node.type !== "boss") {
      return "corrupted";
    }
    return persistedState;
  }

  if (corrupted) return "corrupted";
  return node.visibility === "hidden" ? "hidden" : "revealed";
}

export function canOfferCorruptedReturnEvent(node: MapNode, corruptedNodeIds: number[]) {
  if (!node.isConsumed) return false;
  if (node.kind === "start" || node.type === "boss") return false;
  if (isMerchantNode(node)) return false;
  if (!isNodeCorrupted(node, corruptedNodeIds)) return false;

  const state = node.nodeState ?? getResolvedNodeStateByEvent(node.eventType);
  return state === "revisitable" || state === "resolved" || state === "corrupted";
}

export function canTriggerNodeEvent(node: MapNode, corruptedNodeIds: number[]) {
  if (node.type === "start") return false;

  // A resolved place normally becomes a road. Only corruption can wake a return scene.
  if (node.isConsumed) return canOfferCorruptedReturnEvent(node, corruptedNodeIds);

  if (node.type === "boss") return true;
  if (isMerchantNode(node)) return true;

  return true;
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
      return { ...node, visibility: "visited", nodeState: node.isConsumed ? node.nodeState : "occupied" };
    }

    if (visibleIds.has(node.id)) {
      return {
        ...node,
        visibility: node.visibility === "visited" ? "visited" : "discovered",
        nodeState: node.isConsumed ? node.nodeState : node.nodeState === "hidden" ? "revealed" : node.nodeState,
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
      ? {
          ...node,
          isConsumed: true,
          nodeState: getResolvedNodeStateByEvent(node.eventType),
          label: getResolvedNodeLabel(node, node.label),
        }
      : node
  );
}

export function markNodeResolved(nodes: MapNode[], nodeId: number, label: string) {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          isConsumed: true,
          nodeState: getResolvedNodeStateByEvent(node.eventType),
          label: getResolvedNodeLabel(node, label),
        }
      : node
  );
}

export function markNodeRevisited(nodes: MapNode[], nodeId: number, label = "Lieu fouillé") {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          isConsumed: true,
          nodeState: "exhausted" as NodeState,
          label,
        }
      : node
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
