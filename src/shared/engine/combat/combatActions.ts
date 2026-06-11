import { PlayerSkill } from "@/shared/types/game";
import { CombatResultPlayer, PlannedEnemyAction } from "./combatTypes";

export type CombatAction =
  | { type: "SELECT_TARGET"; enemyId: string | null }
  | { type: "SELECT_SKILL"; skillId: string }
  | { type: "PLAYER_BASIC_ATTACK"; playerId: number; targetEnemyId: string }
  | {
      type: "PLAYER_USE_SKILL";
      playerId: number;
      targetEnemyId: string;
      skillId: string;
      skill?: Pick<PlayerSkill, "name" | "manaCost">;
    }
  | { type: "PLAYER_DEFEND"; playerId: number }
  | { type: "PLAYER_FLEE"; playerId: number }
  | { type: "END_PLAYER_TURN"; playerId: number }
  | { type: "PLAN_ENEMY_ACTIONS"; plans: Record<string, PlannedEnemyAction> }
  | { type: "EXECUTE_ENEMY_TURN"; enemyId: string; plan?: PlannedEnemyAction }
  | { type: "END_ENEMY_TURN"; enemyId: string }
  | { type: "APPLY_ROUND_EFFECTS"; round: number }
  | { type: "END_COMBAT"; result: "victory" | "defeat" | "flee"; players: CombatResultPlayer[] };

export type CombatActionKind = CombatAction["type"];

export function describeCombatAction(action: CombatAction): string {
  switch (action.type) {
    case "SELECT_TARGET":
      return action.enemyId ? `Cible sélectionnée: ${action.enemyId}` : "Cible désélectionnée";
    case "SELECT_SKILL":
      return action.skillId ? `Compétence sélectionnée: ${action.skillId}` : "Compétence réinitialisée";
    case "PLAYER_BASIC_ATTACK":
      return `Attaque de base joueur ${action.playerId} -> ${action.targetEnemyId}`;
    case "PLAYER_USE_SKILL":
      return `Compétence ${action.skill?.name ?? action.skillId} joueur ${action.playerId} -> ${action.targetEnemyId}`;
    case "PLAYER_DEFEND":
      return `Défense joueur ${action.playerId}`;
    case "PLAYER_FLEE":
      return `Fuite joueur ${action.playerId}`;
    case "END_PLAYER_TURN":
      return `Fin du tour joueur ${action.playerId}`;
    case "PLAN_ENEMY_ACTIONS":
      return `${Object.keys(action.plans).length} action(s) ennemie(s) planifiée(s)`;
    case "EXECUTE_ENEMY_TURN":
      return `Tour ennemi ${action.enemyId}`;
    case "END_ENEMY_TURN":
      return `Fin du tour ennemi ${action.enemyId}`;
    case "APPLY_ROUND_EFFECTS":
      return `Effets de fin de round ${action.round}`;
    case "END_COMBAT":
      return `Fin du combat: ${action.result}`;
  }
}
