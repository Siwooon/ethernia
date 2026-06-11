import { Enemy, EnemyAttack, EnemyTargetScope, PlayerSkill, Stats, StatusEffect } from "@/shared/types/game";
import { CombatPlayerState } from "./combatTypes";
import {
  computeEnemyDamage,
  computePlayerBasicAttackDamage,
  computePlayerSkillDamage,
} from "./damage";
import { GameRandom, mathRandom, randomChance, randomPick } from "@/shared/platform/random";
import { resolveMarkedDamage, resolveShieldDamage } from "./statuses";

export type PlayerAttackResolution = {
  damage: number;
  crit: boolean;
  logMessage: string;
};

export type PlayerSkillResolution = {
  damage: number;
  crit: boolean;
  triggeredConditions: string[];
  logMessage: string;
};

export function resolvePlayerBasicAttack(params: {
  playerName: string;
  stats: Stats;
  enemy: Enemy;
  enemyStatuses: StatusEffect[];
  rng?: GameRandom;
}): PlayerAttackResolution {
  const result = computePlayerBasicAttackDamage(
    params.stats,
    params.enemy,
    params.enemyStatuses,
    params.rng ?? mathRandom,
  );

  return {
    damage: result.dmg,
    crit: result.crit,
    logMessage: result.crit
      ? `⚔️ ${params.playerName} — Attaque critique sur ${params.enemy.name} ! -${result.dmg} PV`
      : `⚔️ ${params.playerName} attaque ${params.enemy.name} : -${result.dmg} PV`,
  };
}

export function resolvePlayerSkill(params: {
  skill: PlayerSkill;
  playerName: string;
  stats: Stats;
  enemy: Enemy;
  playerStatuses: StatusEffect[];
  enemyStatuses: StatusEffect[];
}): PlayerSkillResolution {
  const result = computePlayerSkillDamage(
    params.skill,
    params.stats,
    params.enemy,
    params.playerStatuses,
    params.enemyStatuses,
  );

  return {
    damage: result.dmg,
    crit: result.crit,
    triggeredConditions: result.triggeredConditions,
    logMessage: `${params.skill.icon} ${params.playerName} — ${params.skill.name} sur ${params.enemy.name} : -${result.dmg} PV${
      result.crit ? " 💥 CRITIQUE !" : ""
    }`,
  };
}

export function pickEnemyTargetIds(params: {
  targetScope?: EnemyTargetScope;
  plannedTargetIds: number[];
  livingAllies: CombatPlayerState[];
  rng?: GameRandom;
}): { targetIds: number[]; usedFallback: boolean; fallbackTargetName?: string } {
  if (params.targetScope === "all_players") {
    return {
      targetIds: params.livingAllies.map((ally) => ally.playerId),
      usedFallback: false,
    };
  }

  const plannedLivingTargetIds = params.plannedTargetIds.filter((targetId) =>
    params.livingAllies.some(
      (ally) => ally.playerId === targetId && !ally.isDead && ally.stats.hp > 0,
    ),
  );

  if (plannedLivingTargetIds.length > 0) {
    return { targetIds: plannedLivingTargetIds, usedFallback: false };
  }

  if (params.livingAllies.length === 0) {
    return { targetIds: [], usedFallback: false };
  }

  const fallbackTarget = randomPick(params.rng ?? mathRandom, params.livingAllies);

  return {
    targetIds: [fallbackTarget.playerId],
    usedFallback: true,
    fallbackTargetName: fallbackTarget.player.name,
  };
}

export function shouldApplyChance(chance: number | undefined, rng: GameRandom = mathRandom) {
  return chance === undefined || randomChance(rng, chance);
}

