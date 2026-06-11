import { Enemy, Player, Stats, TraitEffect, CombatEffectContext } from "@/shared/types/game";
import { applyStatBonuses, getTraitStatBonuses } from "@/shared/lib/playerStats";

export function addTraitToPlayer(player: Player, trait: TraitEffect): Player {
  const traits = player.traits ?? [];
  const alreadyHas = traits.some((t) => t.id === trait.id);
  if (alreadyHas) return player;

  return {
    ...player,
    traits: [...traits, trait],
  };
}

export function removeTraitFromPlayer(player: Player, traitId: string): Player {
  return {
    ...player,
    traits: (player.traits ?? []).filter((t) => t.id !== traitId),
  };
}

export function getStatTraits(traits: TraitEffect[] | undefined): TraitEffect[] {
  return (traits ?? []).filter((t) => t.trigger === "stats");
}

export function applyTraitModifiers(baseStats: Stats, traits: TraitEffect[] | undefined): Stats {
  return applyStatBonuses(baseStats, getTraitStatBonuses(traits ?? []));
}

type TriggerResult = {
  player: Player;
  enemy: Enemy;
  logs: string[];
};

function runSingleTrait(
  trait: TraitEffect,
  ctx: CombatEffectContext
): TriggerResult {
  let player = ctx.player;
  let enemy = ctx.enemy;
  const logs: string[] = [];

  switch (trait.id) {

    case "regen_turn": {
      const healValue = trait.value ?? 0;

      if (ctx.source === "player") {
        player = {
          ...player,
          stats: {
            ...player.stats,
            hp: Math.min(player.stats.maxHp, player.stats.hp + healValue),
          },
        };
        logs.push(`${trait.name} rend ${healValue} PV.`);
      } else {
        enemy = {
          ...enemy,
          hp: Math.min(enemy.maxHp, enemy.hp + healValue),
        };
        logs.push(`${trait.name} rend ${healValue} PV à l'ennemi.`);
      }
      break;
    }
  }

  return { player, enemy, logs };
}

export function runTriggeredTraits(
  trigger: TraitEffect["trigger"],
  traits: TraitEffect[] | undefined,
  ctx: CombatEffectContext
): TriggerResult {
  let currentPlayer = ctx.player;
  let currentEnemy = ctx.enemy;
  const logs: string[] = [];

  for (const trait of traits ?? []) {
    if (trait.trigger !== trigger) continue;

    if (trait.chance && Math.random() > trait.chance) {
      continue;
    }

    const result = runSingleTrait(trait, {
      ...ctx,
      player: currentPlayer,
      enemy: currentEnemy,
      trait,
    });

    currentPlayer = result.player;
    currentEnemy = result.enemy;
    logs.push(...result.logs);
  }

  return {
    player: currentPlayer,
    enemy: currentEnemy,
    logs,
  };
}