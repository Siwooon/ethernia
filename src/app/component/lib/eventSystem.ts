import { createEnemyFromNode } from "@/app/component/lib/enemies";
import { buffPlayerStats, healPlayer, isNodeCorrupted } from "@/app/component/lib/gameProgression";
import { Enemy, MapNode, Player } from "@/app/component/types/game";
import { BASE_ITEMS } from "@/app/component/data/items";
import { addItemToInventory } from "@/app/component/lib/inventory";
import { EQUIPMENT_ITEMS } from "@/app/component/data/items";

type EventResult =
  | {
      type: "combat";
      enemy: Enemy;
      message?: { title: string; text: string };
    }
  | {
      type: "player_update";
      player: Player;
      message: { title: string; text: string };
    }
  | {
      type: "merchant";
      merchantType: "merchant_blacksmith" | "merchant_alchemist" | "merchant_mystic";
      message?: { title: string; text: string };
    }
  | {
      type: "nothing";
      message?: { title: string; text: string };
    };

export function resolveNodeEvent(
  node: MapNode,
  player: Player,
  corruptionDepth: number
): EventResult {
  if (node.type === "start" || node.eventType === "none") {
    return { type: "nothing" };
  }

  if (node.eventType === "battle" || node.eventType === "boss") {
    const baseEnemy = createEnemyFromNode(node);
    const corrupted = isNodeCorrupted(node, corruptionDepth);

    const boostedEnemy: Enemy = corrupted
      ? {
          ...baseEnemy,
          name: `☠️ ${baseEnemy.name}`,
          hp: Math.floor(baseEnemy.hp * 1.35),
          maxHp: Math.floor(baseEnemy.maxHp * 1.35),
          strength: Math.floor(baseEnemy.strength * 1.25),
        }
      : baseEnemy;

    return { type: "combat", enemy: boostedEnemy };
  }

  if (node.eventType === "rest") {
    return {
      type: "player_update",
      player: healPlayer(player, 30, 20),
      message: {
        title: "Repos",
        text: "Vous trouvez un sanctuaire oublié. Vous récupérez 30 PV et 20 Mana.",
      },
    };
  }

  if (node.eventType === "treasure") {
    const rewardRoll = Math.random();
    if (rewardRoll < 0.15) {
      return {
        type: "player_update",
        player: {
          ...player,
          gold: player.gold + 25,
        },
        message: {
          title: "Trésor",
          text: "Vous trouvez 25 pièces d’or.",
        },
      };
    }
    if (rewardRoll < 0.2) {
      return {
        type: "player_update",
        player: addItemToInventory(player, EQUIPMENT_ITEMS.iron_sword()),
        message: {
          title: "Trésor",
          text: "Vous trouvez une Épée de fer.",
        },
      };
    }

    if (rewardRoll < 0.35) {
      return {
        type: "player_update",
        player: addItemToInventory(player, EQUIPMENT_ITEMS.mystic_staff()),
        message: {
          title: "Trésor",
          text: "Vous trouvez un Bâton mystique.",
        },
      };
    }

    if (rewardRoll < 0.5) {
      return {
        type: "player_update",
        player: addItemToInventory(player, EQUIPMENT_ITEMS.leather_armor()),
        message: {
          title: "Trésor",
          text: "Vous trouvez une Armure de cuir.",
        },
      };
    }

    if (rewardRoll < 0.65) {
      return {
        type: "player_update",
        player: addItemToInventory(player, EQUIPMENT_ITEMS.guardian_relic()),
        message: {
          title: "Trésor",
          text: "Vous trouvez une Relique du gardien.",
        },
      };
    }

    if (rewardRoll < 0.82) {
      return {
        type: "player_update",
        player: addItemToInventory(player, BASE_ITEMS.potion_small()),
        message: {
          title: "Trésor",
          text: "Vous trouvez une Petite potion.",
        },
      };
    }

    return {
      type: "player_update",
      player: addItemToInventory(player, BASE_ITEMS.iron_shard()),
      message: {
        title: "Trésor",
        text: "Vous trouvez un Éclat de fer.",
      },
    };
  }

  if (node.eventType === "merchant_blacksmith") {
    return {
      type: "merchant",
      merchantType: "merchant_blacksmith",
      message: {
        title: "Forgeron",
        text: "Un forgeron ambulant vous propose ses services.",
      },
    };
  }

  if (node.eventType === "merchant_alchemist") {
    return {
      type: "merchant",
      merchantType: "merchant_alchemist",
      message: {
        title: "Alchimiste",
        text: "Un alchimiste vous propose potions et éthers.",
      },
    };
  }

  if (node.eventType === "merchant_mystic") {
    return {
      type: "merchant",
      merchantType: "merchant_mystic",
      message: {
        title: "Mystique",
        text: "Un mystique vous propose reliques et objets occultes.",
      },
    };
  }

  if (node.eventType === "scripted_shrine") {
    return {
      type: "player_update",
      player: {
        ...player,
        stats: {
          ...player.stats,
          maxHp: player.stats.maxHp + 5,
          hp: Math.min(player.stats.maxHp + 5, player.stats.hp + 10),
        },
      },
      message: {
        title: "Autel ancien",
        text: "L’autel renforce votre essence. Vie max +5 et soin léger.",
      },
    };
  }

  if (node.eventType === "random") {
    const roll = Math.random();

    if (roll < 0.25) {
      return {
        type: "player_update",
        player: healPlayer(player, 20, 10),
        message: {
          title: "Source mystique",
          text: "Une énergie bienveillante vous enveloppe. Vous récupérez 20 PV et 10 Mana.",
        },
      };
    }

    if (roll < 0.5) {
      return {
        type: "player_update",
        player: {
          ...player,
          stats: {
            ...player.stats,
            hp: Math.max(1, player.stats.hp - 15),
          },
        },
        message: {
          title: "Piège",
          text: "Un piège ancien se déclenche. Vous perdez 15 PV.",
        },
      };
    }

    if (roll < 0.75) {
      return {
        type: "player_update",
        player: buffPlayerStats(player, { strength: 1, magic: 1 }),
        message: {
          title: "Bénédiction",
          text: "Une présence oubliée vous renforce. Force +1 et Magie +1.",
        },
      };
    }
    if (roll < 0.9) {
      return {
        type: "player_update",
        player: addItemToInventory(player, BASE_ITEMS.relic_guard()),
        message: {
          title: "Relique",
          text: "Vous découvrez une Relique du gardien. Elle sera utile plus tard.",
        },
      };
    }

    return {
      type: "combat",
      enemy: createEnemyFromNode({ ...node, eventType: "battle", label: "Embuscade" }),
      message: {
        title: "Embuscade",
        text: "Un ennemi surgit des ombres.",
      },
    };
  }

  return { type: "nothing" };
}