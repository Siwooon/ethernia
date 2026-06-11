import { FloorBiome } from "@/app/component/data/floors";
import { MapNode, Player } from "@/app/component/types/game";

export type GamePhase = "MOVE" | "EVENT" | "COMBAT";

export type PendingChoiceContext =
  | { type: "statuette"; corrupted?: boolean }
  | { type: "rest"; corrupted: boolean }
  | { type: "treasure"; corrupted: boolean }
  | { type: "shrine"; corrupted: boolean }
  | { type: "random"; corrupted: boolean };

export type PendingNodeInteraction = {
  nodeId: number;
  playerIndex: number;
};

export type EtherniaRunSave = {
  players: Player[];
  currentPlayerIndex: number;
  currentFloor: number;
  currentFloorBiome: FloorBiome;
  nodes: MapNode[];
  mapWidth: number;
  mapHeight: number;
  previousNode: number | null;
  corruptionLevel: number;
  corruptionCharge: number;
  corruptedNodeIds: number[];
  floorCorruptionTurn: number;
  currentFloorStatues: number;
};

export type RuntimeResetState = {
  phase: GamePhase;
  pendingChoiceContext: PendingChoiceContext | null;
  pendingEventNodeId: number | null;
  pendingNodeInteraction: PendingNodeInteraction | null;
  combatParticipants: number[];
};

export type NewRunMapState = {
  currentFloorBiome: FloorBiome;
  nodes: MapNode[];
  mapWidth: number;
  mapHeight: number;
  startNodeId: number;
  corruptionLevel: number;
  corruptionCharge: number;
  corruptedNodeIds: number[];
  floorCorruptionTurn: number;
  currentFloorStatues: number;
};
