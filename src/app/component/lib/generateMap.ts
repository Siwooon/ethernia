import { BATTLE_NAMES, BOSS_NAMES } from "@/app/component/data/names";
import { EventType, MapNode, NodeType } from "@/app/component/types/game";
import { LOCATION_THEMES } from "@/app/component/data/locations";

function pickLocationTheme(depth: number) {
  return LOCATION_THEMES[depth % LOCATION_THEMES.length];
}

function pickEventTypeForNode(params: {
  depth: number;
  isFinalBossLayer: boolean;
  isMidBossLayer: boolean;
  lastMerchantDepth: number | null;
}): { eventType: EventType; label?: string; nextMerchantDepth: number | null } {
  const { depth, isFinalBossLayer, isMidBossLayer, lastMerchantDepth } = params;

  if (isFinalBossLayer || isMidBossLayer) {
    return {
      eventType: "boss",
      nextMerchantDepth: lastMerchantDepth,
    };
  }

  const merchantAllowed =
    lastMerchantDepth === null || depth - lastMerchantDepth >= 4;

  const roll = Math.random();

  if (merchantAllowed && roll < 0.10) {
    const merchantRoll = Math.random();

    if (merchantRoll < 0.34) {
      return {
        eventType: "merchant_blacksmith",
        label: "Marchand",
        nextMerchantDepth: depth,
      };
    }

    if (merchantRoll < 0.67) {
      return {
        eventType: "merchant_alchemist",
        label: "Marchand",
        nextMerchantDepth: depth,
      };
    }

    return {
      eventType: "merchant_mystic",
      label: "Marchand",
      nextMerchantDepth: depth,
    };
  }

  if (roll < 0.52) {
    return {
      eventType: "battle",
      label: "Combat",
      nextMerchantDepth: lastMerchantDepth,
    };
  }

  if (roll < 0.58) {
    return {
      eventType: "rest",
      label: "Repos",
      nextMerchantDepth: lastMerchantDepth,
    };
  }

  if (roll < 0.74) {
    return {
      eventType: "treasure",
      label: "Trésor",
      nextMerchantDepth: lastMerchantDepth,
    };
  }

  if (roll < 0.90) {
    return {
      eventType: "random",
      label: "Événement",
      nextMerchantDepth: lastMerchantDepth,
    };
  }

  return {
    eventType: "scripted_shrine",
    label: "Autel",
    nextMerchantDepth: lastMerchantDepth,
  };
}

