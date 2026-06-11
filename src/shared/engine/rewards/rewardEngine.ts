import { BASE_ITEMS, EQUIPMENT_ITEMS, getBossRewardItem } from "@/shared/data/items";
import { getCorruptedAffixRewardValue } from "@/shared/engine/combat/corruptedAffixes";
import { getCombatRewardTuning, pickBalancedCombatDrop } from "@/shared/engine/game/mobileRunBalance";
import { applyXpAndLevelUp, getXpReward } from "@/shared/lib/gameProgression";
import { addItemToInventory } from "@/shared/lib/inventory";
import { cloneInventoryItem } from "@/shared/lib/inventoryHelpers";
import { GameRandom } from "@/shared/platform/random";
import { Enemy, InventoryItem, MapNode, Player } from "@/shared/types/game";

export type RewardSource =
  | "combat"
  | "boss"
  | "treasure_safe"
  | "treasure_forced"
  | "mimic"
  | "ambush"
  | "event";

export type RewardBundle = {
  source: RewardSource;
  title: string;
  xp?: number;
  gold?: number;
  items?: InventoryItem[];
  logs?: string[];
};

export type RewardApplicationResult = {
  player: Player;
  logs: string[];
};

export function describeRewardBundle(bundle: RewardBundle): string {
  const parts: string[] = [];

  if (bundle.xp && bundle.xp > 0) parts.push(`+${bundle.xp} XP`);
  if (bundle.gold && bundle.gold > 0) parts.push(`+${bundle.gold} or`);
  if (bundle.items?.length) parts.push(bundle.items.map((item) => item.name).join(", "));

  return parts.length ? parts.join(" • ") : "Aucune récompense.";
}

export function applyRewardBundleToPlayer(
  player: Player,
  bundle: RewardBundle,
  options: {
    applyXp?: boolean;
    onLevelUp?: Parameters<typeof applyXpAndLevelUp>[2];
  } = {}
): RewardApplicationResult {
  let nextPlayer: Player = {
    ...player,
    gold: player.gold + (bundle.gold ?? 0),
  };

  for (const item of bundle.items ?? []) {
    nextPlayer = addItemToInventory(
      nextPlayer,
      cloneInventoryItem(item, { quantity: item.quantity ?? 1 }),
    );
  }

  if (options.applyXp && bundle.xp && bundle.xp > 0) {
    nextPlayer = applyXpAndLevelUp(nextPlayer, bundle.xp, options.onLevelUp ?? (() => undefined));
  }

  return {
    player: nextPlayer,
    logs: [describeRewardBundle(bundle), ...(bundle.logs ?? [])],
  };
}

export function buildCombatRewardBundle(params: {
  primaryEnemy: Enemy | null;
  node?: MapNode;
  isBoss?: boolean;
  currentFloor?: number;
  corruptionLevel?: number;
  isCorrupted?: boolean;
  rng?: GameRandom;
}): RewardBundle {
  const baseXp = params.primaryEnemy ? getXpReward(params.primaryEnemy, params.node) : 25;
  const isElite = params.node?.eventType === "elite" || params.primaryEnemy?.sourceTag === "elite";
  const isBoss = Boolean(params.isBoss || params.node?.type === "boss" || params.primaryEnemy?.isBoss);
  const tuning = getCombatRewardTuning({
    currentFloor: params.currentFloor ?? 1,
    corruptionLevel: params.corruptionLevel ?? 0,
    node: params.node,
    isBoss,
    isElite,
    isCorrupted: params.isCorrupted,
  });
  const affixRewardValue = getCorruptedAffixRewardValue(params.primaryEnemy);
  const affixRewardMultiplier = 1 + affixRewardValue * 0.12;
  const xp = Math.max(1, Math.floor(baseXp * tuning.xpMultiplier * affixRewardMultiplier));
  const rng = params.rng;
  const drop = rng
    ? pickBalancedCombatDrop({
        rng,
        context: {
          currentFloor: params.currentFloor ?? 1,
          corruptionLevel: params.corruptionLevel ?? 0,
          node: params.node,
          isBoss,
          isElite,
          isCorrupted: params.isCorrupted,
        },
      })
    : null;

  const bossReward = isBoss ? getBossRewardItem(params.primaryEnemy?.bossMechanic) : null;
  const bossBonusGold = isBoss ? 35 + (params.currentFloor ?? 1) * 12 + (params.corruptionLevel ?? 0) * 10 : 0;
  const bossBonusXp = isBoss ? 18 + (params.currentFloor ?? 1) * 8 : 0;
  const items = [bossReward, drop].filter((item): item is InventoryItem => Boolean(item));

  return {
    source: isBoss ? "boss" : "combat",
    title: isBoss ? "Victoire de boss" : isElite ? "Victoire élite" : "Victoire de combat",
    xp: xp + bossBonusXp,
    gold: tuning.gold + affixRewardValue * 8 + bossBonusGold,
    items: items.length > 0 ? items : undefined,
    logs: isBoss
      ? ["Le boss laisse un trophée."]
      : isElite
        ? ["L’élite laisse un vrai butin de progression."]
        : affixRewardValue > 0
          ? ["La corruption renforce le butin."]
          : tuning.corruptionBonusGold > 0
            ? ["Les ennemis corrompus abandonnent un butin risqué."]
            : ["Les ennemis laissent un petit butin."],
  };
}

export function buildTreasureSafeReward(params: { rng: GameRandom; corrupted?: boolean }): RewardBundle {
  const roll = params.rng.next();

  if (roll < 0.4) {
    return {
      source: "treasure_safe",
      title: "Trésor sécurisé",
      gold: params.corrupted ? 16 : 24,
    };
  }

  if (roll < 0.7) {
    return {
      source: "treasure_safe",
      title: "Trésor sécurisé",
      items: [BASE_ITEMS.potion_small()],
    };
  }

  return {
    source: "treasure_safe",
    title: "Trésor sécurisé",
    items: [BASE_ITEMS.ether_small()],
  };
}

export function buildTreasureForcedReward(params: { rng: GameRandom; corrupted?: boolean }): RewardBundle {
  const roll = params.rng.next();

  if (roll < 0.35) {
    return {
      source: "treasure_forced",
      title: "Butin obtenu",
      items: [BASE_ITEMS.relic_guard()],
    };
  }

  if (roll < 0.65) {
    return {
      source: "treasure_forced",
      title: "Butin obtenu",
      items: [EQUIPMENT_ITEMS.leather_armor()],
    };
  }

  return {
    source: "treasure_forced",
    title: "Butin obtenu",
    gold: params.corrupted ? 65 : 42,
  };
}

export function buildMimicRewardBundle(): RewardBundle {
  return {
    source: "mimic",
    title: "Butin de mimique",
    gold: 20,
    items: [BASE_ITEMS.relic_guard()],
    logs: ["Butin de mimique récupéré."],
  };
}

export function buildAmbushRewardBundle(): RewardBundle {
  return {
    source: "ambush",
    title: "Embuscade nettoyée",
    gold: 8,
    items: [BASE_ITEMS.ether_small()],
    logs: ["Butin d’embuscade récupéré."],
  };
}

export function buildRandomSearchReward(params: { rng: GameRandom }): RewardBundle {
  return params.rng.next() < 0.5
    ? {
        source: "event",
        title: "Découverte",
        items: [BASE_ITEMS.ether_small()],
      }
    : {
        source: "event",
        title: "Découverte",
        logs: ["Le héros gagne +1 Magie."],
      };
}
