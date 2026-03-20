import { Enemy, PassiveEffect, Player, Stats } from "@/app/component/types/game";
import { addStatus } from "@/app/component/lib/statusEffects";

type PassiveContext = {
  player: Player;
  enemy: Enemy;
  playerStats: Stats;
  enemyStats: Enemy;
  playerStatuses?: ReturnType<typeof Array.prototype.concat>;
  enemyStatuses?: ReturnType<typeof Array.prototype.concat>;
  trigger: PassiveEffect["trigger"];
};

type PassiveResult = {
  playerStats: Stats;
  enemyStats: Enemy;
  playerStatuses?: ReturnType<typeof Array.prototype.concat>;
  enemyStatuses?: ReturnType<typeof Array.prototype.concat>;
  logs: string[];
};

export const PLAYER_PASSIVES = {
  iron_skin: (): PassiveEffect => ({
    id: "iron_skin",
    name: "Mur vivant",
    description: "Quand vous subissez des dégâts, gagnez 1 Bouclier pour 1 tour.",
    trigger: "after_take_damage",
    owner: "player",
    value: 1,
  }),

  mana_surge: (): PassiveEffect => ({
    id: "mana_surge",
    name: "Braise intérieure",
    description: "Au début de chaque tour, récupère 4 mana. Si la cible brûle, vos attaques gagnent 2 dégâts bonus.",
    trigger: "turn_start",
    owner: "player",
    value: 4,
  }),

  eagle_eye: (): PassiveEffect => ({
    id: "eagle_eye",
    name: "Œil du chasseur",
    description: "Après une attaque sur une cible Vulnérable, inflige 3 dégâts bonus.",
    trigger: "after_attack",
    owner: "player",
    value: 3,
  }),

  toxic_blade: (): PassiveEffect => ({
    id: "toxic_blade",
    name: "Lame venimeuse",
    description: "Après une attaque, si la cible est empoisonnée, inflige 4 dégâts bonus.",
    trigger: "after_attack",
    owner: "player",
    value: 4,
  }),

  soul_feast: (): PassiveEffect => ({
    id: "soul_feast",
    name: "Faim des âmes",
    description: "Au début du combat, gagnez +2 Magie. Après une attaque, récupérez 2 mana.",
    trigger: "combat_start",
    owner: "player",
    value: 2,
  }),

  divine_reserve: (): PassiveEffect => ({
    id: "divine_reserve",
    name: "Réserve sacrée",
    description: "Quand vous subissez des dégâts, récupérez 3 mana.",
    trigger: "after_take_damage",
    owner: "player",
    value: 3,
  }),
  arcane_focus: (): PassiveEffect => ({
    id: "arcane_focus",
    name: "Focalisation arcanique",
    description: "Au début du combat, si votre mana est au maximum, gagnez +4 Magie.",
    trigger: "combat_start",
    owner: "player",
    value: 4,
  }),

  mana_shield: (): PassiveEffect => ({
    id: "mana_shield",
    name: "Bouclier arcanique",
    description: "Quand vous subissez des dégâts, récupérez 3 mana.",
    trigger: "after_take_damage",
    owner: "player",
    value: 3,
  }),

  hunter_instinct: (): PassiveEffect => ({
    id: "hunter_instinct",
    name: "Instinct du chasseur",
    description: "Après une attaque, si la cible est sous 50% PV, inflige 4 dégâts bonus.",
    trigger: "after_attack",
    owner: "player",
    value: 4,
  }),

  assassin_instinct: (): PassiveEffect => ({
    id: "assassin_instinct",
    name: "Instinct d’assassin",
    description: "Après une attaque, si la cible est empoisonnée, inflige 4 dégâts bonus.",
    trigger: "after_attack",
    owner: "player",
    value: 4,
  }),

  executioner: (): PassiveEffect => ({
    id: "executioner",
    name: "Exécuteur",
    description: "Après une attaque, si l’ennemi est sous 35% PV, inflige 4 dégâts bonus.",
    trigger: "after_attack",
    owner: "player",
    value: 4,
  }),

  withering_presence: (): PassiveEffect => ({
    id: "withering_presence",
    name: "Présence flétrissante",
    description: "Au début du combat, applique Faiblesse à l’ennemi.",
    trigger: "combat_start",
    owner: "player",
    value: 2,
  }),

  void_resonance: (): PassiveEffect => ({
    id: "void_resonance",
    name: "Résonance du vide",
    description: "Après une attaque, si la cible est réduite au silence, inflige 4 dégâts bonus.",
    trigger: "after_attack",
    owner: "player",
    value: 4,
  }),

  holy_guard: (): PassiveEffect => ({
    id: "holy_guard",
    name: "Garde sacrée",
    description: "Quand vous subissez des dégâts, gagnez 1 Bouclier.",
    trigger: "after_take_damage",
    owner: "player",
    value: 1,
  }),

  judicator: (): PassiveEffect => ({
    id: "judicator",
    name: "Juge sacré",
    description: "Après une attaque, si la cible est affaiblie, inflige 4 dégâts bonus.",
    trigger: "after_attack",
    owner: "player",
    value: 4,
  }),

  martyr_light: (): PassiveEffect => ({
    id: "martyr_light",
    name: "Lumière du martyr",
    description: "Quand vous subissez des dégâts, récupère 2 mana et 2 PV.",
    trigger: "after_take_damage",
    owner: "player",
    value: 2,
  }),

  second_wind: (): PassiveEffect => ({
    id: "second_wind",
    name: "Second souffle",
    description: "Au début du combat, si vos PV sont à 40% ou moins, récupère 12 PV.",
    trigger: "combat_start",
    owner: "player",
    oncePerCombat: true,
    value: 12,
  }),

  battle_focus: (): PassiveEffect => ({
    id: "battle_focus",
    name: "Concentration de combat",
    description: "Au début de chaque tour, récupère 4 mana.",
    trigger: "turn_start",
    owner: "player",
    value: 4,
  }),

  thorn_skin: (): PassiveEffect => ({
    id: "thorn_skin",
    name: "Peau d'épines",
    description: "Quand vous subissez des dégâts, l'ennemi perd 3 PV.",
    trigger: "after_take_damage",
    owner: "player",
    value: 3,
  }),

  blessed_steps: (): PassiveEffect => ({
    id: "blessed_steps",
    name: "Pas bénis",
    description: "En entrant sur une case, récupère 3 PV.",
    trigger: "map_enter_node",
    owner: "player",
    value: 3,
  }),

  survivor_instinct: (): PassiveEffect => ({
    id: "survivor_instinct",
    name: "Instinct de survie",
    description: "En fin de tour sur la carte, récupère 2 PV si vous êtes sous 50% PV.",
    trigger: "map_end_turn",
    owner: "player",
    value: 2,
  }),

    sacred_skin: (): PassiveEffect => ({
        id: "sacred_skin",
        name: "Protection sacrée",
        description: "Quand vous subissez des dégâts, gagne 8 mana.",
        trigger: "after_take_damage",
        owner: "player",
        value: 8,
    })
};

