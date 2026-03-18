import { Enemy, EnemyAttack, LocationTheme, MapNode, EliteRewardCategory, EnemySourceTag, } from "@/app/component/types/game";

type EnemyTemplate = {
  name: string;
  hp: number;
  strength: number;
  magic: number;
  defense: number;
  image: string;
  archetype: Enemy["archetype"];
  passive?: string;
  specialAttack?: string;
  rewardCategory?: EliteRewardCategory;
  sourceTag?: EnemySourceTag;
};

function getAttacksForArchetype(
  archetype: Enemy["archetype"],
  specialAttack?: string
): EnemyAttack[] {
  switch (archetype) {
    case "brute":
      return [
        {
          id: "slam",
          name: "Coup Brutal",
          description: "Une lourde attaque physique.",
          kind: "physical",
          powerMultiplier: 1.0,
        },
        {
          id: "crush",
          name: specialAttack || "Écrasement",
          description: "Une attaque très puissante.",
          kind: "physical",
          powerMultiplier: 1.45,
          critChance: 0.08,
        },
      ];

    case "assassin":
      return [
        {
          id: "stab",
          name: "Entaille Vive",
          description: "Attaque rapide avec fort taux critique.",
          kind: "physical",
          powerMultiplier: 0.95,
          critChance: 0.2,
        },
        {
          id: "ambush",
          name: specialAttack || "Attaque Perfide",
          description: "Peut empoisonner la cible.",
          kind: "physical",
          powerMultiplier: 1.1,
          critChance: 0.25,
          statusEffect: {
            type: "poison",
            value: 5,
            duration: 3,
            target: "player",
          },
        },
      ];

    case "mage":
      return [
        {
          id: "bolt",
          name: "Trait occulte",
          description: "Projectile magique.",
          kind: "magical",
          powerMultiplier: 1.0,
        },
        {
          id: "burst",
          name: specialAttack || "Explosion occulte",
          description: "Inflige une brûlure magique.",
          kind: "magical",
          powerMultiplier: 1.2,
          critChance: 0.12,
          statusEffect: {
            type: "burn",
            value: 6,
            duration: 2,
            target: "player",
          },
        },
      ];

    case "tank":
      return [
        {
          id: "bash",
          name: "Heurt blindé",
          description: "Attaque stable.",
          kind: "physical",
          powerMultiplier: 0.9,
        },
        {
          id: "quake",
          name: specialAttack || "Carapace runique",
          description: "Frappe tout en renforçant sa défense.",
          kind: "physical",
          powerMultiplier: 0.8,
          statusEffect: {
            type: "shield",
            value: 1,
            duration: 1,
            target: "enemy",
          },
        },
      ];

    case "leech":
      return [
        {
          id: "drain_hit",
          name: "Drain sournois",
          description: "Attaque hybride qui use les ressources.",
          kind: "hybrid",
          powerMultiplier: 0.95,
          manaBurn: 6,
        },
        {
          id: "devour",
          name: specialAttack || "Dévoration",
          description: "Vole un peu d’énergie et se régénère.",
          kind: "hybrid",
          powerMultiplier: 1.2,
          manaBurn: 8,
          selfHealPercent: 0.2,
          statusEffect: {
            type: "regen",
            value: 5,
            duration: 2,
            target: "enemy",
          },
        },
      ];

    default:
      return [
        {
          id: "hit",
          name: "Attaque",
          description: "Attaque simple.",
          kind: "physical",
          powerMultiplier: 1.0,
        },
      ];
  }
}

