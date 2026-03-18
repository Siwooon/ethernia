import { MapEffect, Player, StatusEffect } from "@/app/component/types/game";
import { addStatus } from "@/app/component/lib/statusEffects";

export function addMapEffect(
  effects: MapEffect[],
  newEffect: MapEffect
): MapEffect[] {
  const existing = effects.find((e) => e.type === newEffect.type);

  if (!existing) {
    return [...effects, newEffect];
  }

  return effects.map((e) =>
    e.type === newEffect.type
      ? {
          ...e,
          value: Math.max(e.value, newEffect.value),
          duration: Math.max(e.duration, newEffect.duration),
        }
      : e
  );
}

export function tickMapEffects(effects: MapEffect[]): MapEffect[] {
  return effects
    .map((effect) => ({
      ...effect,
      duration: effect.duration - 1,
    }))
    .filter((effect) => effect.duration > 0);
}

export function removeMapEffect(
  effects: MapEffect[],
  type: MapEffect["type"]
): MapEffect[] {
  return effects.filter((effect) => effect.type !== type);
}

export function hasMapEffect(
  effects: MapEffect[],
  type: MapEffect["type"]
) {
  return effects.some((effect) => effect.type === type);
}

export function getMapEffectValue(
  effects: MapEffect[],
  type: MapEffect["type"]
) {
  return effects
    .filter((effect) => effect.type === type)
    .reduce((sum, effect) => sum + effect.value, 0);
}

export function applyEndTurnMapEffects(player: Player) {
  let updatedPlayer = { ...player };
  const logs: string[] = [];

  for (const effect of player.mapEffects) {
    if (effect.type === "infection") {
      updatedPlayer = {
        ...updatedPlayer,
        stats: {
          ...updatedPlayer.stats,
          hp: Math.max(1, updatedPlayer.stats.hp - effect.value),
        },
      };
      logs.push(`☣️ Infection : -${effect.value} PV`);
    }
  }

  updatedPlayer = {
    ...updatedPlayer,
    mapEffects: tickMapEffects(updatedPlayer.mapEffects),
  };

  return {
    player: updatedPlayer,
    logs,
  };
}

export function applyMapEffectsToPlayerStats(player: Player) {
  const woundPenalty = getMapEffectValue(player.mapEffects, "wound");
  const blessingBonus = getMapEffectValue(player.mapEffects, "blessing");

  const effectiveMaxHp = Math.max(1, player.stats.maxHp - woundPenalty);

  return {
    ...player.stats,
    maxHp: effectiveMaxHp,
    hp: Math.min(player.stats.hp, effectiveMaxHp),
    magic: player.stats.magic + blessingBonus,
  };
}

export function consumeCombatMapEffects(player: Player): Player {
  return {
    ...player,
    mapEffects: player.mapEffects
      .map((effect) => {
        if (effect.type === "blessing" || effect.type === "protection") {
          return { ...effect, duration: effect.duration - 1 };
        }
        return effect;
      })
      .filter((effect) => effect.duration > 0),
  };
}

export function applyCombatStartMapEffects(player: Player) {
  let statuses: StatusEffect[] = [];

  const protection = player.mapEffects.find((e) => e.type === "protection");
  if (protection) {
    statuses = addStatus(statuses, {
      type: "shield",
      value: protection.value,
      duration: 1,
      source: "protection",
    });
  }

  return statuses;
}