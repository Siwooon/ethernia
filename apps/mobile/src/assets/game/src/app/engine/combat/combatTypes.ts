import {
  Enemy,
  EnemyAttack,
  Player,
  Stats,
  StatusEffect,
} from "@/app/component/types/game";

export type CombatPlayerState = {
  playerId: number;
  player: Player;
  stats: Stats;
  statuses: StatusEffect[];
  defending: boolean;
  isDead: boolean;
};

export type CombatEnemyState = {
  enemyId: string;
  enemy: Enemy;
  stats: Stats;
  statuses: StatusEffect[];
  isDead: boolean;
};

export type CombatResultPlayer = {
  playerId: number;
  stats: Stats;
  statuses: StatusEffect[];
  isDead: boolean;
};

export type TurnEntry = {
  id: string;
  kind: "player" | "enemy";
  entityId: number | string;
  speed: number;
};

export type PlannedEnemyAction = {
  enemyId: string;
  enemy: Enemy;
  enemyStatuses: StatusEffect[];
  attack: EnemyAttack;
  logs: string[];
  targetIds: number[];
  preferredTargetPlayerId: number | null;
};

export type EnemyIntentionView = {
  enemyId: string;
  enemyName: string;
  icon: string;
  tone: "attack" | "magic" | "support" | "danger";
  actionName: string;
  description?: string;
  targetLabel: string;
  damageLabel: string;
  effectLabel?: string;
  isArea: boolean;
  isBoss: boolean;
};