const ENEMIES_BY_THEME: Record<LocationTheme, EnemyTemplate[]> = {
  forest: [
    {
      name: "Loup noir",
      hp: 42,
      strength: 10,
      magic: 0,
      defense: 3,
      image: "https://images.unsplash.com/photo-1588691880436-b52db92040c5?q=80&w=400",
      archetype: "assassin",
      passive: "Critiques plus fréquents",
      specialAttack: "Morsure sauvage",
    },
    {
      name: "Esprit sylvestre",
      hp: 48,
      strength: 6,
      magic: 10,
      defense: 2,
      image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400",
      archetype: "mage",
      passive: "Dégâts magiques instables",
      specialAttack: "Éclat de nature",
    },
    {
      name: "Sanglier sauvage",
      hp: 60,
      strength: 11,
      magic: 0,
      defense: 5,
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=400",
      archetype: "brute",
      passive: "Très agressif",
      specialAttack: "Charge brutale",
    },
  ],

  ruins: [
    {
      name: "Gardien brisé",
      hp: 70,
      strength: 9,
      magic: 0,
      defense: 8,
      image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
      archetype: "tank",
      passive: "Haute défense",
      specialAttack: "Écrasement de pierre",
    },
    {
      name: "Pillard des vestiges",
      hp: 50,
      strength: 11,
      magic: 0,
      defense: 4,
      image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=400",
      archetype: "assassin",
      passive: "Rapide et imprévisible",
      specialAttack: "Frappe traîtresse",
    },
    {
      name: "Guetteur en ruine",
      hp: 55,
      strength: 8,
      magic: 6,
      defense: 5,
      image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
      archetype: "brute",
      passive: "Bonne tenue au combat",
      specialAttack: "Lame fissurée",
    },
  ],

  swamp: [
    {
      name: "Horreur des marais",
      hp: 58,
      strength: 9,
      magic: 6,
      defense: 4,
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400",
      archetype: "leech",
      passive: "Peut drainer la vitalité",
      specialAttack: "Miasme putride",
    },
    {
      name: "Sangsue géante",
      hp: 46,
      strength: 7,
      magic: 8,
      defense: 2,
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=400",
      archetype: "leech",
      passive: "Vole parfois du mana",
      specialAttack: "Drain visqueux",
    },
    {
      name: "Brume vorace",
      hp: 40,
      strength: 5,
      magic: 12,
      defense: 1,
      image: "https://images.unsplash.com/photo-1518562180175-34a163b1a9a6?q=80&w=400",
      archetype: "mage",
      passive: "Attaques magiques élevées",
      specialAttack: "Souffle toxique",
    },
  ],

  crypt: [
    {
      name: "Squelette ancien",
      hp: 55,
      strength: 10,
      magic: 0,
      defense: 5,
      image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400",
      archetype: "brute",
      passive: "Résiste bien aux attaques faibles",
      specialAttack: "Frappe osseuse",
    },
    {
      name: "Âme liée",
      hp: 44,
      strength: 5,
      magic: 13,
      defense: 2,
      image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
      archetype: "mage",
      passive: "Fort potentiel magique",
      specialAttack: "Trait spectral",
    },
    {
      name: "Veilleur funèbre",
      hp: 68,
      strength: 8,
      magic: 4,
      defense: 7,
      image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
      archetype: "tank",
      passive: "Défense funéraire",
      specialAttack: "Marteau des tombes",
    },
  ],

  mountain: [
    {
      name: "Troll des falaises",
      hp: 78,
      strength: 12,
      magic: 0,
      defense: 8,
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400",
      archetype: "tank",
      passive: "Très robuste",
      specialAttack: "Fracas de roc",
    },
    {
      name: "Chasseur des cimes",
      hp: 50,
      strength: 11,
      magic: 2,
      defense: 4,
      image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=400",
      archetype: "assassin",
      passive: "Frappe vite",
      specialAttack: "Plongeon fatal",
    },
    {
      name: "Roc griffu",
      hp: 62,
      strength: 10,
      magic: 0,
      defense: 6,
      image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=400",
      archetype: "brute",
      passive: "Grande violence",
      specialAttack: "Griffes de pierre",
    },
  ],

  village: [
    {
      name: "Bandit errant",
      hp: 48,
      strength: 10,
      magic: 0,
      defense: 3,
      image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=400",
      archetype: "assassin",
      passive: "Critique parfois",
      specialAttack: "Coup de dague",
    },
    {
      name: "Mercenaire déchu",
      hp: 60,
      strength: 9,
      magic: 0,
      defense: 6,
      image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400",
      archetype: "brute",
      passive: "Combattant expérimenté",
      specialAttack: "Entaille lourde",
    },
    {
      name: "Pilleur nocturne",
      hp: 44,
      strength: 8,
      magic: 4,
      defense: 3,
      image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
      archetype: "leech",
      passive: "Vole des ressources",
      specialAttack: "Vol perfide",
    },
  ],

  cathedral: [
    {
      name: "Fanatique brisé",
      hp: 52,
      strength: 8,
      magic: 9,
      defense: 4,
      image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
      archetype: "mage",
      passive: "Pouvoir sacré corrompu",
      specialAttack: "Lumière démente",
    },
    {
      name: "Gardien sacré",
      hp: 72,
      strength: 9,
      magic: 3,
      defense: 8,
      image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
      archetype: "tank",
      passive: "Bouclier sacré",
      specialAttack: "Jugement lourd",
    },
    {
      name: "Chantre dément",
      hp: 46,
      strength: 4,
      magic: 13,
      defense: 2,
      image: "https://images.unsplash.com/photo-1518562180175-34a163b1a9a6?q=80&w=400",
      archetype: "mage",
      passive: "Sorts plus puissants",
      specialAttack: "Cantique maudit",
    },
  ],

  cavern: [
    {
      name: "Araignée géante",
      hp: 49,
      strength: 9,
      magic: 5,
      defense: 3,
      image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=400",
      archetype: "assassin",
      passive: "Peut empoisonner",
      specialAttack: "Crochets venimeux",
    },
    {
      name: "Rôdeur de pierre",
      hp: 67,
      strength: 10,
      magic: 0,
      defense: 7,
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400",
      archetype: "tank",
      passive: "Peau de roche",
      specialAttack: "Poing tectonique",
    },
    {
      name: "Mâchoire des grottes",
      hp: 58,
      strength: 11,
      magic: 0,
      defense: 5,
      image: "https://images.unsplash.com/photo-1588691880436-b52db92040c5?q=80&w=400",
      archetype: "brute",
      passive: "Prédateur agressif",
      specialAttack: "Déchiquetage",
    },
  ],

  ashlands: [
    {
      name: "Cendre animée",
      hp: 45,
      strength: 6,
      magic: 12,
      defense: 2,
      image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=400",
      archetype: "mage",
      passive: "Magie de braise",
      specialAttack: "Explosion de cendres",
    },
    {
      name: "Guerrier brûlé",
      hp: 63,
      strength: 11,
      magic: 2,
      defense: 5,
      image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400",
      archetype: "brute",
      passive: "Furie brûlante",
      specialAttack: "Lame incendiée",
    },
    {
      name: "Bête des braises",
      hp: 54,
      strength: 10,
      magic: 6,
      defense: 4,
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=400",
      archetype: "leech",
      passive: "Peut consumer le mana",
      specialAttack: "Souffle de braise",
    },
  ],
};

