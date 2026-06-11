import {
  Enemy,
  EnemyAttack,
  PlayerSkill,
  Stats,
  StatusEffect,
} from "@/app/component/types/game";
import { getDebuffMultiplier } from "@/app/component/lib/statusEffects";

export type EnemyDamageResult = {
  damage: number;
  crit: boolean;
};

export type PlayerSkillDamageResult = {
  dmg: number;
  crit: boolean;
  triggeredConditions: string[];
};

export function computeEnemyDamage(
  attack: EnemyAttack,
  enemyData: Enemy,
  playerData: Stats,
  targetStatuses: StatusEffect[],
  targetDefending: boolean,
): EnemyDamageResult {
  let raw = 0;

  if (attack.kind === "physical") {
    raw = enemyData.strength * attack.powerMultiplier;
  } else if (attack.kind === "magical") {
    raw = enemyData.magic * attack.powerMultiplier;
  } else {
    raw = (enemyData.strength + enemyData.magic) * 0.5 * attack.powerMultiplier;
  }

  raw = Math.floor(raw * (0.9 + Math.random() * 0.25));
  const reducedByDefense = Math.max(
    1,
    raw - Math.floor(playerData.defense / 3),
  );
  const vulnerabilityMultiplier = getDebuffMultiplier(
    targetStatuses,
    "vulnerability",
  );

  let final = Math.max(
    1,
    Math.floor(reducedByDefense * vulnerabilityMultiplier),
  );

  if (targetDefending) {
    final = Math.max(1, Math.floor(final * 0.3));
  }

  const critChance =
    attack.critChance ?? (enemyData.archetype === "assassin" ? 0.18 : 0.08);
  const crit = Math.random() < critChance;

  if (crit) final *= 2;

  return { damage: final, crit };
}

export function computePlayerSkillDamage(
  skill: PlayerSkill,
  stats: Stats,
  enemyData: Enemy,
  playerStatuses: StatusEffect[],
  enemyStatuses: StatusEffect[],
): PlayerSkillDamageResult {
  let base = 0;

  if (skill.scaling === "strength") base = stats.strength * skill.multiplier;
  else if (skill.scaling === "magic") base = stats.magic * skill.multiplier;
  else base = (stats.strength + stats.magic) * 0.5 * skill.multiplier;

  let bonusFlat = 0;
  let bonusMultiplier = 0;
  const triggeredConditions: string[] = [];

  for (const condition of skill.conditions ?? []) {
    if (condition.type === "target_status") {
      const ok = enemyStatuses.some(
        (status) => status.type === condition.status,
      );
      if (ok) {
        bonusFlat += condition.bonusFlat ?? 0;
        bonusMultiplier += condition.bonusMultiplier ?? 0;
        triggeredConditions.push(`cible ${condition.status}`);
      }
    }

    if (
      condition.type === "self_hp_below" &&
      condition.threshold !== undefined &&
      stats.hp / stats.maxHp <= condition.threshold
    ) {
      bonusFlat += condition.bonusFlat ?? 0;
      bonusMultiplier += condition.bonusMultiplier ?? 0;
      triggeredConditions.push("PV bas");
    }

    if (
      condition.type === "self_mana_above" &&
      condition.threshold !== undefined &&
      stats.mana / stats.maxMana >= condition.threshold
    ) {
      bonusFlat += condition.bonusFlat ?? 0;
      bonusMultiplier += condition.bonusMultiplier ?? 0;
      triggeredConditions.push("mana élevé");
    }

    if (
      condition.type === "target_hp_below" &&
      condition.threshold !== undefined &&
      enemyData.hp / enemyData.maxHp <= condition.threshold
    ) {
      bonusFlat += condition.bonusFlat ?? 0;
      bonusMultiplier += condition.bonusMultiplier ?? 0;
      triggeredConditions.push("cible affaiblie");
    }

    if (condition.type === "self_has_status") {
      const ok = playerStatuses.some(
        (status) => status.type === condition.status,
      );
      if (ok) {
        bonusFlat += condition.bonusFlat ?? 0;
        bonusMultiplier += condition.bonusMultiplier ?? 0;
        triggeredConditions.push(`self ${condition.status}`);
      }
    }
  }

  let dmg = Math.floor(base * (1 + bonusMultiplier) + bonusFlat);

  if (!skill.ignoreDefense) {
    dmg = Math.max(1, dmg - Math.floor(enemyData.defense / 2));
  }

  const crit = !!skill.guaranteedCrit;
  if (crit) dmg *= 2;

  const vulnerabilityMultiplier = getDebuffMultiplier(
    enemyStatuses,
    "vulnerability",
  );
  dmg = Math.max(1, Math.floor(dmg * vulnerabilityMultiplier));

  return { dmg, crit, triggeredConditions };
}
