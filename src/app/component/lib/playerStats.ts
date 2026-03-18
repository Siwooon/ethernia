import { Player, Stats, TraitEffect, TraitModifiers } from "@/app/component/types/game";
import { getEquipmentBonuses } from "@/app/component/lib/equipment";
import { applyMapEffectsToPlayerStats } from "@/app/component/lib/mapEffects";

const EMPTY_MODIFIERS: Required<TraitModifiers> = {
  maxHp: 0,
  maxMana: 0,
  strength: 0,
  magic: 0,
  defense: 0,
  speed:0,
};

export function getTraitStatBonuses(traits: TraitEffect[] = []): Required<TraitModifiers> {
  return traits
    .filter((trait) => trait.trigger === "stats")
    .reduce((acc, trait) => {
      const mods = trait.modifiers ?? {};
      acc.maxHp += mods.maxHp ?? 0;
      acc.maxMana += mods.maxMana ?? 0;
      acc.strength += mods.strength ?? 0;
      acc.magic += mods.magic ?? 0;
      acc.defense += mods.defense ?? 0;
      acc.speed += mods.speed ?? 0;
      return acc;
    }, { ...EMPTY_MODIFIERS });
}

export function applyStatBonuses(
  baseStats: Stats,
  bonuses: Partial<TraitModifiers>
): Stats {
  const nextMaxHp = baseStats.maxHp + (bonuses.maxHp ?? 0);
  const nextMaxMana = baseStats.maxMana + (bonuses.maxMana ?? 0);

  return {
    ...baseStats,
    hp: Math.min(baseStats.hp, nextMaxHp),
    maxHp: nextMaxHp,
    mana: Math.min(baseStats.mana, nextMaxMana),
    maxMana: nextMaxMana,
    strength: baseStats.strength + (bonuses.strength ?? 0),
    magic: baseStats.magic + (bonuses.magic ?? 0),
    defense: baseStats.defense + (bonuses.defense ?? 0),
    speed: baseStats.speed + (bonuses.speed ?? 0),
  };
}

export function getDerivedPlayerStats(player: Player): Stats {
  const withEquipment = applyStatBonuses(player.stats, getEquipmentBonuses(player));
  const withTraits = applyStatBonuses(withEquipment, getTraitStatBonuses(player.traits ?? []));
  const withMapEffects = applyMapEffectsToPlayerStats({
    ...player,
    stats: withTraits,
  });

  return {
    ...withMapEffects,
    hp: Math.min(withMapEffects.hp, withMapEffects.maxHp),
    mana: Math.min(withMapEffects.mana, withMapEffects.maxMana),
  };
}

export function restorePersistentPlayerStatsFromCombat(
  player: Player,
  combatStats: Stats
): Stats {
  const derivedReference = getDerivedPlayerStats(player);

  const maxHpBonus = derivedReference.maxHp - player.stats.maxHp;
  const maxManaBonus = derivedReference.maxMana - player.stats.maxMana;

  return {
    ...player.stats,
    hp: Math.max(
      0,
      Math.min(combatStats.hp, combatStats.maxHp - maxHpBonus)
    ),
    maxHp: player.stats.maxHp,
    mana: Math.max(
      0,
      Math.min(combatStats.mana, combatStats.maxMana - maxManaBonus)
    ),
    maxMana: player.stats.maxMana,
    strength: player.stats.strength,
    magic: player.stats.magic,
    defense: player.stats.defense,
  };
}