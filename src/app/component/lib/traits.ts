import { Enemy, Player, Stats, TraitEffect, CombatEffectContext } from "@/app/component/types/game";

export function addTraitToPlayer(player: Player, trait: TraitEffect): Player {
  const alreadyHas = player.traits.some((t) => t.id === trait.id);
  if (alreadyHas) return player;

  return {
    ...player,
    traits: [...player.traits, trait],
  };
}

export function removeTraitFromPlayer(player: Player, traitId: string): Player {
  return {
    ...player,
    traits: player.traits.filter((t) => t.id !== traitId),
  };
}

export function getStatTraits(traits: TraitEffect[]): TraitEffect[] {
  return traits.filter((t) => t.trigger === "stats");
}

export function applyTraitModifiers(baseStats: Stats, traits: TraitEffect[]): Stats {
  const statTraits = getStatTraits(traits);

  const bonus = statTraits.reduce(
    (acc, trait) => {
      const mods = trait.modifiers ?? {};
      acc.maxHp += mods.maxHp ?? 0;
      acc.maxMana += mods.maxMana ?? 0;
      acc.strength += mods.strength ?? 0;
      acc.magic += mods.magic ?? 0;
      acc.defense += mods.defense ?? 0;
      return acc;
    },
    {
      maxHp: 0,
      maxMana: 0,
      strength: 0,
      magic: 0,
      defense: 0,
    }
  );

  return {
    ...baseStats,
    hp: Math.min(baseStats.hp + bonus.maxHp, baseStats.maxHp + bonus.maxHp),
    maxHp: baseStats.maxHp + bonus.maxHp,
    mana: Math.min(baseStats.mana + bonus.maxMana, baseStats.maxMana + bonus.maxMana),
    maxMana: baseStats.maxMana + bonus.maxMana,
    strength: baseStats.strength + bonus.strength,
    magic: baseStats.magic + bonus.magic,
    defense: baseStats.defense + bonus.defense,
  };
}

export function runTriggeredTraits(
  trigger: TraitEffect["trigger"],
  traits: TraitEffect[],
  ctx: CombatEffectContext
): { player: Player; enemy: Enemy; logs: string[] } {
  let player = ctx.player;
  let enemy = ctx.enemy;
  const logs: string[] = [];

  for (const trait of traits) {
    if (trait.trigger !== trigger) continue;

    switch (trait.id) {
      case "thorns":
        if (ctx.target === "player") {
          enemy = {
            ...enemy,
            hp: Math.max(0, enemy.hp - (trait.value ?? 0)),
          };
          logs.push(`${trait.name} inflige ${trait.value ?? 0} dégâts à l'ennemi.`);
        }
        if (ctx.target === "enemy") {
          player = {
            ...player,
            stats: {
              ...player.stats,
              hp: Math.max(0, player.stats.hp - (trait.value ?? 0)),
            },
          };
          logs.push(`${trait.name} inflige ${trait.value ?? 0} dégâts au joueur.`);
        }
        break;

      case "mana_shield":
        if (ctx.target === "player" && player.stats.mana > 0) {
          player = {
            ...player,
            stats: {
              ...player.stats,
              mana: Math.max(0, player.stats.mana - (trait.value ?? 0)),
            },
          };
          logs.push(`${trait.name} consomme ${trait.value ?? 0} mana.`);
        }
        break;

      case "regen_turn":
        if (ctx.source === "player") {
          player = {
            ...player,
            stats: {
              ...player.stats,
              hp: Math.min(player.stats.maxHp, player.stats.hp + (trait.value ?? 0)),
            },
          };
          logs.push(`${trait.name} rend ${trait.value ?? 0} PV.`);
        } else {
          enemy = {
            ...enemy,
            hp: Math.min(enemy.maxHp, enemy.hp + (trait.value ?? 0)),
          };
          logs.push(`${trait.name} rend ${trait.value ?? 0} PV à l'ennemi.`);
        }
        break;
    }
  }

  return { player, enemy, logs };
}