const BOSS_POOL_BY_THEME: Record<LocationTheme, EnemyTemplate[]> = {
  forest: [
    {
      name: "Chef bandit",
      hp: 280,
      strength: 22,
      magic: 6,
      defense: 8,
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=400",
      archetype: "assassin",
      passive: "Commande les prédateurs",
      specialAttack: "Assaut du chef",
    },
    {
      name: "Alpha des bois",
      hp: 300,
      strength: 24,
      magic: 4,
      defense: 9,
      image: "https://images.unsplash.com/photo-1588691880436-b52db92040c5?q=80&w=400",
      archetype: "brute",
      passive: "Furie bestiale",
      specialAttack: "Hurlement sauvage",
    },
  ],

  ruins: [
    {
      name: "Golem ancien",
      hp: 340,
      strength: 23,
      magic: 4,
      defense: 14,
      image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
      archetype: "tank",
      passive: "Corps de pierre",
      specialAttack: "Poing titanesque",
    },
    {
      name: "Gardien des vestiges",
      hp: 320,
      strength: 21,
      magic: 10,
      defense: 12,
      image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=400",
      archetype: "tank",
      passive: "Veille millénaire",
      specialAttack: "Jugement des ruines",
    },
  ],

  crypt: [
    {
      name: "Liche",
      hp: 280,
      strength: 10,
      magic: 26,
      defense: 8,
      image: "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=400",
      archetype: "mage",
      passive: "Nécromancie noire",
      specialAttack: "Orbe mortel",
    },
    {
      name: "Seigneur spectral",
      hp: 300,
      strength: 14,
      magic: 22,
      defense: 9,
      image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
      archetype: "mage",
      passive: "Voile funèbre",
      specialAttack: "Tempête d'âmes",
    },
  ],

  swamp: [],
  mountain: [],
  village: [],
  cathedral: [],
  cavern: [],
  ashlands: [],
};

