import { Enemy, EnemyAttack, LocationTheme, MapNode, EliteRewardCategory, EnemySourceTag, PassiveEffect, BossMechanicType, } from "@/shared/types/game";

import { ENEMY_PASSIVES } from "@/shared/lib/passives";

type EnemyTemplate = {
  name: string;
  hp: number;
  strength: number;
  magic: number;
  defense: number;
  speed: number;
  image: string;
  archetype: Enemy["archetype"];
  phaseTwoImage?: string;
  passive?: string;
  passives?: PassiveEffect[];
  specialAttack?: string;
  rewardCategory?: EliteRewardCategory;
  sourceTag?: EnemySourceTag;
  isBoss?: boolean;
  bossMechanic?: BossMechanicType;
};

type NormalEncounterSize = 1 | 2 | 3;

function rollNormalEncounterSizeByFloor(floor: number): NormalEncounterSize {
  const roll = Math.random();

  if (floor <= 1) {
    if (roll < 0.78) return 1;
    if (roll < 0.97) return 2;
    return 3;
  }

  if (floor <= 3) {
    if (roll < 0.62) return 1;
    if (roll < 0.9) return 2;
    return 3;
  }

  if (roll < 0.5) return 1;
  if (roll < 0.84) return 2;
  return 3;
}

export function createEnemyGroupFromNode(node: MapNode): Enemy[] {
  const size = rollNormalEncounterSizeByFloor(node.depth);

  if (size === 1) {
    return [createEnemyFromNode(node)];
  }

  const group: Enemy[] = [];

  for (let i = 0; i < size; i++) {
    const enemy = createEnemyFromNode(node);

    // Petit ajustement pour éviter que 3 ennemis soient trop violents
    const hpMultiplier = size === 2 ? 0.88 : 0.72;
    const dmgMultiplier = size === 2 ? 0.94 : 0.82;

    group.push({
      ...enemy,
      name: size > 1 ? `${enemy.name}` : enemy.name,
      hp: Math.max(1, Math.floor(enemy.hp * hpMultiplier)),
      maxHp: Math.max(1, Math.floor(enemy.maxHp * hpMultiplier)),
      strength: Math.max(1, Math.floor(enemy.strength * dmgMultiplier)),
      magic: Math.max(1, Math.floor(enemy.magic * dmgMultiplier)),
      defense: Math.max(0, Math.floor(enemy.defense * (size === 2 ? 0.95 : 0.85))),
      speed: enemy.speed,
      statuses: [],
    });
  }

  return group;
}

