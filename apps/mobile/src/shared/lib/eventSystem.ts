import { BASE_ITEMS, EQUIPMENT_ITEMS } from "@/shared/data/items";
import { Enemy, EventChoiceAction, MapNode, Player } from "@/shared/types/game";
import { createEnemyFromNode, createSpecialEnemy, createEnemyGroupFromNode, } from "@/shared/lib/enemies";
import { addItemToInventory } from "@/shared/lib/inventory";
import { buffPlayerStats, healPlayerWithEquipment, getBossModifiersFromStatues } from "@/shared/lib/gameProgression";

import { addMapEffect, removeMapEffect } from "@/shared/lib/mapEffects";

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
  const withLore = (text: string) => text;

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
        text: "Point de départ. Aucun danger ici.",
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
          ? `${statueModifiers.description}. La corruption renforce encore ce gardien. Le boss frappe plus fort.`
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
          title: group.length > 1 ? "Embuscade" : "Combat",
          text: withLore(
            group.length > 1
              ? "Plusieurs ennemis bloquent la route. Gagne de l’XP et des récompenses en les battant."
              : "Un ennemi corrompu bloque la route. Il est plus dangereux qu’un ennemi normal."
          ),
        }
      : {
          title: group.length > 1 ? "Embuscade" : "Combat",
          text: withLore(
            group.length > 1
              ? "Plusieurs ennemis approchent. Gagne de l’XP et des récompenses en les battant."
              : "Un ennemi bloque la route. Bats-le pour sécuriser le lieu."
          ),
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
            title: "Élite",
            text: "Une élite bloque la route. Combat plus dur, meilleure récompense.",
          }
        : {
            title: "Combat d’élite",
            text: "Une élite bloque la route. Combat plus dur, meilleure récompense.",
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
            title: "Refuge instable",
            text: "Tu peux récupérer un peu, mais le refuge est instable. Les soins simples font monter la corruption.",
            choices: [
              {
                id: "rest_sleep",
                label: "Soigner le héros",
                description: "Le héros récupère 22 PV. La corruption augmente légèrement.",
                style: "sacrifice",
              },
              {
                id: "rest_focus",
                label: "Récupérer le mana",
                description: "Le héros récupère 22 Mana et gagne +1 Magie. La corruption augmente.",
                style: "power",
              },
              {
                id: "rest_cleanse",
                label: "Nettoyer les malus",
                description: "Retire les malus dangereux du héros, rend un peu de PV/Mana et réduit la corruption.",
                style: "sacrifice",
              },
            ],
          }
        : {
            title: "Refuge",
            text: "Prépare le héros avant de repartir.",
            choices: [
              {
                id: "rest_sleep",
                label: "Soigner le héros",
                description: "Le héros récupère 32 PV.",
              },
              {
                id: "rest_focus",
                label: "Récupérer le mana",
                description: "Le héros récupère 32 Mana.",
                style: "power",
              },
              {
                id: "rest_cleanse",
                label: "Nettoyer les malus",
                description: "Retire les malus dangereux du héros, puis rend 18 PV et 10 Mana.",
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
            title: "Coffre instable",
            text: "Le coffre est instable. Ouvre-le prudemment, force-le pour plus de butin, ou laisse-le fermé.",
            choices: [
              {
                id: "treasure_open_safe",
                label: "Ouvrir prudemment",
                description: "Récupère un butin moyen sans déclencher de piège.",
              },
              {
                id: "treasure_force",
                label: "Forcer le coffre",
                description: "Récupère un meilleur butin. Une mimique peut surgir ; sinon la corruption augmente.",
                style: "danger",
              },
              {
                id: "treasure_leave",
                label: "Refermer le coffre",
                description: "Tu ne prends rien. La corruption locale baisse légèrement.",
              },
            ],
          }
        : {
            title: "Trésor",
            text: "Tu peux ouvrir le coffre simplement, le forcer pour tenter plus de butin, ou l’ignorer.",
            choices: [
              {
                id: "treasure_open_safe",
                label: "Ouvrir prudemment",
                description: "Récupère un butin moyen sans piège.",
              },
              {
                id: "treasure_force",
                label: "Forcer le coffre",
                description: "Récupère un meilleur butin. Forcer le coffre peut attirer une mimique.",
                style: "power",
              },
              {
                id: "treasure_leave",
                label: "Ignorer le coffre",
                description: "Tu ne prends rien et tu repars sans risque.",
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
            title: "Événement instable",
            text: "Choisis un gain court, une fouille risquée, ou pars sans déclencher le lieu.",
            choices: [
              {
                id: "random_help",
                label: "Aider",
                description: "Gagne 22 or. Le héros perd 10 PV et reçoit une infection légère.",
                style: "danger",
              },
              {
                id: "random_search",
                label: "Fouiller",
                description: "Tu peux trouver du butin. Une embuscade peut se déclencher ; sinon la corruption augmente.",
                style: "power",
              },
              {
                id: "random_ignore",
                label: "Quitter le lieu",
                description: "Tu ne gagnes rien. La corruption locale baisse légèrement.",
              },
            ],
          }
        : {
            title: "Événement",
            text: "Choisis un gain court, une fouille de butin, ou pars sans risque.",
            choices: [
              {
                id: "random_help",
                label: "Aider",
                description: "Gagne 14 or.",
              },
              {
                id: "random_search",
                label: "Fouiller",
                description: "Tu peux trouver du butin. Une petite embuscade peut se déclencher.",
                style: "power",
              },
              {
                id: "random_ignore",
                label: "Quitter le lieu",
                description: "Tu ne gagnes rien et tu repars.",
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
            title: "Camp",
            text: "Le marchand est corrompu. Le commerce peut tourner au combat.",
          },
        };
      }

      return {
        type: "merchant",
        merchantType: "merchant_blacksmith_corrupted",
        message: {
          title: "Camp",
          text: "Forgeron disponible. Achète, vends ou améliore l’équipement.",
        },
      };
    }

    return {
      type: "merchant",
      merchantType: "merchant_blacksmith",
      message: {
        title: "Forge",
        text: "Forgeron disponible. Achète, vends ou améliore l’équipement.",
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
          label: "Camp",
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
            title: "Camp",
            text: "Le marchand est corrompu. Le commerce peut tourner au combat.",
          },
        };
      }

      return {
        type: "merchant",
        merchantType: "merchant_alchemist_corrupted",
        message: {
          title: "Camp",
          text: "Alchimiste disponible. Achète ou vends des consommables.",
        },
      };
    }

    return {
      type: "merchant",
      merchantType: "merchant_alchemist",
      message: {
        title: "Alchimiste",
        text: "Alchimiste disponible. Achète ou vends des consommables.",
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
            title: "Camp",
            text: "Le marchand est corrompu. Le commerce peut tourner au combat.",
          },
        };
      }

      return {
        type: "merchant",
        merchantType: "merchant_mystic_corrupted",
        message: {
          title: "Camp",
          text: "Mystique disponible. Achète ou vends des reliques.",
        },
      };
    }

    return {
      type: "merchant",
      merchantType: "merchant_mystic",
      message: {
        title: "Mystique",
        text: "Mystique disponible. Achète ou vends des reliques.",
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
            title: "Sanctuaire instable",
            text: "Choisis un bonus. Les options fortes coûtent des PV ou de la corruption.",
            choices: [
              {
                id: "shrine_bless",
                label: "Recevoir une bénédiction",
                description: "Le héros gagne +2 Magie et +1 Force pour les prochains combats. La corruption augmente.",
                style: "power",
              },
              {
                id: "shrine_offer",
                label: "Offrir du sang",
                description: "Le héros perd 14 PV. Il gagne un gros bonus temporaire, mais la corruption augmente beaucoup.",
                style: "danger",
              },
              {
                id: "shrine_revive",
                label: "Ressusciter un allié",
                description: "Relève un allié tombé avec une partie de ses PV.",
                style: "sacrifice",
              },
              {
                id: "shrine_leave",
                label: "Quitter le sanctuaire",
                description: "Tu refuses le sanctuaire. La corruption locale baisse légèrement.",
              },
            ],
          }
        : {
            title: "Sanctuaire",
            text: "Choisis une protection ou relève un allié tombé.",
            choices: [
              {
                id: "shrine_bless",
                label: "Recevoir une protection",
                description: "Le héros gagne +1 Défense, +1 Magie et une protection pour les prochains combats.",
              },
              {
                id: "shrine_offer",
                label: "Offrir du sang",
                description: "Le héros perd 8 PV. Il gagne +2 Défense et une protection plus forte.",
                style: "sacrifice",
              },
              {
                id: "shrine_revive",
                label: "Ressusciter un allié",
                description: "Relève un allié tombé avec une partie de ses PV.",
                style: "sacrifice",
              },
              {
                id: "shrine_leave",
                label: "Partir",
                description: "Tu repars sans bonus ni risque.",
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
        title: "Statuette",
        text:
          "La statuette affaiblit le boss. Prends-la par combat, purification ou corruption.",
        choices: [
          {
            id: "take_statue",
            label: "Prendre la statuette",
            description: "Déclenche un combat contre un gardien. Victoire : la statuette est gagnée.",
            style: "danger",
          },
          {
            id: "purify_statue",
            label: "Purifier la statuette",
            description: "Le héros perd 18 PV et 12 Mana, puis reçoit un malus temporaire. La statuette est gagnée sans combat.",
            style: "sacrifice",
          },
          {
            id: "absorb_statue",
            label: "Absorber l’énergie",
            description: "Toute l’équipe gagne +1 Force. Le héros gagne aussi +1 Force, +1 Magie et +1 Défense. La corruption augmente fortement.",
            style: "power",
          },
        ],
      },
    };
  }

  return {
    type: "nothing",
    message: {
      title: "Route libre",
      text: "Rien ne bloque la route. Continue.",
    },
  };
}