const SPECIAL_ENEMIES_BY_TAG: Record<EnemySourceTag, Partial<Record<LocationTheme, EnemyTemplate[]>>> = {
  normal: {},
  elite: {
    forest: [
      {
        name: "Traqueur alpha",
        hp: 88,
        strength: 15,
        magic: 2,
        defense: 7,
        image: "https://images.unsplash.com/photo-1588691880436-b52db92040c5?q=80&w=400",
        archetype: "assassin",
        passive: "Prédateur d’élite",
        specialAttack: "Rafale de crocs",
        rewardCategory: "weapon",
        sourceTag: "elite",
      },
      {
        name: "Gardebois ancien",
        hp: 96,
        strength: 12,
        magic: 8,
        defense: 8,
        image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400",
        archetype: "tank",
        passive: "Protège les reliques",
        specialAttack: "Entrave sylvestre",
        rewardCategory: "relic",
        sourceTag: "elite",
      },
    ],
    ruins: [
      {
        name: "Champion des vestiges",
        hp: 104,
        strength: 14,
        magic: 6,
        defense: 11,
        image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
        archetype: "tank",
        passive: "Armure antique",
        specialAttack: "Marteau runique",
        rewardCategory: "armor",
        sourceTag: "elite",
      },
      {
        name: "Exécuteur brisé",
        hp: 92,
        strength: 17,
        magic: 2,
        defense: 7,
        image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=400",
        archetype: "brute",
        passive: "Frappe dévastatrice",
        specialAttack: "Fracassement",
        rewardCategory: "weapon",
        sourceTag: "elite",
      },
    ],
    crypt: [
      {
        name: "Prêtre sépulcral",
        hp: 84,
        strength: 7,
        magic: 18,
        defense: 6,
        image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
        archetype: "mage",
        passive: "Magie funéraire",
        specialAttack: "Nova sépulcrale",
        rewardCategory: "relic",
        sourceTag: "elite",
      },
      {
        name: "Chevalier du tombeau",
        hp: 108,
        strength: 15,
        magic: 4,
        defense: 10,
        image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400",
        archetype: "tank",
        passive: "Garde les sceaux",
        specialAttack: "Jugement du caveau",
        rewardCategory: "armor",
        sourceTag: "elite",
      },
    ],
  },

  statue_guardian: {
    forest: [
      {
        name: "Gardien de racines",
        hp: 90,
        strength: 13,
        magic: 7,
        defense: 8,
        image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400",
        archetype: "tank",
        passive: "Veilleur de relique",
        specialAttack: "Chaînes végétales",
        rewardCategory: "relic",
        sourceTag: "statue_guardian",
      },
    ],
    ruins: [
      {
        name: "Sentinelle runique",
        hp: 102,
        strength: 14,
        magic: 6,
        defense: 10,
        image: "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400",
        archetype: "tank",
        passive: "Défense sacrée",
        specialAttack: "Onde runique",
        rewardCategory: "relic",
        sourceTag: "statue_guardian",
      },
    ],
    crypt: [
      {
        name: "Veilleur des tombes",
        hp: 88,
        strength: 10,
        magic: 15,
        defense: 7,
        image: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
        archetype: "mage",
        passive: "Lie les âmes",
        specialAttack: "Chaîne d’ossements",
        rewardCategory: "relic",
        sourceTag: "statue_guardian",
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
    image: template.image,
    archetype: template.archetype,
    passive: template.passive,
    specialAttack: template.specialAttack,
    attacks: getAttacksForArchetype(template.archetype, template.specialAttack),
    statuses: [],
    rewardCategory: template.rewardCategory,
    sourceTag: template.sourceTag ?? "normal",
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

  const pool = ENEMIES_BY_THEME[node.locationTheme];
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