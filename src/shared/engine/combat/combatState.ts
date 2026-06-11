import { CombatEnemyState, CombatPlayerState, PlannedEnemyAction, TurnEntry } from "./combatTypes";

export type CombatPhase = "waiting" | "animating" | "ended";

export type CombatState = {
  allies: CombatPlayerState[];
  enemies: CombatEnemyState[];
  selectedEnemyId: string | null;
  selectedSkillId: string;
  turnOrder: TurnEntry[];
  activeTurnIndex: number;
  roundCount: number;
  phase: CombatPhase;
  plannedEnemyActions: Record<string, PlannedEnemyAction>;
  logs: string[];
  lastAction?: string;
};

export function createCombatStateSnapshot(params: {
  allies: CombatPlayerState[];
  enemies: CombatEnemyState[];
  selectedEnemyId: string | null;
  selectedSkillId: string;
  turnOrder: TurnEntry[];
  activeTurnIndex: number;
  roundCount: number;
  phase: CombatPhase;
  plannedEnemyActions: Record<string, PlannedEnemyAction>;
  logs: string[];
}): CombatState {
  return { ...params };
}
