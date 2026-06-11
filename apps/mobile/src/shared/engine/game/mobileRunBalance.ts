import { BASE_ITEMS, CORRUPTED_EQUIPMENT_ITEMS, EQUIPMENT_ITEMS } from "@/shared/data/items";
import { GameRandom } from "@/shared/platform/random";
import { InventoryItem, MapNode } from "@/shared/types/game";

export type CombatBalanceContext = {
  currentFloor: number;
  corruptionLevel: number;
  node?: MapNode;
  isBoss?: boolean;
  isElite?: boolean;
  isCorrupted?: boolean;
};

export type CombatRewardTuning = {
  xpMultiplier: number;
  gold: number;
  consumableDropChance: number;
  equipmentDropChance: number;
  corruptionBonusGold: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getCombatRewardTuning(context: CombatBalanceContext): CombatRewardTuning {
  const floor = Math.max(1, context.currentFloor || 1);
  const corruption = clamp(context.corruptionLevel || 0, 0, 6);
  const isBoss = Boolean(context.isBoss || context.node?.type === "boss");
  const isElite = Boolean(context.isElite || context.node?.eventType === "elite");
  const isCorrupted = Boolean(context.isCorrupted);

  const floorXpBonus = 1 + (floor - 1) * 0.16;
  const corruptionXpBonus = isCorrupted ? 0.12 + corruption * 0.04 : 0;
  const xpMultiplier = isBoss
    ? floorXpBonus + 0.25 + corruptionXpBonus
    : isElite
      ? floorXpBonus + 0.12 + corruptionXpBonus
      : floorXpBonus + corruptionXpBonus;

  const baseGold = isBoss ? 70 : isElite ? 34 : 12;
  const floorGold = (floor - 1) * (isBoss ? 18 : isElite ? 8 : 3);
  const corruptionBonusGold = isCorrupted ? 6 + corruption * 3 : 0;

  return {
    xpMultiplier,
    gold: baseGold + floorGold + corruptionBonusGold,
    consumableDropChance: clamp((isBoss ? 0.75 : isElite ? 0.55 : 0.32) + (isCorrupted ? 0.1 : 0), 0, 0.9),
    equipmentDropChance: clamp((isBoss ? 0.9 : isElite ? 0.38 : 0.08) + floor * 0.02 + (isCorrupted ? 0.05 : 0), 0, 0.95),
    corruptionBonusGold,
  };
}

export function pickBalancedCombatDrop(params: {
  rng: GameRandom;
  context: CombatBalanceContext;
}): InventoryItem | null {
  const tuning = getCombatRewardTuning(params.context);
  const roll = params.rng.next();

  if (roll < tuning.equipmentDropChance) {
    const corruptedPool = [CORRUPTED_EQUIPMENT_ITEMS.cursed_blade, CORRUPTED_EQUIPMENT_ITEMS.void_staff, CORRUPTED_EQUIPMENT_ITEMS.abyss_relic];
    const cleanPool = [
      EQUIPMENT_ITEMS.iron_sword,
      EQUIPMENT_ITEMS.mystic_staff,
      EQUIPMENT_ITEMS.leather_armor,
      EQUIPMENT_ITEMS.wooden_buckler,
      EQUIPMENT_ITEMS.apprentice_focus,
      EQUIPMENT_ITEMS.copper_amulet,
      EQUIPMENT_ITEMS.iron_ring,
      EQUIPMENT_ITEMS.mana_ring,
      EQUIPMENT_ITEMS.guardian_relic,
    ];
    const useCorrupted = params.context.isCorrupted && params.rng.next() < 0.35;
    const pool = useCorrupted ? corruptedPool : cleanPool;
    return pool[Math.floor(params.rng.next() * pool.length)]();
  }

  if (roll < tuning.equipmentDropChance + tuning.consumableDropChance) {
    const pool = [
      BASE_ITEMS.potion_small,
      BASE_ITEMS.ether_small,
      BASE_ITEMS.fire_bomb,
      BASE_ITEMS.venom_vial,
      BASE_ITEMS.guard_tonic,
    ];
    return pool[Math.floor(params.rng.next() * pool.length)]();
  }

  return null;
}

export function getCorruptionStepPressure(params: {
  currentFloor: number;
  corruptionLevel: number;
  node?: MapNode;
}) {
  const floor = Math.max(1, params.currentFloor || 1);
  const level = clamp(params.corruptionLevel || 0, 0, 6);
  const isBossRoute = params.node?.type === "boss" || params.node?.kind === "boss_prep";

  return {
    mapDamage: clamp(3 + floor + Math.floor(level * 1.5) + (isBossRoute ? 2 : 0), 4, 14),
    chargeGain: clamp(12 + floor * 2 + level * 4 + (isBossRoute ? 6 : 0), 14, 36),
  };
}

export function getRunPressureLabel(params: {
  corruptionLevel: number;
  corruptionCharge: number;
  currentFloor: number;
}) {
  const pressure = params.corruptionLevel * 100 + params.corruptionCharge + Math.max(0, params.currentFloor - 1) * 35;

  if (pressure >= 420) return { label: "Apocalypse proche", tone: "danger" as const };
  if (pressure >= 300) return { label: "Pression critique", tone: "danger" as const };
  if (pressure >= 190) return { label: "Run instable", tone: "warning" as const };
  if (pressure >= 85) return { label: "Corruption présente", tone: "arcane" as const };
  return { label: "Route encore calme", tone: "gold" as const };
}
