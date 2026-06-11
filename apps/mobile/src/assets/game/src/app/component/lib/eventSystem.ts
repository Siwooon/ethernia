import { BASE_ITEMS, EQUIPMENT_ITEMS } from "@/app/component/data/items";
import { Enemy, EventChoiceAction, MapNode, Player } from "@/app/component/types/game";
import { createEnemyFromNode, createSpecialEnemy, createEnemyGroupFromNode, } from "@/app/component/lib/enemies";
import { addItemToInventory } from "@/app/component/lib/inventory";
import { buffPlayerStats, healPlayerWithEquipment, getBossModifiersFromStatues } from "@/app/component/lib/gameProgression";

import { addMapEffect, removeMapEffect } from "@/app/component/lib/mapEffects";

type MerchantResultType =
  | "merchant_blacksmith"
  | "merchant_alchemist"
  | "merchant_mystic"
  | "merchant_blacksmith_corrupted"
  | "merchant_alchemist_corrupted"
  | "merchant_mystic_corrupted";

export type EventResult =
  | {
      type: "combat";
      enemy: Enemy;
      enemies?: Enemy[];
      message?: { title: string; text: string };
    }
  | {
      type: "player_update";
      player: Player;
      message: { title: string; text: string };
    }
  | {
      type: "merchant";
      merchantType: MerchantResultType;
      message?: { title: string; text: string };
    }
  | {
      type: "choice";
      choiceType: "statuette" | "rest" | "treasure" | "shrine" | "random";
      corrupted?: boolean;
      message: {
        title: string;
        text: string;
        choices: {
          id: EventChoiceAction;
          label: string;
          description: string;
          style?: "danger" | "sacrifice" | "power";
        }[];
      };
    }
  | {
      type: "nothing";
      message?: { title: string; text: string };
    };