function getAttacksForArchetype(
  archetype: Enemy["archetype"],
  specialAttack?: string
): EnemyAttack[] {
  switch (archetype) {
    case "brute":
      return [
        {
          id: "brute_slam",
          name: "Coup brutal",
          description: "Une frappe lourde et directe.",
          kind: "physical",
          powerMultiplier: 1.0,
        },
        {
          id: "brute_charge",
          name: "Charge sauvage",
          description: "Une ruée violente qui inflige de gros dégâts.",
          kind: "physical",
          powerMultiplier: 1.45,
          critChance: 0.1,
        },
        {
          id: "brute_stomp",
          name: "Piétinement",
          description: "Écrase la cible et la fragilise.",
          kind: "physical",
          powerMultiplier: 0.95,
          statusEffect: {
            type: "frailty",
            value: 1,
            duration: 3,
            target: "player",
          },
        },
        {
          id: "brute_roar",
          name: "Rugissement de guerre",
          description: "Se met en rage avant la prochaine frappe.",
          kind: "physical",
          powerMultiplier: 1.15,
          statusEffect: {
            type: "shield",
            value: 9,
            duration: 2,
            target: "enemy",
          },
        },
      ];

    case "assassin":
      return [
        {
          id: "assassin_slash",
          name: "Entaille vive",
          description: "Une coupe rapide et nette.",
          kind: "physical",
          powerMultiplier: 0.95,
          critChance: 0.2,
        },
        {
          id: "assassin_poison",
          name: "Poison de l’ombre",
          description: "Injecte un poison corrosif.",
          kind: "physical",
          powerMultiplier: 0.8,
          statusEffect: {
            type: "poison",
            value: 5,
            duration: 3,
            target: "player",
          },
        },
        {
          id: "assassin_hunt",
          name: "Traque sanglante",
          description: "Frappe une cible déjà affaiblie.",
          kind: "physical",
          powerMultiplier: 1.2,
          critChance: 0.25,
        },
        {
          id: "assassin_gap",
          name: "Frappe perfide",
          description: "Une attaque rapide qui expose la cible.",
          kind: "physical",
          powerMultiplier: 1.05,
          statusEffect: {
            type: "vulnerability",
            value: 2,
            duration: 3,
            target: "player",
          },
        },
      ];

    case "mage":
      return [
        {
          id: "mage_bolt",
          name: "Trait occulte",
          description: "Projette un projectile de magie noire.",
          kind: "magical",
          powerMultiplier: 1.0,
        },
        {
          id: "mage_blackflame",
          name: "Flamme noire",
          description: "Brûle la cible.",
          kind: "magical",
          powerMultiplier: 1.1,
          statusEffect: {
            type: "burn",
            value: 6,
            duration: 2,
            target: "player",
          },
        },
        {
          id: "mage_silence",
          name: "Voile du néant",
          description: "Étouffe la magie de la cible.",
          kind: "magical",
          powerMultiplier: 0.8,
          statusEffect: {
            type: "silence",
            value: 1,
            duration: 1,
            target: "player",
          },
        },
        {
          id: "mage_burst",
          name: "Explosion impie",
          description: "Une explosion magique violent.",
          kind: "magical",
          powerMultiplier: 1.35,
          critChance: 0.12,
        },
      ];

    case "tank":
      return [
        {
          id: "tank_bash",
          name: "Heurt blindé",
          description: "Une attaque lourde.",
          kind: "physical",
          powerMultiplier: 0.9,
        },
        {
          id: "tank_guard",
          name: "Garde renforcée",
          description: "Renforce sa protection.",
          kind: "physical",
          powerMultiplier: 0.25,
          statusEffect: {
            type: "shield",
            value: 12,
            duration: 1,
            target: "enemy",
          },
        },
        {
          id: "tank_crush",
          name: "Écrasement",
          description: "Affaiblit la résistance de la cible.",
          kind: "physical",
          powerMultiplier: 0.75,
          statusEffect: {
            type: "frailty",
            value: 2,
            duration: 3,
            target: "player",
          },
        },
        {
          id: "tank_anchor",
          name: "Ancrage de pierre",
          description: "Se rend encore plus dur à abattre.",
          kind: "physical",
          powerMultiplier: 0.85,
          statusEffect: {
            type: "shield",
            value: 12,
            duration: 1,
            target: "enemy",
          },
        },
      ];

    case "leech":
      return [
        {
          id: "leech_bite",
          name: "Morsure infectée",
          description: "Une morsure sale et venimeuse.",
          kind: "hybrid",
          powerMultiplier: 0.95,
          statusEffect: {
            type: "poison",
            value: 4,
            duration: 2,
            target: "player",
          },
        },
        {
          id: "leech_rot",
          name: "Souillure rampante",
          description: "Affaiblit lentement la proie.",
          kind: "hybrid",
          powerMultiplier: 0.95,
          statusEffect: {
            type: "weakness",
            value: 2,
            duration: 2,
            target: "player",
          },
        },
        {
          id: "leech_drain",
          name: "Drain profane",
          description: "Absorbe la vie de la cible.",
          kind: "hybrid",
          powerMultiplier: 0.85,
          selfHealPercent: 0.5,
        },
        {
          id: "leech_grasp",
          name: "Étreinte putride",
          description: "Une pression corruptrice plus lourde.",
          kind: "hybrid",
          powerMultiplier: 1.2,
        },
      ];

    default:
      return [
        {
          id: "default_hit",
          name: "Attaque",
          description: "Une attaque simple.",
          kind: "physical",
          powerMultiplier: 1.0,
        },
      ];
  }
}

