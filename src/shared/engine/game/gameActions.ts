import { ClassType, MapNode, Player } from "@/shared/types/game";
import { PreparedFloorState } from "./floorEngine";

export type GameEndOutcome = "victory" | "defeat";

export type GameAction =
  | { type: "ADD_PLAYER"; name: string; classType: ClassType }
  | { type: "REMOVE_PLAYER"; playerId: number }
  | { type: "START_RUN"; runSeed: string; floorState: PreparedFloorState }
  | { type: "CONTINUE_RUN" }
  | { type: "MOVE_PLAYER"; playerId: number; nodeId: number; previousNode?: number | null; revealAroundTarget?: boolean }
  | { type: "SET_PLAYERS"; players: Player[] }
  | { type: "UPDATE_PLAYER"; playerId: number; player: Player }
  | { type: "UPDATE_CURRENT_PLAYER"; player: Player }
  | { type: "SET_CURRENT_PLAYER_INDEX"; playerIndex: number }
  | { type: "START_COMBAT"; nodeId: number; participantPlayerIds: number[] }
  | { type: "CONSUME_NODE"; nodeId: number }
  | { type: "RESOLVE_NODE"; nodeId: number; label?: string }
  | { type: "SET_NODES"; nodes: MapNode[] }
  | { type: "ADD_CORRUPTION_CHARGE"; amount: number }
  | { type: "SET_CORRUPTION"; level: number; charge: number; corruptedNodeIds: number[] }
  | { type: "SET_CURRENT_FLOOR_STATUES"; count: number }
  | { type: "INCREMENT_FLOOR_STATUES"; max: number }
  | { type: "END_TURN"; nextPlayerIndex: number; floorCorruptionTurn: number; corruptedNodeIds?: number[] }
  | { type: "ADVANCE_FLOOR"; floorState: PreparedFloorState }
  | { type: "END_RUN"; outcome: GameEndOutcome };

export const GAME_ACTION_LABELS: Record<GameAction["type"], string> = {
  ADD_PLAYER: "Ajouter un héros",
  REMOVE_PLAYER: "Retirer un héros",
  START_RUN: "Démarrer une run",
  CONTINUE_RUN: "Continuer une run",
  MOVE_PLAYER: "Déplacer un héros",
  SET_PLAYERS: "Synchroniser les héros",
  UPDATE_PLAYER: "Mettre à jour un héros",
  UPDATE_CURRENT_PLAYER: "Mettre à jour le héros actif",
  SET_CURRENT_PLAYER_INDEX: "Changer de héros actif",
  START_COMBAT: "Démarrer un combat",
  CONSUME_NODE: "Consommer un nœud",
  RESOLVE_NODE: "Résoudre un nœud",
  SET_NODES: "Synchroniser la carte",
  ADD_CORRUPTION_CHARGE: "Ajouter de la corruption",
  SET_CORRUPTION: "Synchroniser la corruption",
  SET_CURRENT_FLOOR_STATUES: "Synchroniser les statuettes",
  INCREMENT_FLOOR_STATUES: "Ajouter une statuette",
  END_TURN: "Finir le tour",
  ADVANCE_FLOOR: "Passer à l’étage suivant",
  END_RUN: "Terminer la run",
};

export type GameActionLogEntry = {
  id: string;
  type: GameAction["type"];
  label: string;
  createdAt: number;
};

export function describeGameAction(action: GameAction) {
  return GAME_ACTION_LABELS[action.type];
}
