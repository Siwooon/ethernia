import { FLOORS, FloorBiome } from "@/shared/data/floors";
import { MapNode, Player, PlayerEquipment } from "@/shared/types/game";
import { createRevealedFloorMap } from "@/shared/engine/map/mapEngine";
import { EtherniaRunSave, NewRunMapState, RuntimeResetState } from "./gameTypes";
import { GameRandom, createRunSeed, mathRandom, randomPick } from "@/shared/platform/random";

export const MAX_PLAYERS = 4;
export const REQUIRED_STATUES = 2;
export const FLOOR_CORRUPTION_START_DELAY = 12;
export const FLOOR_CORRUPTION_INTERVAL = 6;
export const CORRUPTION_CHARGE_MAX = 100;

export const DEFAULT_RUNTIME_RESET_STATE: RuntimeResetState = {
  phase: "MOVE",
  pendingChoiceContext: null,
  pendingEventNodeId: null,
  pendingNodeInteraction: null,
  combatParticipants: [],
};

export function pickFloorBiome(floorData: (typeof FLOORS)[number] | undefined, rng: GameRandom = mathRandom): FloorBiome {
  const biomes = floorData?.biomePool ?? ["forest"];
  return randomPick(rng, biomes) as FloorBiome;
}

export function getBossWeakeningLabel(statues: number) {
  if (statues >= REQUIRED_STATUES) return "Boss normal";
  if (statues === 1) return "Boss partiellement affaibli";
  return "Boss déchaîné";
}

export function getCorruptionLevelLabel(level: number) {
  if (level >= 4) return "Apocalypse";
  if (level >= 3) return "Critique";
  if (level >= 2) return "Instable";
  if (level >= 1) return "Présente";
  return "Dormante";
}

export function shouldExpandFloorCorruption(turn: number) {
  return (
    turn >= FLOOR_CORRUPTION_START_DELAY &&
    (turn - FLOOR_CORRUPTION_START_DELAY) % FLOOR_CORRUPTION_INTERVAL === 0
  );
}

export function buildRunSaveSnapshot(input: EtherniaRunSave): EtherniaRunSave {
  return {
    runSeed: input.runSeed,
    players: input.players,
    currentPlayerIndex: input.currentPlayerIndex,
    currentFloor: input.currentFloor,
    currentFloorBiome: input.currentFloorBiome,
    nodes: input.nodes,
    mapWidth: input.mapWidth,
    mapHeight: input.mapHeight,
    previousNode: input.previousNode,
    corruptionLevel: input.corruptionLevel,
    corruptionCharge: input.corruptionCharge,
    corruptedNodeIds: input.corruptedNodeIds,
    floorCorruptionTurn: input.floorCorruptionTurn,
    currentFloorStatues: input.currentFloorStatues,
    veilRelics: input.veilRelics ?? [],
  };
}

function normalizePlayerEquipment(equipment: Partial<PlayerEquipment> | undefined): PlayerEquipment {
  return {
    weapon: equipment?.weapon ?? null,
    offhand: equipment?.offhand ?? null,
    armor: equipment?.armor ?? null,
    amulet: equipment?.amulet ?? null,
    ring: equipment?.ring ?? null,
    relic: equipment?.relic ?? null,
  };
}

export function normalizeLoadedRun(savedRun: EtherniaRunSave): EtherniaRunSave {
  return {
    ...savedRun,
    runSeed: savedRun.runSeed ?? createRunSeed(),
    players: (savedRun.players ?? []).map((player) => ({
      ...player,
      inventory: player.inventory ?? [],
      equipment: normalizePlayerEquipment(player.equipment),
    })),
    currentPlayerIndex: Math.min(
      savedRun.currentPlayerIndex,
      Math.max(savedRun.players.length - 1, 0)
    ),
    veilRelics: savedRun.veilRelics ?? [],
  };
}

export function createNewRunMapState(params: {
  biome: FloorBiome;
  generated: { nodes: MapNode[]; width: number; height: number };
}): NewRunMapState {
  const floorMap = createRevealedFloorMap(params.generated);

  return {
    currentFloorBiome: params.biome,
    nodes: floorMap.nodes,
    mapWidth: floorMap.mapWidth,
    mapHeight: floorMap.mapHeight,
    startNodeId: floorMap.startNodeId,
    corruptionLevel: 0,
    corruptionCharge: 0,
    corruptedNodeIds: [floorMap.startNodeId],
    floorCorruptionTurn: 0,
    currentFloorStatues: 0,
  };
}

export function movePlayersToStartNode(players: Player[], startNodeId: number): Player[] {
  return players.map((p) => ({
    ...p,
    currentNode: startNodeId,
  }));
}