export function resolveNodeEvent(
  node: MapNode,
  player: Player,
  isCorrupted: boolean,
  statuesCollected: number = 0
): EventResult {
  const corrupted = isCorrupted;

  const corruptionEnemyBonus = corrupted
    ? { hp: 1.3, strength: 1.18, magic: 1.15, defense: 1.1 }
    : { hp: 1, strength: 1, magic: 1, defense: 1 };

  const applyCorruptionToEnemy = (enemy: Enemy, prefix = "☠️ "): Enemy => {
    if (!corrupted) return enemy;

    return {
      ...enemy,
      name: `${prefix}${enemy.name}`,
      hp: Math.floor(enemy.hp * corruptionEnemyBonus.hp),
      maxHp: Math.floor(enemy.maxHp * corruptionEnemyBonus.hp),
      strength: Math.floor(enemy.strength * corruptionEnemyBonus.strength),
      magic: Math.floor(enemy.magic * corruptionEnemyBonus.magic),
      defense: Math.floor(enemy.defense * corruptionEnemyBonus.defense),
    };
  };

  if (node.type === "start") {
    return {
      type: "nothing",
      message: {
        title: "Campement",
        text: "Le campement est silencieux.",
      },
    };
  }

  if (node.type === "boss" || node.eventType === "boss") {
    const baseEnemy = createEnemyFromNode(node);
    const statueModifiers = getBossModifiersFromStatues(statuesCollected);

    let bossEnemy: Enemy = {
      ...baseEnemy,
      name: `${statueModifiers.prefix}${baseEnemy.name}`,
      hp: Math.floor(baseEnemy.hp * statueModifiers.hp),
      maxHp: Math.floor(baseEnemy.maxHp * statueModifiers.hp),
      strength: Math.floor(baseEnemy.strength * statueModifiers.strength),
      magic: Math.floor(baseEnemy.magic * statueModifiers.magic),
      defense: Math.floor(baseEnemy.defense * statueModifiers.defense),
    };

    if (corrupted) {
      bossEnemy = applyCorruptionToEnemy(bossEnemy, "☠️ ");
    }

    return {
      type: "combat",
      enemy: bossEnemy,
      message: {
        title: statueModifiers.title,
        text: corrupted
          ? `${statueModifiers.description}. La corruption renforce encore ce gardien.`
          : statueModifiers.description,
      },
    };
  }

if (node.eventType === "battle") {
  const group = createEnemyGroupFromNode(node).map((enemy) =>
    applyCorruptionToEnemy(enemy)
  );

  const leadEnemy = group[0];

  return {
    type: "combat",
    enemy: leadEnemy,
    enemies: group,
    message: corrupted
      ? {
          title: group.length > 1 ? "Embuscade corrompue" : "Combat corrompu",
          text:
            group.length > 1
              ? "Plusieurs ennemis renforcés par les ténèbres vous encerclent."
              : "L’ennemi est renforcé par les ténèbres.",
        }
      : {
          title: group.length > 1 ? "Embuscade" : "Combat",
          text:
            group.length > 1
              ? "Plusieurs ennemis surgissent devant vous."
              : "Un ennemi bloque votre route.",
        },
  };
}

  if (node.eventType === "elite") {
    const baseEnemy = createSpecialEnemy(node, "elite");

    const eliteEnemy: Enemy = corrupted
      ? {
          ...applyCorruptionToEnemy(baseEnemy, "☠️⭐ "),
          sourceTag: baseEnemy.sourceTag,
          rewardCategory: baseEnemy.rewardCategory,
        }
      : {
          ...baseEnemy,
          name: `⭐ ${baseEnemy.name}`,
          hp: Math.floor(baseEnemy.hp * 1.35),
          maxHp: Math.floor(baseEnemy.maxHp * 1.35),
          strength: Math.floor(baseEnemy.strength * 1.18),
          magic: Math.floor(baseEnemy.magic * 1.12),
          defense: Math.floor(baseEnemy.defense * 1.12),
        };

    return {
      type: "combat",
      enemy: eliteEnemy,
      message: corrupted
        ? {
            title: "Élite corrompue",
            text: "Une créature d’élite corrompue garde ce lieu.",
          }
        : {
            title: "Combat d’élite",
            text: "Un ennemi d’élite protège cette zone.",
          },
    };
  }

  if (node.eventType === "rest") {
    return {
      type: "choice",
      choiceType: "rest",
      corrupted,
      message: corrupted
        ? {
            title: "Sanctuaire souillé",
            text: "Le lieu est corrompu. Vous pouvez tenter d'en tirer quelque chose, mais à vos risques.",
            choices: [
              {
                id: "rest_sleep",
                label: "Dormir malgré la corruption",
                description: "Récupère un peu de vie, mais le repos est faible.",
                style: "sacrifice",
              },
              {
                id: "rest_focus",
                label: "Canaliser les énergies",
                description: "Beaucoup de mana, +1 Magie, mais la corruption progresse.",
                style: "power",
              },
              {
                id: "rest_cleanse",
                label: "Purifier le lieu",
                description: "Retire une altération, mais vous coûte des ressources.",
                style: "danger",
              },
            ],
          }
        : {
            title: "Lieu de repos",
            text: "Un sanctuaire oublié vous offre plusieurs façons de reprendre des forces.",
            choices: [
              {
                id: "rest_sleep",
                label: "Dormir",
                description: "Récupère beaucoup de vie.",
              },
              {
                id: "rest_focus",
                label: "Méditer",
                description: "Récupère surtout du mana.",
                style: "power",
              },
              {
                id: "rest_cleanse",
                label: "Se purifier",
                description: "Retire une altération persistante.",
                style: "sacrifice",
              },
            ],
          },
    };
  }

  if (node.eventType === "treasure") {
    return {
      type: "choice",
      choiceType: "treasure",
      corrupted,
      message: corrupted
        ? {
            title: "Coffre corrompu",
            text: "Le coffre pulse d'une énergie instable.",
            choices: [
              {
                id: "treasure_open_safe",
                label: "Ouvrir prudemment",
                description: "Petite récompense plus sûre.",
              },
              {
                id: "treasure_force",
                label: "Forcer le coffre",
                description: "Très grosse récompense, mais mimique possible et corruption accrue.",
                style: "danger",
              },
              {
                id: "treasure_leave",
                label: "Laisser",
                description: "Vous évitez le danger.",
              },
            ],
          }
        : {
            title: "Trésor",
            text: "Un coffre ancien repose devant vous.",
            choices: [
              {
                id: "treasure_open_safe",
                label: "Ouvrir prudemment",
                description: "Récompense sûre mais modeste.",
              },
              {
                id: "treasure_force",
                label: "Forcer le coffre",
                description: "Meilleure récompense, mais un piège est possible.",
                style: "power",
              },
              {
                id: "treasure_leave",
                label: "Ignorer",
                description: "Vous continuez votre route.",
              },
            ],
          },
    };
  }

  if (node.eventType === "random") {
    return {
      type: "choice",
      choiceType: "random",
      corrupted,
      message: corrupted
        ? {
            title: "Rencontre troublante",
            text: "Quelque chose rôde dans l'ombre.",
            choices: [
              {
                id: "random_help",
                label: "Intervenir",
                description: "Option prudente mais douloureuse.",
                style: "danger",
              },
              {
                id: "random_search",
                label: "Fouiller la zone",
                description: "Peut donner un boon d'équipe, mais nourrit la corruption.",
                style: "power",
              },
              {
                id: "random_ignore",
                label: "Ignorer",
                description: "Vous poursuivez votre route.",
              },
            ],
          }
        : {
            title: "Événement étrange",
            text: "Une situation inattendue se présente à vous.",
            choices: [
              {
                id: "random_help",
                label: "Aider / intervenir",
                description: "Option la plus sûre.",
              },
              {
                id: "random_search",
                label: "Fouiller",
                description: "Plus risqué, mais potentiellement plus rentable.",
                style: "power",
              },
              {
                id: "random_ignore",
                label: "Ignorer",
                description: "Aucun gain, aucun risque.",
              },
            ],
          },
    };
  }

  if (node.eventType === "merchant_blacksmith") {
    if (corrupted) {
      const roll = Math.random();

      if (roll < 0.25) {
        const enemy = createEnemyFromNode({
          ...node,
          eventType: "battle",
          label: "Forgeron corrompu",
        });

        return {
          type: "combat",
          enemy: {
            ...enemy,
            name: "☠️ Forgeron corrompu",
            hp: Math.floor(enemy.hp * 1.2),
            maxHp: Math.floor(enemy.maxHp * 1.2),
            strength: Math.floor(enemy.strength * 1.25),
          },
          message: {
            title: "Forgeron dément",
            text: "Le forgeron a succombé à la corruption.",
          },
        };
      }

      return {
        type: "merchant",
        merchantType: "merchant_blacksmith_corrupted",
        message: {
          title: "Forge corrompue",
          text: "Des armes maudites sont exposées sur l’enclume.",
        },
      };
    }

    return {
      type: "merchant",
      merchantType: "merchant_blacksmith",
      message: {
        title: "Forge",
        text: "Un forgeron vous propose armes et armures.",
      },
    };
  }

  if (node.eventType === "merchant_alchemist") {
    if (corrupted) {
      const roll = Math.random();

      if (roll < 0.25) {
        const enemy = createEnemyFromNode({
          ...node,
          eventType: "battle",
          label: "Alchimiste corrompu",
        });

        return {
          type: "combat",
          enemy: {
            ...enemy,
            name: "☠️ Alchimiste corrompu",
            hp: Math.floor(enemy.hp * 1.2),
            maxHp: Math.floor(enemy.maxHp * 1.2),
            magic: Math.floor(enemy.magic * 1.25),
          },
          message: {
            title: "Alchimiste déchu",
            text: "Ses expériences l’ont transformé en menace.",
          },
        };
      }

      return {
        type: "merchant",
        merchantType: "merchant_alchemist_corrupted",
        message: {
          title: "Alchimiste corrompu",
          text: "Un alchimiste instable propose des mixtures douteuses.",
        },
      };
    }

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
    if (corrupted) {
      const roll = Math.random();

      if (roll < 0.25) {
        const enemy = createEnemyFromNode({
          ...node,
          eventType: "battle",
          label: "Mystique corrompu",
        });

        return {
          type: "combat",
          enemy: {
            ...enemy,
            name: "☠️ Mystique corrompu",
            hp: Math.floor(enemy.hp * 1.2),
            maxHp: Math.floor(enemy.maxHp * 1.2),
            magic: Math.floor(enemy.magic * 1.3),
          },
          message: {
            title: "Mystique déchu",
            text: "Le mystique a été consumé par les forces qu’il étudiait.",
          },
        };
      }

      return {
        type: "merchant",
        merchantType: "merchant_mystic_corrupted",
        message: {
          title: "Mystique du gouffre",
          text: "Il propose des artefacts interdits, très puissants mais maudits.",
        },
      };
    }

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
      type: "choice",
      choiceType: "shrine",
      corrupted,
      message: corrupted
        ? {
            title: "Autel corrompu",
            text: "L'autel murmure des promesses dangereuses.",
            choices: [
              {
                id: "shrine_bless",
                label: "Accepter la bénédiction noire",
                description: "Puissance immédiate, mais à un coût.",
                style: "power",
              },
              {
                id: "shrine_offer",
                label: "Offrir votre sang",
                description: "Sacrifiez des PV pour un plus grand pouvoir.",
                style: "danger",
              },
              {
                id: "shrine_revive",
                label: "Rappeler une âme tombée",
                description: "Ressuscite un allié mort, mais réduit vos PV max.",
                style: "sacrifice",
              },
              {
                id: "shrine_leave",
                label: "Refuser",
                description: "Vous évitez le pacte.",
              },
            ],
          }
        : {
            title: "Autel ancien",
            text: "Une présence calme émane de l'autel.",
            choices: [
              {
                id: "shrine_bless",
                label: "Recevoir une bénédiction",
                description: "Petit bonus sûr.",
              },
              {
                id: "shrine_offer",
                label: "Faire une offrande",
                description: "Coût modéré, bénédiction plus forte.",
                style: "sacrifice",
              },
              {
                id: "shrine_revive",
                label: "Prier pour un allié tombé",
                description: "Ressuscite un allié mort, mais réduit vos PV max.",
                style: "sacrifice",
              },
              {
                id: "shrine_leave",
                label: "Partir",
                description: "Ne rien risquer.",
              },
            ],
          },
    };
  }

  if (node.eventType === "statuette") {
    return {
      type: "choice",
      choiceType: "statuette",
      corrupted,
      message: {
        title: "Statuette ancienne",
        text:
          "La relique pulse d'une énergie instable.\n\n" +
          "Vous pouvez la prendre de force, tenter de la purifier, ou absorber son pouvoir.",
        choices: [
          {
            id: "take_statue",
            label: "Prendre la statuette",
            description: "Déclenche un combat d'élite contre le gardien, puis vous obtenez la statuette si vous gagnez.",
            style: "danger",
          },
          {
            id: "purify_statue",
            label: "Purifier la statuette",
            description: "Vous perdez des PV et du mana, vous subissez une infection, mais vous récupérez la statuette.",
            style: "sacrifice",
          },
          {
            id: "absorb_statue",
            label: "Absorber la statuette",
            description: "Vous gagnez de la puissance immédiatement, mais la corruption progresse plus vite.",
            style: "power",
          },
        ],
      },
    };
  }

  return {
    type: "nothing",
    message: {
      title: "Silence",
      text: "Il ne se passe rien ici.",
    },
  };
}