export function applyFeralHeartPhaseTransition(enemy: Enemy): {
  enemy: Enemy;
  transitioned: boolean;
} {
  if (
    enemy.isBoss &&
    enemy.bossMechanic === "feral_heart" &&
    (enemy.bossState?.phase ?? 1) === 1 &&
    enemy.maxHp > 0 &&
    enemy.hp / enemy.maxHp <= 0.5
  ) {
    return {
      transitioned: true,
      enemy: {
        ...enemy,
        strength: enemy.strength + 3,
        speed: enemy.speed + 2,
        bossState: {
          ...enemy.bossState!,
          phase: 2,
        },
      },
    };
  }

  return { enemy, transitioned: false };
}


export type DamageableStats = Pick<Stats, "hp" | "maxHp">;

export type DamageApplicationResult<TStats extends DamageableStats> = {
  stats: TStats;
  statuses: StatusEffect[];
  absorbed: number;
  remainingDamage: number;
  hpLost: number;
  shieldAfter: number;
  markedConsumed: boolean;
  damageAfterMarked: number;
};

export function applyIncomingDamageToStats<TStats extends DamageableStats>(params: {
  stats: TStats;
  statuses: StatusEffect[];
  damage: number;
  allowMarked?: boolean;
}): DamageApplicationResult<TStats> {
  let statuses = [...params.statuses];
  let damage = Math.max(0, params.damage);
  let markedConsumed = false;

  if (params.allowMarked ?? true) {
    const marked = resolveMarkedDamage(statuses);
    statuses = marked.statuses;
    markedConsumed = marked.consumed;
    damage *= marked.damageMultiplier;
  }

  const shield = resolveShieldDamage(statuses, damage);
  statuses = shield.statuses;

  const hpBefore = params.stats.hp;
  const nextHp = Math.max(0, hpBefore - shield.remainingDamage);
  const hpLost = Math.max(0, hpBefore - nextHp);

  return {
    stats: { ...params.stats, hp: nextHp },
    statuses,
    absorbed: shield.absorbed,
    remainingDamage: shield.remainingDamage,
    hpLost,
    shieldAfter: shield.shieldAfter,
    markedConsumed,
    damageAfterMarked: damage,
  };
}

export function applyHealingToStats<TStats extends DamageableStats>(params: {
  stats: TStats;
  amount: number;
}): { stats: TStats; healed: number } {
  const healAmount = Math.max(0, params.amount);
  const hpBefore = params.stats.hp;
  const nextHp = Math.min(params.stats.maxHp, hpBefore + healAmount);

  return {
    stats: { ...params.stats, hp: nextHp },
    healed: Math.max(0, nextHp - hpBefore),
  };
}

export type EnemyAttackTargetResolution = {
  damage: number;
  crit: boolean;
  hpLost: number;
  absorbed: number;
  remainingDamage: number;
  shieldAfter: number;
  markedConsumed: boolean;
  stats: Stats;
  statuses: StatusEffect[];
};

export function resolveEnemyAttackAgainstPlayer(params: {
  attack: EnemyAttack;
  enemy: Enemy;
  targetStats: Stats;
  targetStatuses: StatusEffect[];
  targetDefending: boolean;
  rng?: GameRandom;
}): EnemyAttackTargetResolution {
  const damageResult = computeEnemyDamage(
    params.attack,
    params.enemy,
    params.targetStats,
    params.targetStatuses,
    params.targetDefending,
    params.rng ?? mathRandom,
  );

  const applied = applyIncomingDamageToStats({
    stats: params.targetStats,
    statuses: params.targetStatuses,
    damage: damageResult.damage,
  });

  return {
    damage: damageResult.damage,
    crit: damageResult.crit,
    hpLost: applied.hpLost,
    absorbed: applied.absorbed,
    remainingDamage: applied.remainingDamage,
    shieldAfter: applied.shieldAfter,
    markedConsumed: applied.markedConsumed,
    stats: applied.stats,
    statuses: applied.statuses,
  };
}

export function mergeEnemyStats(enemy: Enemy, stats: Stats): Enemy {
  return {
    ...enemy,
    hp: stats.hp,
    maxHp: stats.maxHp,
    strength: stats.strength,
    magic: stats.magic,
    defense: stats.defense,
    speed: stats.speed,
  };
}
