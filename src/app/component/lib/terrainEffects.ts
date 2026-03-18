import { TerrainEffect, StatusEffect, Stats } from "@/app/component/types/game";
import { addStatus } from "@/app/component/lib/statusEffects";

export function applyTerrainEffectsOnCombatStart(
  terrainEffects: TerrainEffect[] = []
): StatusEffect[] {
  let statuses: StatusEffect[] = [];

  for (const effect of terrainEffects) {
    if (effect.type === "toxic_fog") {
      statuses = addStatus(statuses, {
        type: "poison",
        value: effect.value,
        duration: 2,
        source: "terrain_toxic_fog",
      });
    }

    if (effect.type === "sacred_ground") {
      statuses = addStatus(statuses, {
        type: "regen",
        value: effect.value,
        duration: 3,
        source: "terrain_sacred_ground",
      });
    }

    if (effect.type === "ashen_heat") {
      statuses = addStatus(statuses, {
        type: "burn",
        value: effect.value,
        duration: 2,
        source: "terrain_ashen_heat",
      });
    }

    if (effect.type === "mana_spring") {
      statuses = addStatus(statuses, {
        type: "regen",
        value: 0,
        duration: 3,
        source: "terrain_mana_spring",
      });
    }
  }

  return statuses;
}

export function applyTerrainEffectsEachTurn(
  stats: Stats,
  terrainEffects: TerrainEffect[] = []
) {
  let nextStats = { ...stats };
  const logs: string[] = [];

  for (const effect of terrainEffects) {
    if (effect.type === "storm_field" && Math.random() < 0.35) {
      nextStats.hp = Math.max(1, nextStats.hp - effect.value);
      logs.push(`⚡ Champ orageux : -${effect.value} PV`);
    }

    if (effect.type === "mana_spring") {
      nextStats.mana = Math.min(nextStats.maxMana, nextStats.mana + effect.value);
      logs.push(`💧 Source de mana : +${effect.value} mana`);
    }
  }

  return { stats: nextStats, logs };
}

export function getTerrainEffectsForNode(
  terrainEffects: TerrainEffect[] | undefined,
  isCorrupted: boolean
): TerrainEffect[] {
  const base = terrainEffects ?? [];

  if (!isCorrupted) return base;

  return [
    ...base,
    {
      type: "ashen_heat",
      value: 3,
      source: "corruption",
      scope: "node",
    },
  ];
}