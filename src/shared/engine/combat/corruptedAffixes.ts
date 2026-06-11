import { getCorruptionStage } from "@/shared/engine/game/corruptionEngine";
import { applyIncomingDamageToStats } from "@/shared/engine/combat/combatEngine";
import { CombatPlayerState } from "@/shared/engine/combat/combatTypes";
import { createScopedRandom, GameRandom, randomChance, randomPick } from "@/shared/platform/random";
import { CorruptedEnemyAffix, CorruptedEnemyAffixId, Enemy, StatusEffect } from "@/shared/types/game";

const AFFIXES: Record<CorruptedEnemyAffixId, CorruptedEnemyAffix> = {
  venom: {
    id: "venom",
    label: "Venin",
    description: "Ses coups peuvent empoisonner.",
    rewardValue: 1,
  },
  shell: {
    id: "shell",
    label: "Garde",
    description: "Commence protégé et plus solide.",
    rewardValue: 1,
  },
  frenzy: {
    id: "frenzy",
    label: "Rage",
    description: "Frappe plus fort, tient moins bien.",
    rewardValue: 1,
  },
  regen: {
    id: "regen",
    label: "Sève",
    description: "Récupère des PV en combat.",
    rewardValue: 1,
  },
  volatile: {
    id: "volatile",
    label: "Instable",
    description: "Se rompt à la mort.",
    rewardValue: 2,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pickAffixes(rng: GameRandom, count: number): CorruptedEnemyAffix[] {
  const pool: CorruptedEnemyAffixId[] = ["venom", "shell", "frenzy", "regen", "volatile"];
  const picked: CorruptedEnemyAffix[] = [];
  const used = new Set<CorruptedEnemyAffixId>();

  while (picked.length < count && used.size < pool.length) {
    const id = randomPick(rng, pool);
    if (used.has(id)) continue;
    used.add(id);
    picked.push(AFFIXES[id]);
  }

  return picked;
}

function hasAffix(enemy: Enemy, id: CorruptedEnemyAffixId) {
  return Boolean(enemy.corruptionAffixes?.some((affix) => affix.id === id));
}

function applyAffixStats(enemy: Enemy, affixes: CorruptedEnemyAffix[], pressureLevel: number): Enemy {
  let next: Enemy = {
    ...enemy,
    corruptionAffixes: affixes,
    statuses: [...(enemy.statuses ?? [])],
    passives: [...(enemy.passives ?? [])],
    attacks: enemy.attacks.map((attack) => ({ ...attack })),
  };

  if (affixes.some((affix) => affix.id === "shell")) {
    const shield: StatusEffect = {
      type: "shield",
      value: 6 + pressureLevel * 2,
      duration: 2,
      source: "Garde",
    };
    next = {
      ...next,
      defense: next.defense + 2 + Math.floor(pressureLevel / 2),
      statuses: [...next.statuses, shield],
    };
  }

  if (affixes.some((affix) => affix.id === "frenzy")) {
    next = {
      ...next,
      strength: next.strength + 2 + Math.floor(pressureLevel / 2),
      speed: next.speed + 1,
      defense: Math.max(0, next.defense - 1),
    };
  }

  if (affixes.some((affix) => affix.id === "regen")) {
    next = {
      ...next,
      statuses: [
        ...next.statuses,
        {
          type: "regen",
          value: 3 + pressureLevel,
          duration: 4,
          source: "Sève",
        },
      ],
    };
  }

  if (affixes.some((affix) => affix.id === "venom")) {
    next = {
      ...next,
      attacks: next.attacks.map((attack) => ({
        ...attack,
        statusEffect: attack.statusEffect ?? {
          type: "poison",
          value: 2 + Math.floor(pressureLevel / 2),
          duration: 2,
          target: "player",
        },
      })),
    };
  }

  if (affixes.some((affix) => affix.id === "volatile")) {
    next = {
      ...next,
      magic: next.magic + 1 + Math.floor(pressureLevel / 2),
      maxHp: next.maxHp + 4 + pressureLevel * 2,
      hp: next.hp + 4 + pressureLevel * 2,
    };
  }

  return next;
}

export function applyCorruptedAffixesToEnemies(params: {
  enemies: Enemy[];
  runSeed: string;
  nodeId: number;
  corruptionLevel: number;
  corruptionCharge: number;
  isCorruptedNode: boolean;
  isBossCombat?: boolean;
}): Enemy[] {
  const stage = getCorruptionStage(params.corruptionLevel, params.corruptionCharge);
  const pressureLevel = clamp(Math.floor(stage.pressure / 100), 0, 5);
  const baseChance = params.isCorruptedNode ? 0.7 : stage.pressure >= 150 ? 0.18 : 0;

  if (baseChance <= 0) return params.enemies;

  return params.enemies.map((enemy, index) => {
    if (enemy.corruptionAffixes?.length) return enemy;

    const rng = createScopedRandom(params.runSeed, `affix:${params.nodeId}:${index}:${stage.id}`);
    const bossExtra = params.isBossCombat || enemy.isBoss ? 1 : 0;
    const maxAffixes = clamp(1 + bossExtra + (stage.id === "rupture" || stage.id === "apocalypse" ? 1 : 0), 1, 3);
    const chance = clamp(baseChance + pressureLevel * 0.06 + (enemy.isBoss ? 0.25 : 0), 0, 0.95);

    if (!randomChance(rng, chance)) return enemy;

    const count = randomChance(rng, stage.id === "apocalypse" ? 0.55 : stage.id === "rupture" ? 0.35 : 0.16)
      ? maxAffixes
      : 1;

    return applyAffixStats(enemy, pickAffixes(rng, count), pressureLevel);
  });
}

export function getCorruptedAffixRewardValue(enemy: Enemy | null | undefined) {
  return (enemy?.corruptionAffixes ?? []).reduce((total, affix) => total + affix.rewardValue, 0);
}

export function buildCorruptedAffixLabels(enemy: Enemy | null | undefined) {
  return (enemy?.corruptionAffixes ?? []).map((affix) => affix.label);
}

export function resolveCorruptedAffixDeathEffects(params: {
  before: Enemy;
  afterHp: number;
  allies: CombatPlayerState[];
  corruptionLevel: number;
}): { allies: CombatPlayerState[]; logs: string[] } {
  if (params.before.hp <= 0 || params.afterHp > 0 || !hasAffix(params.before, "volatile")) {
    return { allies: params.allies, logs: [] };
  }

  const damage = 4 + clamp(params.corruptionLevel, 0, 5) * 2;
  const logs: string[] = [];
  const nextAllies = params.allies.map((ally) => {
    if (ally.isDead || ally.stats.hp <= 0) return ally;

    const applied = applyIncomingDamageToStats({
      stats: ally.stats,
      statuses: ally.statuses,
      damage,
    });
    logs.push(`${ally.player.name} subit ${applied.hpLost} dégâts.`);

    return {
      ...ally,
      stats: applied.stats,
      statuses: applied.statuses,
      defending: applied.stats.hp <= 0 ? false : ally.defending,
      isDead: applied.stats.hp <= 0,
    };
  });

  return {
    allies: nextAllies,
    logs: [`${params.before.name} se brise.`, ...logs],
  };
}