const ENEMIES_BY_THEME: Partial<Record<LocationTheme, EnemyTemplate[]>> = {
  forest: [
    {
      name: "Mastoglier sauvage",
      hp: 78,
      strength: 13,
      magic: 2,
      defense: 6,
      speed: 5,
      image: "enemies/forest/forest_monster_01.jpg",
      archetype: "brute",
      passive: "Furie bestiale",
      specialAttack: "Charge brutale",
      passives: [ENEMY_PASSIVES.brute_force()],
    },
    {
      name: "Traqueur des fourrés",
      hp: 60,
      strength: 10,
      magic: 2,
      defense: 4,
      speed: 11,
      image: "enemies/forest/forest_monster_02.jpg",
      archetype: "assassin",
      passive: "Instinct du chasseur",
      specialAttack: "Bond perfide",
      passives: [ENEMY_PASSIVES.quick_killer()],
    },
    {
      name: "Gardebois noueux",
      hp: 86,
      strength: 8,
      magic: 3,
      defense: 10,
      speed: 4,
      image: "enemies/forest/forest_monster_03.jpg",
      archetype: "tank",
      passive: "Écorce vivante",
      specialAttack: "Écorce renforcée",
      passives: [ENEMY_PASSIVES.bulwark()],
    },
    {
      name: "Druide creux",
      hp: 66,
      strength: 4,
      magic: 15,
      defense: 5,
      speed: 8,
      image: "/enemies/forest/forest_monster_04.jpg",
      archetype: "mage",
      passive: "Sève funeste",
      specialAttack: "Éclat de sève noire",
      passives: [ENEMY_PASSIVES.arcane_hunger()],
    },
    {
      name: "Sangsève rampant",
      hp: 74,
      strength: 7,
      magic: 8,
      defense: 5,
      speed: 7,
      image: "/enemies/forest/forest_monster_05.jpg",
      archetype: "leech",
      passive: "Sève dévorante",
      specialAttack: "Drain des racines",
      passives: [ENEMY_PASSIVES.soul_drinker(), ENEMY_PASSIVES.toxic_blood()],
    },
    {
      name: "Ronce-louve",
      hp: 54,
      strength: 9,
      magic: 2,
      defense: 3,
      speed: 13,
      image: "/enemies/forest/forest_monster_06.jpg",
      archetype: "assassin",
      passive: "Crocs des ronces",
      specialAttack: "Bond lacérant",
      passives: [ENEMY_PASSIVES.quick_killer(), ENEMY_PASSIVES.ambush_strike()],
    }
  ],

  ruins: [
    {
      name: "Acolyte des cendres",
      hp: 64,
      strength: 4,
      magic: 14,
      defense: 5,
      speed: 8,
      image: "/enemies/ruins/ruins_monster_01.jpg",
      archetype: "mage",
      passive: "Étincelle profane",
      specialAttack: "Braise du vide",
      passives: [ENEMY_PASSIVES.arcane_hunger()],
    },
    {
      name: "Sentinelle brisé",
      hp: 90,
      strength: 11,
      magic: 4,
      defense: 11,
      speed: 4,
      image: "/enemies/ruins/ruins_monster_02.jpg",
      archetype: "tank",
      passive: "Armure antique",
      specialAttack: "Carapace runique",
      passives: [ENEMY_PASSIVES.bulwark()],
    },
    {
      name: "Briseur de stèles",
      hp: 84,
      strength: 14,
      magic: 3,
      defense: 7,
      speed: 5,
      image: "/enemies/ruins/ruins_monster_03.jpg",
      archetype: "brute",
      passive: "Fureur des stèles",
      specialAttack: "Fracassement liturgique",
      passives: [ENEMY_PASSIVES.brute_force(), ENEMY_PASSIVES.executioner_instinct()],
    },
    {
      name: "Siphonneur runique",
      hp: 72,
      strength: 6,
      magic: 10,
      defense: 5,
      speed: 7,
      image: "/enemies/ruins/ruins_monster_04.jpg",
      archetype: "leech",
      passive: "Faim runique",
      specialAttack: "Drain du sceau",
      passives: [ENEMY_PASSIVES.soul_drinker(), ENEMY_PASSIVES.arcane_hunger()],
    },
    {
      name: "Porte-lambeau profane",
      hp: 62,
      strength: 4,
      magic: 16,
      defense: 4,
      speed: 9,
      image: "/enemies/ruins/ruins_monster_05.jpg",
      archetype: "mage",
      passive: "Flamme de relique",
      specialAttack: "Lambeau rituel",
      passives: [ENEMY_PASSIVES.arcane_hunger(), ENEMY_PASSIVES.corruption_aura()],
    },
    {
      name: "Cultiste des failles",
      hp: 58,
      strength: 12,
      magic: 2,
      defense: 4,
      speed: 12,
      image: "/enemies/ruins/ruins_monster_06.jpg",
      archetype: "assassin",
      passive: "Frappe de ruine",
      specialAttack: "Découpe des failles",
      passives: [ENEMY_PASSIVES.quick_killer()],
    },

  ],

  crypt: [
    {
      name: "Larve corrompue",
      hp: 72,
      strength: 7,
      magic: 8,
      defense: 5,
      speed: 7,
      image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?q=80&w=400",
      archetype: "leech",
      passive: "Appétit funèbre",
      specialAttack: "Souillure rampante",
      passives: [ENEMY_PASSIVES.soul_drinker()],
    },
    {
      name: "Prêtre sépulcral",
      hp: 68,
      strength: 4,
      magic: 16,
      defense: 5,
      speed: 8,
      image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
      archetype: "mage",
      passive: "Prière inversée",
      specialAttack: "Voile funéraire",
      passives: [ENEMY_PASSIVES.arcane_hunger()],
    },
    {
      name: "Géant d'os",
      hp: 96,
      strength: 14,
      magic: 2,
      defense: 7,
      speed: 3,
      image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400",
      archetype: "brute",
      passive: "Marche écrasante",
      specialAttack: "Fracassement ossifié",
      passives: [ENEMY_PASSIVES.brute_force()],
    },
  ],
  swamp: [
    {
      name: "Rampant putride",
      hp: 70,
      strength: 9,
      magic: 6,
      defense: 5,
      speed: 6,
      image: "/enemies/swamp_creature_01.jpg",
      archetype: "leech",
      passive: "Putréfaction lente",
      specialAttack: "Morsure infectée",
      passives: [ENEMY_PASSIVES.poison_aura()],
    },
    {
      name: "Chasseur des marais",
      hp: 62,
      strength: 12,
      magic: 2,
      defense: 4,
      speed: 11,
      image: "/enemies/swamp_creature_02.jpg",
      archetype: "assassin",
      passive: "Camouflage boueux",
      specialAttack: "Bond toxique",
      passives: [ENEMY_PASSIVES.ambush_strike()],
    },
    {
      name: "Colosse vaseux",
      hp: 92,
      strength: 11,
      magic: 3,
      defense: 11,
      speed: 3,
      image: "/enemies/swamp_creature_03.jpg",
      archetype: "tank",
      passive: "Chair marécageuse",
      specialAttack: "Écrasement fangeux",
      passives: [ENEMY_PASSIVES.swamp_regen()],
    },
  ],

  mountain: [
    {
      name: "Brise-crâne des pics",
      hp: 88,
      strength: 15,
      magic: 2,
      defense: 7,
      speed: 5,
      image: "/enemies/mountain_01.jpg",
      archetype: "brute",
      passive: "Force des hauteurs",
      specialAttack: "Frappe écrasante",
      passives: [ ENEMY_PASSIVES.brute_force(), ENEMY_PASSIVES.executioner_instinct()],
    },
    {
      name: "Éclaireur des falaises",
      hp: 58,
      strength: 11,
      magic: 3,
      defense: 4,
      speed: 12,
      image: "/enemies/mountain_02.jpg",
      archetype: "assassin",
      passive: "Frappe en plongée",
      specialAttack: "Assaut rapide",
      passives: [ ENEMY_PASSIVES.quick_killer(), ENEMY_PASSIVES.ambush_strike()],
    },
    {
      name: "Golem de granit",
      hp: 104,
      strength: 10,
      magic: 2,
      defense: 13,
      speed: 2,
      image: "/enemies/mountain_03.jpg",
      archetype: "tank",
      passive: "Peau de pierre",
      specialAttack: "Ancrage massif",
      passives: [ENEMY_PASSIVES.stone_hide(), ENEMY_PASSIVES.stone_core()],
    },
  ],
  cathedral: [
    {
      name: "Fanatique déchu",
      hp: 66,
      strength: 6,
      magic: 15,
      defense: 5,
      speed: 8,
      image: "/enemies/cathedral_01.jpg",
      archetype: "mage",
      passive: "Foi brisée",
      specialAttack: "Flamme sacrée corrompue",
      passives: [ENEMY_PASSIVES.arcane_hunger(), ENEMY_PASSIVES.corruption_aura()],
    },
    {
      name: "Inquisiteur corrompu",
      hp: 78,
      strength: 13,
      magic: 5,
      defense: 7,
      speed: 7,
      image: "/enemies/cathedral_02.jpg",
      archetype: "brute",
      passive: "Zèle fanatique",
      specialAttack: "Jugement cruel",
      passives: [ENEMY_PASSIVES.brute_force(), ENEMY_PASSIVES.executioner_instinct()],
    },
    {
      name: "Gardien des reliques",
      hp: 96,
      strength: 9,
      magic: 6,
      defense: 12,
      speed: 4,
      image: "/enemies/cathedral_03.jpg",
      archetype: "tank",
      passive: "Bouclier sacré fissuré",
      specialAttack: "Protection divine",
      passives: [ENEMY_PASSIVES.bulwark(), ENEMY_PASSIVES.stone_core()],
    },
  ],
  cavern: [
    {
      name: "Parasite cavernicole",
      hp: 74,
      strength: 8,
      magic: 7,
      defense: 5,
      speed: 7,
      image: "/enemies/cavern_01.jpg",
      archetype: "leech",
      passive: "Infection profonde",
      specialAttack: "Drain vital",
      passives: [ENEMY_PASSIVES.toxic_blood()],
    },
    {
      name: "Rôdeur des ombres",
      hp: 60,
      strength: 12,
      magic: 3,
      defense: 4,
      speed: 12,
      image: "/enemies/cavern_02.jpg",
      archetype: "assassin",
      passive: "Attaque dans l’ombre",
      specialAttack: "Frappe sournoise",
      passives: [ENEMY_PASSIVES.quick_killer(), ENEMY_PASSIVES.ambush_strike()],
    },
    {
      name: "Titan des profondeurs",
      hp: 108,
      strength: 14,
      magic: 3,
      defense: 11,
      speed: 3,
      image: "/enemies/cavern_03.jpg",
      archetype: "brute",
      passive: "Pression abyssale",
      specialAttack: "Écrasement tectonique",
      passives: [ENEMY_PASSIVES.brute_force(), ENEMY_PASSIVES.stone_hide()],
    },
  ],
  ashlands: [
    {
      name: "Incendiaire des cendres",
      hp: 68,
      strength: 5,
      magic: 16,
      defense: 5,
      speed: 9,
      image: "/enemies/ashlands_01.jpg",
      archetype: "mage",
      passive: "Flammes instables",
      specialAttack: "Explosion de cendres",
      passives: [ENEMY_PASSIVES.arcane_hunger(), ENEMY_PASSIVES.burning_skin()],
    },
    {
      name: "Berserker calciné",
      hp: 84,
      strength: 16,
      magic: 2,
      defense: 6,
      speed: 8,
      image: "/enemies/ashlands_02.jpg",
      archetype: "brute",
      passive: "Rage brûlante",
      specialAttack: "Furie ardente",
      passives: [ENEMY_PASSIVES.brute_force()],
    },
    {
      name: "Gardien volcanique",
      hp: 102,
      strength: 11,
      magic: 4,
      defense: 12,
      speed: 3,
      image: "/enemies/ashlands_03.jpg",
      archetype: "tank",
      passive: "Carapace en fusion",
      specialAttack: "Armure incandescente",
      passives: [ENEMY_PASSIVES.bulwark()],
    },
  ],
};