export const ENEMY_PASSIVES = {
  poison_aura: (): PassiveEffect => ({
    id: "poison_aura",
    name: "Aura toxique",
    description: "Le joueur perd 2 PV au début de chaque tour ennemi.",
    trigger: "turn_start",
    owner: "enemy",
    value: 2,
  }),

  stone_hide: (): PassiveEffect => ({
    id: "stone_hide",
    name: "Peau de pierre",
    description: "Réduit légèrement les dégâts subis.",
    trigger: "before_take_damage",
    owner: "enemy",
    value: 2,
  }),
};

export function runPassives(
  passives: PassiveEffect[],
  ctx: PassiveContext
): PassiveResult {
  let playerStats = { ...ctx.playerStats };
  let enemyStats = { ...ctx.enemyStats };
  let playerStatuses = [...((ctx.playerStatuses as any[]) ?? ctx.player.statuses ?? [])];
  let enemyStatuses = [...((ctx.enemyStatuses as any[]) ?? ctx.enemy.statuses ?? [])];
  const logs: string[] = [];

  const hasEnemyStatus = (type: string) =>
    enemyStatuses.some((status: any) => status.type === type);

  const hasPlayerStatus = (type: string) =>
    playerStatuses.some((status: any) => status.type === type);

  for (const passive of passives) {
    if (passive.trigger !== ctx.trigger) continue;
    if (passive.chance && Math.random() > passive.chance) continue;

    // --- PLAYER PASSIVES ---

    if (passive.id === "second_wind" && passive.owner === "player") {
      if (playerStats.hp <= Math.floor(playerStats.maxHp * 0.4)) {
        playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + (passive.value ?? 0));
        logs.push(`✨ ${passive.name} : +${passive.value ?? 0} PV`);
      }
    }

    if (passive.id === "battle_focus" && passive.owner === "player") {
      playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + (passive.value ?? 0));
      logs.push(`🧠 ${passive.name} : +${passive.value ?? 0} mana`);
    }

    if (passive.id === "mana_surge" && passive.owner === "player") {
      playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + (passive.value ?? 0));
      logs.push(`⚡ ${passive.name} : +${passive.value ?? 0} mana`);
    }

    if (passive.id === "mana_shield" && passive.owner === "player") {
      playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + (passive.value ?? 0));
      logs.push(`🔷 ${passive.name} : +${passive.value ?? 0} mana`);
    }

    if (passive.id === "sacred_skin" && passive.owner === "player") {
      playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + (passive.value ?? 0));
      logs.push(`🕊️ ${passive.name} : +${passive.value ?? 0} mana`);
    }

    if (passive.id === "divine_reserve" && passive.owner === "player") {
      playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + (passive.value ?? 0));
      logs.push(`✨ ${passive.name} : +${passive.value ?? 0} PV`);
    }

    if (passive.id === "thorn_skin" && passive.owner === "player") {
      enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
      logs.push(`🌵 ${passive.name} : l'ennemi perd ${passive.value ?? 0} PV`);
    }

    if (passive.id === "iron_skin" && passive.owner === "player") {
      playerStatuses = addStatus(playerStatuses, {
        type: "shield",
        value: passive.value ?? 1,
        duration: 1,
        source: passive.id,
      });
      logs.push(`🛡️ ${passive.name} : Bouclier gagné`);
    }

    if (passive.id === "holy_guard" && passive.owner === "player") {
      playerStatuses = addStatus(playerStatuses, {
        type: "shield",
        value: passive.value ?? 1,
        duration: 1,
        source: passive.id,
      });
      logs.push(`🛡️ ${passive.name} : Bouclier sacré`);
    }

    if (passive.id === "martyr_light" && passive.owner === "player") {
      playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + (passive.value ?? 0));
      playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + (passive.value ?? 0));
      logs.push(`💖 ${passive.name} : +${passive.value ?? 0} PV et +${passive.value ?? 0} mana`);
    }

    if (passive.id === "soul_feast" && passive.owner === "player") {
      playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + (passive.value ?? 0));
      logs.push(`🕯️ ${passive.name} : +${passive.value ?? 0} PV`);
    }

    if (passive.id === "battle_rage" && passive.owner === "player") {
      if (playerStats.hp <= Math.floor(playerStats.maxHp * 0.5)) {
        playerStats.strength += passive.value ?? 0;
        logs.push(`🔥 ${passive.name} : +${passive.value ?? 0} Force`);
      }
    }

    if (passive.id === "arcane_focus" && passive.owner === "player") {
      if (playerStats.mana >= playerStats.maxMana) {
        playerStats.magic += passive.value ?? 0;
        logs.push(`🔮 ${passive.name} : +${passive.value ?? 0} Magie`);
      }
    }

    if (passive.id === "withering_presence" && passive.owner === "player") {
      enemyStatuses = addStatus(enemyStatuses, {
        type: "weakness",
        value: passive.value ?? 2,
        duration: 3,
        source: passive.id,
      });
      logs.push(`🥀 ${passive.name} applique Faiblesse`);
    }

    if (passive.id === "toxic_blade" && passive.owner === "player") {
      enemyStatuses = addStatus(enemyStatuses, {
        type: "poison",
        value: passive.value ?? 4,
        duration: 2,
        source: passive.id,
      });
      logs.push(`☠️ ${passive.name} applique Poison`);
    }

    if (passive.id === "pyromancy" && passive.owner === "player") {
      if (hasEnemyStatus("burn")) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`🔥 ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "armor_breaker" && passive.owner === "player") {
      if (hasEnemyStatus("frailty")) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`⚒️ ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "eagle_eye" && passive.owner === "player") {
      if (hasEnemyStatus("vulnerability")) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`🎯 ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "hunter_instinct" && passive.owner === "player") {
      if (enemyStats.hp <= Math.floor(enemyStats.maxHp * 0.5)) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`🏹 ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "assassin_instinct" && passive.owner === "player") {
      if (hasEnemyStatus("poison")) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`🗡️ ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "executioner" && passive.owner === "player") {
      if (enemyStats.hp <= Math.floor(enemyStats.maxHp * 0.35)) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`🪓 ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "void_resonance" && passive.owner === "player") {
      if (hasEnemyStatus("silence")) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`🌌 ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "judicator" && passive.owner === "player") {
      const targetWeakened =
        hasEnemyStatus("frailty") ||
        hasEnemyStatus("weakness") ||
        hasEnemyStatus("vulnerability") ||
        enemyStats.hp <= Math.floor(enemyStats.maxHp * 0.5);

      if (targetWeakened) {
        enemyStats.hp = Math.max(0, enemyStats.hp - (passive.value ?? 0));
        logs.push(`☀️ ${passive.name} : ${passive.value ?? 0} dégâts bonus`);
      }
    }

    if (passive.id === "unyielding" && passive.owner === "player") {
      if (hasPlayerStatus("shield")) {
        playerStats.defense += passive.value ?? 0;
        logs.push(`🛡️ ${passive.name} : +${passive.value ?? 0} Défense`);
      }
    }

    // --- MAP PASSIVES ---

    if (passive.id === "blessed_steps" && passive.owner === "player") {
      playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + (passive.value ?? 0));
      logs.push(`👣 ${passive.name} : +${passive.value ?? 0} PV`);
    }

    if (passive.id === "survivor_instinct" && passive.owner === "player") {
      if (playerStats.hp <= Math.floor(playerStats.maxHp * 0.5)) {
        playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + (passive.value ?? 0));
        logs.push(`🌿 ${passive.name} : +${passive.value ?? 0} PV`);
      }
    }

    // --- ENEMY PASSIVES ---

    if (passive.id === "poison_aura" && passive.owner === "enemy") {
      playerStats.hp = Math.max(1, playerStats.hp - (passive.value ?? 0));
      logs.push(`☣️ ${passive.name} : -${passive.value ?? 0} PV`);
    }

    if (passive.id === "stone_hide" && passive.owner === "enemy") {
      logs.push(`🪨 ${passive.name} réduit les dégâts subis.`);
    }
  }

  return { playerStats, enemyStats, playerStatuses, enemyStatuses, logs };
}