export function generateMap(): { nodes: MapNode[]; width: number } {
  const nodeList: MapNode[] = [];
  let idCounter = 0;

  const LANES_Y = [120, 600, 1080] as const;
  const START_X = 200;
  const TOTAL_LAYERS = 11;
  const LAYER_SPACING = 220;

  const shuffledBattles = [...BATTLE_NAMES].sort(() => Math.random() - 0.5);
  const shuffledBosses = [...BOSS_NAMES].sort(() => Math.random() - 0.5);

  let battleIdx = 0;
  let bossIdx = 0;
  let lastMerchantDepth: number | null = null;
  
  const getNode = (id: number) => nodeList.find((n) => n.id === id)!;

  const canConnect = (fromLane: number, toLane: number) => {
    return Math.abs(fromLane - toLane) <= 1;
  };

  const hasLink = (a: number, b: number) => getNode(a).neighbors.includes(b);

  const addLink = (a: number, b: number) => {
    if (!getNode(a).neighbors.includes(b)) getNode(a).neighbors.push(b);
    if (!getNode(b).neighbors.includes(a)) getNode(b).neighbors.push(a);
  };

  const wouldCross = (
    prevId: number,
    nextId: number,
    prevLayerIds: number[],
    nextLayerIds: number[]
  ) => {
    const a = getNode(prevId);
    const b = getNode(nextId);

    for (const pId of prevLayerIds) {
      const p = getNode(pId);

      for (const neighborId of p.neighbors) {
        if (!nextLayerIds.includes(neighborId)) continue;

        const q = getNode(neighborId);

        if (
          (p.id === a.id && q.id === b.id) ||
          (p.id === b.id && q.id === a.id)
        ) {
          continue;
        }

        const inverted =
          (a.lane < p.lane && b.lane > q.lane) ||
          (a.lane > p.lane && b.lane < q.lane);

        if (inverted) return true;
      }
    }

    return false;
  };

  const tryLinkNoCross = (
    prevId: number,
    nextId: number,
    prevLayerIds: number[],
    nextLayerIds: number[]
  ) => {
    if (hasLink(prevId, nextId)) return false;
    if (!canConnect(getNode(prevId).lane, getNode(nextId).lane)) return false;
    if (wouldCross(prevId, nextId, prevLayerIds, nextLayerIds)) return false;

    addLink(prevId, nextId);
    return true;
  };

  nodeList.push({
    id: idCounter++,
    x: START_X,
    y: LANES_Y[1],
    lane: 1,
    depth: 0,
    locationTheme: "forest",
    label: "Campement",
    type: "start",
    eventType: "none",
    neighbors: [],
  });

  const layers: number[][] = [[0]];

  for (let layer = 1; layer <= TOTAL_LAYERS; layer++) {
    const x = START_X + layer * LAYER_SPACING;

    const isFirstPlayableLayer = layer === 1;
    const isFinalBossLayer = layer === TOTAL_LAYERS;
    const isMidBossLayer = layer === Math.floor(TOTAL_LAYERS * 0.55);

    let lanes: Array<0 | 1 | 2> = [];

    if (isFirstPlayableLayer) {
      lanes = [0, 1, 2];
    } else if (isFinalBossLayer) {
      lanes = [1];
    } else if (isMidBossLayer) {
      lanes = [1];
    } else {
      const count = 1 + Math.floor(Math.random() * 3);
      lanes = ([0, 1, 2] as Array<0 | 1 | 2>)
        .sort(() => Math.random() - 0.5)
        .slice(0, count)
        .sort((a, b) => a - b) as Array<0 | 1 | 2>;

      if (lanes.length === 1 && Math.random() < 0.7) {
        const only = lanes[0];
        if (only === 0) lanes = [0, 1];
        else if (only === 2) lanes = [1, 2];
        else lanes = Math.random() < 0.5 ? [0, 1] : [1, 2];
      }
    }

    const currentLayerIds: number[] = [];

    for (const lane of lanes) {
    let type: NodeType = "step";
    let label: string | undefined;
    let eventType: EventType = "none";

    if (isFinalBossLayer) {
      type = "boss";
      eventType = "boss";
      label = "Boss";
    } else if (isMidBossLayer) {
      type = "boss";
      eventType = "boss";
      label = "Boss";
    } else {
      const picked = pickEventTypeForNode({
        depth: layer,
        isFinalBossLayer,
        isMidBossLayer,
        lastMerchantDepth,
      });

      eventType = picked.eventType;
      lastMerchantDepth = picked.nextMerchantDepth;

      if (eventType === "battle") {
        type = "normal";
        label = "Combat";
      } else if (eventType === "rest") {
        type = "normal";
        label = "Repos";
      } else if (eventType === "random") {
        type = "normal";
        label = "Événement";
      } else if (eventType === "treasure") {
        type = "normal";
        label = "Trésor";
      } else if (
        eventType === "merchant_blacksmith" ||
        eventType === "merchant_alchemist" ||
        eventType === "merchant_mystic"
      ) {
        type = "normal";
        label = "Marchand";
      } else if (eventType === "scripted_shrine") {
        type = "normal";
        label = "Autel";
      } else {
        type = "step";
        label = undefined;
      }
    }

      const nodeId = idCounter++;

    nodeList.push({
      id: nodeId,
      x,
      y: LANES_Y[lane],
      lane,
      depth: layer,
      label,
      type,
      eventType,
      locationTheme: pickLocationTheme(layer),
      neighbors: [],
    });

      currentLayerIds.push(nodeId);
    }

    layers.push(currentLayerIds);
  }

  for (let i = 0; i < layers.length - 1; i++) {
    const prevLayerIds = [...layers[i]].sort(
      (a, b) => getNode(a).lane - getNode(b).lane
    );
    const nextLayerIds = [...layers[i + 1]].sort(
      (a, b) => getNode(a).lane - getNode(b).lane
    );

    for (const prevId of prevLayerIds) {
      const prevNode = getNode(prevId);

      const candidates = nextLayerIds
        .filter((nextId) => canConnect(prevNode.lane, getNode(nextId).lane))
        .sort((a, b) => {
          const da = Math.abs(prevNode.lane - getNode(a).lane);
          const db = Math.abs(prevNode.lane - getNode(b).lane);
          return da - db;
        });

      let linked = false;

      for (const nextId of candidates) {
        if (tryLinkNoCross(prevId, nextId, prevLayerIds, nextLayerIds)) {
          linked = true;
          break;
        }
      }

      if (!linked && candidates.length > 0) {
        addLink(prevId, candidates[0]);
      }
    }

    for (const nextId of nextLayerIds) {
      const hasIncoming = getNode(nextId).neighbors.some((n) =>
        prevLayerIds.includes(n)
      );
      if (hasIncoming) continue;

      const nextNode = getNode(nextId);

      const candidates = prevLayerIds
        .filter((prevId) => canConnect(getNode(prevId).lane, nextNode.lane))
        .sort((a, b) => {
          const da = Math.abs(getNode(a).lane - nextNode.lane);
          const db = Math.abs(getNode(b).lane - nextNode.lane);
          return da - db;
        });

      let linked = false;

      for (const prevId of candidates) {
        if (tryLinkNoCross(prevId, nextId, prevLayerIds, nextLayerIds)) {
          linked = true;
          break;
        }
      }

      if (!linked && candidates.length > 0) {
        addLink(candidates[0], nextId);
      }
    }

    const bonusCandidates: Array<[number, number]> = [];

    for (const prevId of prevLayerIds) {
      for (const nextId of nextLayerIds) {
        if (hasLink(prevId, nextId)) continue;
        if (!canConnect(getNode(prevId).lane, getNode(nextId).lane)) continue;
        if (wouldCross(prevId, nextId, prevLayerIds, nextLayerIds)) continue;

        bonusCandidates.push([prevId, nextId]);
      }
    }

    if (bonusCandidates.length > 0 && Math.random() < 0.35) {
      const [a, b] =
        bonusCandidates[Math.floor(Math.random() * bonusCandidates.length)];
      addLink(a, b);
    }
  }

  const maxX = Math.max(...nodeList.map((n) => n.x));
  return { nodes: nodeList, width: maxX + 250 };
}