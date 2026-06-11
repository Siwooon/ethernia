import { CombatAction, describeCombatAction } from "./combatActions";
import { CombatState } from "./combatState";

export type CombatReducerResult = {
  state: CombatState;
  trace: string;
};

export function applyCombatAction(state: CombatState, action: CombatAction): CombatReducerResult {
  const trace = describeCombatAction(action);

  switch (action.type) {
    case "SELECT_TARGET":
      return { state: { ...state, selectedEnemyId: action.enemyId, lastAction: action.type }, trace };

    case "SELECT_SKILL":
      return { state: { ...state, selectedSkillId: action.skillId, lastAction: action.type }, trace };

    case "PLAN_ENEMY_ACTIONS":
      return { state: { ...state, plannedEnemyActions: action.plans, lastAction: action.type }, trace };

    case "APPLY_ROUND_EFFECTS":
      return { state: { ...state, roundCount: action.round, lastAction: action.type }, trace };

    case "END_COMBAT":
      return { state: { ...state, phase: "ended", lastAction: action.type }, trace };

    default:
      return { state: { ...state, lastAction: action.type }, trace };
  }
}
