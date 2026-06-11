import type { Enemy, EnemyAttack, StatusEffectType } from "@/shared/types/game";

export type PartySizeBalanceProfile = {
  participantCount: number;
  targetEnemyCount: number | null;
  hpMultiplier: number;
  offenseMultiplier: number;
  attackPowerMultiplier: number;
  defenseMultiplier: number;
  speedMultiplier: number;
  statusValueMultiplier: number;
  statusDurationBonus: number;
  mode: "solo" | "duo" | "standard" | "large";
};

export type PartySizeBalanceResult = {
  enemies: Enemy[];
  profile: PartySizeBalanceProfile;
  logs: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scaleNumber(value: number, multiplier: number, min = 1) {
  return Math.max(min, Math.round(value * multiplier));
}

function isEliteEnemy(enemy: Enemy) {
  return enemy.sourceTag === "elite" || enemy.rewardCategory === "weapon" || enemy.rewardCategory === "armor" || enemy.rewardCategory === "relic";
}

function buildProfile(participantCount: number, enemies: Enemy[], isBossCombat: boolean): PartySizeBalanceProfile {
  const safeCount = Math.max(1, participantCount);
  const hasBoss = isBossCombat || enemies.some((enemy) => enemy.isBoss);
  const hasElite = enemies.some(isEliteEnemy);

  if (safeCount <= 1) {
    return {
      participantCount: safeCount,
      targetEnemyCount: hasBoss || hasElite ? null : 1,
      hpMultiplier: hasBoss ? 0.82 : hasElite ? 0.74 : 0.70,
      offenseMultiplier: hasBoss ? 0.9 : hasElite ? 0.84 : 0.86,
      attackPowerMultiplier: hasBoss ? 1.0 : hasElite ? 1.03 : 1.05,
      defenseMultiplier: hasBoss ? 0.9 : 0.82,
      speedMultiplier: hasBoss ? 1.0 : 0.96,
      statusValueMultiplier: hasBoss ? 0.9 : 0.82,
      statusDurationBonus: -1,
      mode: "solo",
    };
  }

  if (safeCount === 2) {
    return {
      participantCount: safeCount,
      targetEnemyCount: hasBoss || hasElite ? null : 2,
      hpMultiplier: hasBoss ? 0.9 : 0.84,
      offenseMultiplier: hasBoss ? 0.92 : 0.88,
      attackPowerMultiplier: hasBoss ? 1.0 : 1.02,
      defenseMultiplier: hasBoss ? 0.96 : 0.9,
      speedMultiplier: 0.98,
      statusValueMultiplier: 0.94,
      statusDurationBonus: 0,
      mode: "duo",
    };
  }

  if (safeCount >= 4) {
    return {
      participantCount: safeCount,
      targetEnemyCount: null,
      hpMultiplier: 1.02,
      offenseMultiplier: 1.0,
      attackPowerMultiplier: 1,
      defenseMultiplier: 1.02,
      speedMultiplier: 1,
      statusValueMultiplier: 1,
      statusDurationBonus: 0,
      mode: "large",
    };
  }

  return {
    participantCount: safeCount,
    targetEnemyCount: null,
    hpMultiplier: 1,
    offenseMultiplier: 1,
    attackPowerMultiplier: 1,
    defenseMultiplier: 1,
    speedMultiplier: 1,
    statusValueMultiplier: 1,
    statusDurationBonus: 0,
    mode: "standard",
  };
}

function scaleStatusValue(type: StatusEffectType, value: number, multiplier: number) {
  if (type === "silence" || type === "marked") return value;
  if (type === "shield" || type === "regen") return Math.max(1, Math.round(value * multiplier));
  return Math.max(1, Math.round(value * multiplier));
}

function scaleAttack(attack: EnemyAttack, profile: PartySizeBalanceProfile): EnemyAttack {
  const areaPenalty = attack.targetScope === "all_players"
    ? profile.mode === "solo"
      ? 0.92
      : profile.mode === "duo"
        ? 0.96
        : 0.98
    : 1;
  const burstPenalty = attack.powerMultiplier >= 1.25
    ? profile.mode === "solo"
      ? 1.0
      : profile.mode === "duo"
        ? 1.0
        : 1
    : 1;
  const nextStatus = attack.statusEffect
    ? {
        ...attack.statusEffect,
        value: scaleStatusValue(attack.statusEffect.type, attack.statusEffect.value, profile.statusValueMultiplier),
        duration: Math.max(1, attack.statusEffect.duration + profile.statusDurationBonus),
      }
    : undefined;

  return {
    ...attack,
    powerMultiplier: Number((attack.powerMultiplier * profile.attackPowerMultiplier * areaPenalty * burstPenalty).toFixed(2)),
    critChance: attack.critChance ? Number((attack.critChance * clamp(profile.offenseMultiplier, 0.55, 1.05)).toFixed(2)) : attack.critChance,
    manaBurn: attack.manaBurn ? Math.max(1, Math.round(attack.manaBurn * profile.statusValueMultiplier)) : attack.manaBurn,
    selfHealPercent: attack.selfHealPercent ? Number((attack.selfHealPercent * clamp(profile.hpMultiplier, 0.65, 1.05)).toFixed(2)) : attack.selfHealPercent,
    statusEffect: nextStatus,
    summons: attack.summons
      ? {
          ...attack.summons,
          count: profile.mode === "solo" ? 1 : profile.mode === "duo" ? Math.min(2, attack.summons.count) : attack.summons.count,
          hp: scaleNumber(attack.summons.hp, profile.hpMultiplier, 1),
          strength: scaleNumber(attack.summons.strength, profile.offenseMultiplier, 1),
          magic: scaleNumber(attack.summons.magic, profile.offenseMultiplier, 1),
          defense: Math.max(0, Math.round(attack.summons.defense * profile.defenseMultiplier)),
          speed: scaleNumber(attack.summons.speed, profile.speedMultiplier, 1),
        }
      : attack.summons,
  };
}

function scaleEnemy(enemy: Enemy, profile: PartySizeBalanceProfile): Enemy {
  const maxHp = scaleNumber(enemy.maxHp, profile.hpMultiplier, 1);
  const hpRatio = enemy.maxHp > 0 ? clamp(enemy.hp / enemy.maxHp, 0.05, 1) : 1;

  return {
    ...enemy,
    maxHp,
    hp: Math.max(1, Math.round(maxHp * hpRatio)),
    strength: scaleNumber(enemy.strength, profile.offenseMultiplier, 1),
    magic: scaleNumber(enemy.magic, profile.offenseMultiplier, 1),
    defense: Math.max(0, Math.round(enemy.defense * profile.defenseMultiplier)),
    speed: scaleNumber(enemy.speed, profile.speedMultiplier, 1),
    attacks: enemy.attacks.map((attack) => scaleAttack(attack, profile)),
  };
}

function trimEnemyGroup(enemies: Enemy[], profile: PartySizeBalanceProfile) {
  if (!profile.targetEnemyCount || enemies.length <= profile.targetEnemyCount) return enemies;

  return [...enemies]
    .sort((left, right) => right.maxHp + right.strength + right.magic - (left.maxHp + left.strength + left.magic))
    .slice(0, profile.targetEnemyCount);
}

export function balanceEnemiesForPartySize(params: {
  enemies: Enemy[];
  participantCount: number;
  isBossCombat: boolean;
}): PartySizeBalanceResult {
  const profile = buildProfile(params.participantCount, params.enemies, params.isBossCombat);

  if (profile.mode === "standard") {
    return { enemies: params.enemies, profile, logs: [] };
  }

  const trimmed = trimEnemyGroup(params.enemies, profile);
  const enemies = trimmed.map((enemy) => scaleEnemy(enemy, profile));
  const removed = params.enemies.length - trimmed.length;
  void removed;

  return { enemies, profile, logs: [] };
}