const BOSS_POOL_BY_THEME: Partial<Record<LocationTheme, EnemyTemplate[]>> = {
  forest: [
    {
      name: "Cœur sauvage",
      hp: 180,
      strength: 18,
      magic: 8,
      defense: 9,
      speed: 7,
      image: "/boss/forest_boss_01-1.jpg",
      phaseTwoImage: "/boss/forest_boss_01-2.jpg",
      archetype: "brute",
      passive: "Battement",
      specialAttack: "Déchirure",
      passives: [ENEMY_PASSIVES.brute_force(), ENEMY_PASSIVES.bulwark()],
      isBoss: true,
      bossMechanic: "feral_heart",
    },
  ],
  ruins: [
    {
      name: "Oracle",
      hp: 165,
      strength: 6,
      magic: 20,
      defense: 8,
      speed: 9,
      image: "/boss/ruins_boss_01.jpg",
      archetype: "mage",
      passive: "Voix",
      specialAttack: "Pluie de cendres",
      passives: [ENEMY_PASSIVES.arcane_hunger()],
      isBoss: true,
      bossMechanic: "tainted_oracle",
    },
  ],
  crypt: [
    {
      name: "Cœur noir",
      hp: 190,
      strength: 14,
      magic: 16,
      defense: 10,
      speed: 7,
      image: "/boss/crypt_boss_01.jpg",
      archetype: "leech",
      passive: "Faim",
      specialAttack: "Appel",
      passives: [ENEMY_PASSIVES.soul_drinker(), ENEMY_PASSIVES.bulwark()],
      isBoss: true,
      bossMechanic: "grave_heart",
    },
  ],
  swamp: [
    {
      name: "Racine peste",
      hp: 176,
      strength: 8,
      magic: 18,
      defense: 9,
      speed: 6,
      image: "/boss/crypt_boss_01.jpg",
      archetype: "leech",
      passive: "Peste",
      specialAttack: "Nappe verte",
      passives: [ENEMY_PASSIVES.soul_drinker(), ENEMY_PASSIVES.corruption_aura()],
      isBoss: true,
      bossMechanic: "plague_root",
    },
  ],
  mountain: [
    {
      name: "Colosse",
      hp: 220,
      strength: 18,
      magic: 4,
      defense: 14,
      speed: 3,
      image: "/boss/crypt_boss_01.jpg",
      archetype: "tank",
      passive: "Pierre",
      specialAttack: "Écrasement",
      passives: [ENEMY_PASSIVES.bulwark(), ENEMY_PASSIVES.stone_core()],
      isBoss: true,
      bossMechanic: "stone_colossus",
    },
  ],
  cavern: [
    {
      name: "Mère écho",
      hp: 172,
      strength: 12,
      magic: 15,
      defense: 8,
      speed: 11,
      image: "/boss/ruins_boss_01.jpg",
      archetype: "assassin",
      passive: "Écho",
      specialAttack: "Résonance",
      passives: [ENEMY_PASSIVES.quick_killer()],
      isBoss: true,
      bossMechanic: "echo_brood",
    },
  ],
  cathedral: [
    {
      name: "Cœur-Monde",
      hp: 285,
      strength: 12,
      magic: 26,
      defense: 15,
      speed: 8,
      image: "/boss/ruins_boss_01.jpg",
      phaseTwoImage: "/boss/forest_boss_01-2.jpg",
      archetype: "mage",
      passive: "Filtration sacrée",
      specialAttack: "Second Voile",
      passives: [ENEMY_PASSIVES.arcane_hunger(), ENEMY_PASSIVES.bulwark(), ENEMY_PASSIVES.corruption_aura()],
      isBoss: true,
      bossMechanic: "world_heart",
    },
  ],
  ashlands: [
    {
      name: "Bûcher",
      hp: 188,
      strength: 12,
      magic: 20,
      defense: 8,
      speed: 9,
      image: "/boss/forest_boss_01-2.jpg",
      archetype: "mage",
      passive: "Braise",
      specialAttack: "Brasier",
      passives: [ENEMY_PASSIVES.arcane_hunger(), ENEMY_PASSIVES.burning_skin()],
      isBoss: true,
      bossMechanic: "ashen_pyre",
    },
  ],
};

