import { MapEffect, Player, StatusEffect } from "@/shared/types/game";
import { addStatus } from "@/shared/lib/statusEffects";

export function addMapEffect(
  effects: MapEffect[] | undefined,
  newEffect: MapEffect
): MapEffect[] {
  const safeEffects = effects ?? [];
  const existing = safeEffects.find((e) => e.type === newEffect.type);

  if (!existing) {
    return [...safeEffects, newEffect];
  }

  return safeEffects.map((e) =>
    e.type === newEffect.type
      ? {
          ...e,
          value: Math.max(e.value, newEffect.value),
          duration: Math.max(e.duration, newEffect.duration),
        }
      : e
  );
}

export function tickMapEffects(effects: MapEffect[] | undefined): MapEffect[] {
  return (effects ?? [])
    .map((effect) => ({
      ...effect,
      duration: effect.duration - 1,
    }))
    .filter((effect) => effect.duration > 0);
}

export function removeMapEffect(
  effects: MapEffect[] | undefined,
  type: MapEffect["type"]
): MapEffect[] {
  return (effects ?? []).filter((effect) => effect.type !== type);
}

export function hasMapEffect(
  effects: MapEffect[] | undefined,
  type: MapEffect["type"]
) {
  return (effects ?? []).some((effect) => effect.type === type);
}

export function getMapEffectValue(
  effects: MapEffect[] | undefined,
  type: MapEffect["type"]
) {
  return (effects ?? [])
    .filter((effect) => effect.type === type)
    .reduce((sum, effect) => sum + effect.value, 0);
}

export function applyEndTurnMapEffects(player: Player) {
  let updatedPlayer = { ...player };
  const logs: string[] = [];

  for (const effect of player.mapEffects ?? []) {
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
    mapEffects: tickMapEffects(updatedPlayer.mapEffects ?? []),
  };

  return {
    player: updatedPlayer,
    logs,
  };
}

export function applyMapEffectsToPlayerStats(player: {
  stats: {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    strength: number;
    magic: number;
    defense: number;
    speed: number;
  };
  mapEffects: {
    type: string;
    value: number;
    duration: number;
  }[];
}) {
  let nextStats = { ...player.stats };

  for (const effect of player.mapEffects ?? []) {
    if (effect.type === "blessing") {
      nextStats.magic += effect.value;
    }

    if (effect.type === "protection") {
      nextStats.defense += effect.value;
    }

    if (effect.type === "wound") {
      nextStats.maxHp = Math.max(1, nextStats.maxHp - effect.value);
      nextStats.hp = Math.min(nextStats.hp, nextStats.maxHp);
    }

    if (effect.type === "infection") {
      nextStats.defense = Math.max(0, nextStats.defense - effect.value);
    }

    if (effect.type === "fatigue") {
      nextStats.maxMana = Math.max(0, nextStats.maxMana - effect.value);
      nextStats.mana = Math.min(nextStats.mana, nextStats.maxMana);
    }

    if (effect.type === "hex") {
      nextStats.magic = Math.max(0, nextStats.magic - effect.value);
    }

    if (effect.type === "corruption_mark") {
      nextStats.strength = Math.max(0, nextStats.strength - effect.value);
    }
  }

  return nextStats;
}

export function consumeCombatMapEffects(player: Player): Player {
  return {
    ...player,
    mapEffects: (player.mapEffects ?? [])
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

  const protection = (player.mapEffects ?? []).find((e) => e.type === "protection");
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