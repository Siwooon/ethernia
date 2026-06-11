import { ClassType } from "@/app/component/types/game";

export type GameAction =
  | { type: "ADD_PLAYER"; name: string; classType: ClassType }
  | { type: "START_RUN" }
  | { type: "CONTINUE_RUN" }
  | { type: "MOVE_PLAYER"; playerId: number; nodeId: number }
  | { type: "START_COMBAT"; nodeId: number; participantPlayerIds: number[] }
  | { type: "RESOLVE_NODE"; nodeId: number }
  | { type: "END_TURN" }
  | { type: "ADVANCE_FLOOR" }
  | { type: "END_RUN"; outcome: "victory" | "defeat" };

export const GAME_ACTION_LABELS: Record<GameAction["type"], string> = {
  ADD_PLAYER: "Ajouter un héros",
  START_RUN: "Démarrer une run",
  CONTINUE_RUN: "Continuer une run",
  MOVE_PLAYER: "Déplacer un héros",
  START_COMBAT: "Démarrer un combat",
  RESOLVE_NODE: "Résoudre un nœud",
  END_TURN: "Finir le tour",
  ADVANCE_FLOOR: "Passer à l’étage suivant",
  END_RUN: "Terminer la run",
};