const SPECIAL_ENEMIES_BY_TAG: Record<
  EnemySourceTag,
  Partial<Record<LocationTheme, EnemyTemplate[]>>
> = {
  normal: {},

  elite: {
    forest: [
      {
        name: "Bourreau des failles",
        hp: 108,
        strength: 18,
        magic: 2,
        defense: 7,
        speed: 10,
        image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=400",
        archetype: "assassin",
        passive: "Présence terrifiante",
        specialAttack: "Exécution",
        rewardCategory: "weapon",
        sourceTag: "elite",
        passives: [ENEMY_PASSIVES.quick_killer()],
      },
      {
        name: "Gardien de l’écorce noire",
        hp: 118,
        strength: 12,
        magic: 4,
        defense: 12,
        speed: 4,
        image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400",
        archetype: "tank",
        passive: "Mur végétal",
        specialAttack: "Écorce maudite",
        rewardCategory: "armor",
        sourceTag: "elite",
        passives: [ENEMY_PASSIVES.bulwark()],
      },
      {
      name: "Cerf-ruine",
      hp: 114,
      strength: 16,
      magic: 5,
      defense: 8,
      speed: 7,
      image: "/enemies/forest/forest_elite_03.jpg",
      archetype: "brute",
      passive: "Bois de massacre",
      specialAttack: "Charge des ramures",
      rewardCategory: "weapon",
      sourceTag: "elite",
      passives: [ENEMY_PASSIVES.brute_force(), ENEMY_PASSIVES.executioner_instinct()],
    }
    ],

    ruins: [
      {
        name: "Oracle souillé",
        hp: 94,
        strength: 5,
        magic: 19,
        defense: 6,
        speed: 9,
        image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
        archetype: "mage",
        passive: "Braise du vide",
        specialAttack: "Sceau muet",
        rewardCategory: "relic",
        sourceTag: "elite",
        passives: [ENEMY_PASSIVES.arcane_hunger()],
      },
      {
        name: "Sentinelle fracturée",
        hp: 112,
        strength: 13,
        magic: 4,
        defense: 12,
        speed: 5,
        image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
        archetype: "tank",
        passive: "Armure de faille",
        specialAttack: "Mur des ruines",
        rewardCategory: "armor",
        sourceTag: "elite",
        passives: [ENEMY_PASSIVES.bulwark()],
      },
      {
        name: "Gardien des archives",
        hp: 110,
        strength: 8,
        magic: 17,
        defense: 8,
        speed: 7,
        image: "/enemies/ruins/ruins_elite_03.jpg",
        archetype: "mage",
        passive: "Sceau interdit",
        specialAttack: "Lecture funeste",
        rewardCategory: "relic",
        sourceTag: "elite",
        passives: [ENEMY_PASSIVES.arcane_hunger(), ENEMY_PASSIVES.corruption_aura()],
      }
    ],

    crypt: [
      {
        name: "Parasite cardinal",
        hp: 102,
        strength: 8,
        magic: 11,
        defense: 6,
        speed: 8,
        image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?q=80&w=400",
        archetype: "leech",
        passive: "Faim profane",
        specialAttack: "Infection royale",
        rewardCategory: "relic",
        sourceTag: "elite",
        passives: [ENEMY_PASSIVES.soul_drinker()],
      },
      {
        name: "Chevalier du caveau",
        hp: 120,
        strength: 16,
        magic: 3,
        defense: 10,
        speed: 6,
        image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400",
        archetype: "brute",
        passive: "Jugement du tombeau",
        specialAttack: "Fracassement sépulcral",
        rewardCategory: "weapon",
        sourceTag: "elite",
        passives: [ENEMY_PASSIVES.brute_force()],
      },
    ],
  },

  statue_guardian: {
    forest: [
      {
        name: "Gardien de racines",
        hp: 98,
        strength: 13,
        magic: 7,
        defense: 9,
        speed: 3,
        image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400",
        archetype: "tank",
        passive: "Veilleur de relique",
        specialAttack: "Chaînes végétales",
        rewardCategory: "relic",
        sourceTag: "statue_guardian",
        passives: [ENEMY_PASSIVES.bulwark()],
      },
      {
      name: "Veilleur du taillis",
      hp: 102,
      strength: 11,
      magic: 8,
      defense: 10,
      speed: 4,
      image: "/enemies/forest/forest_guardian_02.jpg",
      archetype: "tank",
      passive: "Mur de lierre",
      specialAttack: "Entrave sylvestre",
      rewardCategory: "relic",
      sourceTag: "statue_guardian",
      passives: [ENEMY_PASSIVES.bulwark(), ENEMY_PASSIVES.stone_core()],
    }
    ],
    ruins: [
      {
        name: "Sentinelle runique",
        hp: 108,
        strength: 14,
        magic: 7,
        defense: 11,
        speed: 6,
        image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
        archetype: "tank",
        passive: "Défense sacrée",
        specialAttack: "Onde runique",
        rewardCategory: "relic",
        sourceTag: "statue_guardian",
        passives: [ENEMY_PASSIVES.bulwark()],
      },
    ],
    crypt: [
      {
        name: "Veilleur des tombes",
        hp: 92,
        strength: 10,
        magic: 16,
        defense: 7,
        speed: 8,
        image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
        archetype: "mage",
        passive: "Lie les âmes",
        specialAttack: "Chaîne d’ossements",
        rewardCategory: "relic",
        sourceTag: "statue_guardian",
        passives: [ENEMY_PASSIVES.arcane_hunger()],
      },
    ],
  },

  merchant_blacksmith_corrupted: {},
  merchant_alchemist_corrupted: {},
  merchant_mystic_corrupted: {},
  treasure_mimic: {},
  random_ambush: {},
};

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildEnemyFromTemplate(template: EnemyTemplate): Enemy {
  return {
    name: template.name,
    hp: template.hp,
    maxHp: template.hp,
    strength: template.strength,
    magic: template.magic,
    defense: template.defense,
    speed: template.speed,
    image: template.image,
    archetype: template.archetype,
    passives: template.passives ?? [],
    specialAttack: template.specialAttack,
    attacks: getAttacksForArchetype(template.archetype, template.specialAttack),
    statuses: [],
    rewardCategory: template.rewardCategory,
    sourceTag: template.sourceTag ?? "normal",
    isBoss: template.isBoss ?? false,
    bossMechanic: template.bossMechanic,
    phaseTwoImage: template.phaseTwoImage,
    bossState: template.isBoss
      ? {
          phase: 1,
          rage: 0,
          ritualCharge: 0,
          ritualBroken: false,
          preyMarkedPlayerId: null,
          patternStep: 0,
          sealCount: 0,
          broodCount: 0,
          emberCharge: 0,
        }
      : undefined,
  };
}

export function createSpecialEnemy(
  node: MapNode,
  sourceTag: EnemySourceTag,
  fallbackRewardCategory?: EliteRewardCategory
): Enemy {
  const specialPool = SPECIAL_ENEMIES_BY_TAG[sourceTag]?.[node.locationTheme];

  if (specialPool && specialPool.length > 0) {
    const picked = buildEnemyFromTemplate(randomItem(specialPool));

    return {
      ...picked,
      rewardCategory: picked.rewardCategory ?? fallbackRewardCategory,
      sourceTag,
    };
  }

  const base = createEnemyFromNode({ ...node, eventType: "battle" });

  return {
    ...base,
    rewardCategory: fallbackRewardCategory,
    sourceTag,
  };
}

export function createEnemyFromNode(node: MapNode): Enemy {
  if (node.eventType === "boss" || node.type === "boss") {
    const bossPool = BOSS_POOL_BY_THEME[node.locationTheme];
    if (bossPool && bossPool.length > 0) {
      return buildEnemyFromTemplate(randomItem(bossPool));
    }
  }

  const pool = ENEMIES_BY_THEME[node.locationTheme] ?? ENEMIES_BY_THEME.forest ?? [];
  if (pool.length === 0) {
    throw new Error(`No enemy pool found for theme: ${node.locationTheme}`);
  }
  const template = randomItem(pool);
  const base = buildEnemyFromTemplate(template);

  if (node.eventType === "battle") {
    return {
      ...base,
      hp: base.hp + 20,
      maxHp: base.maxHp + 20,
      strength: base.strength + 2,
      defense: base.defense + 1,
    };
  }

  return base;
}