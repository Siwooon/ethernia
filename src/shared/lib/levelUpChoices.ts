import { ClassType, LevelUpChoiceId, Player, PlayerBuildChoice, Stats, TraitEffect, TraitModifiers } from "@/shared/types/game";

export type LevelUpChoiceOption = {
  id: LevelUpChoiceId;
  label: string;
  shortLabel: string;
  description: string;
  tone: "survive" | "damage" | "magic" | "tempo" | "cleanse" | "risk";
  modifiers?: TraitModifiers;
  healPercent?: number;
};

const CLASS_CORE: Record<ClassType, LevelUpChoiceOption> = {
  Guerrier: {
    id: "garde",
    label: "Garde haute",
    shortLabel: "Garde",
    description: "+Défense. La ligne tient mieux.",
    tone: "survive",
    modifiers: { defense: 2, maxHp: 6 },
  },
  Mage: {
    id: "arcane",
    label: "Canalisation",
    shortLabel: "Arcane",
    description: "+Magie et +Mana. Les sorts pèsent plus.",
    tone: "magic",
    modifiers: { magic: 2, maxMana: 8 },
  },
  Archer: {
    id: "instinct",
    label: "Œil sûr",
    shortLabel: "Instinct",
    description: "+Force et +Vitesse. Les marques profitent mieux.",
    tone: "tempo",
    modifiers: { strength: 1, speed: 2 },
  },
  Voleur: {
    id: "tempo",
    label: "Main vive",
    shortLabel: "Tempo",
    description: "+Vitesse. Les enchaînements restent naturels.",
    tone: "tempo",
    modifiers: { speed: 2, strength: 1 },
  },
  Demoniste: {
    id: "pacte",
    label: "Pacte bref",
    shortLabel: "Pacte",
    description: "+Magie. Plus puissant, un peu plus fragile.",
    tone: "risk",
    modifiers: { magic: 3, maxHp: -4 },
  },
  Clerc: {
    id: "purification",
    label: "Sceau clair",
    shortLabel: "Sceau",
    description: "+Magie et +Défense. Soutien plus sûr.",
    tone: "cleanse",
    modifiers: { magic: 1, defense: 2, maxMana: 4 },
  },
  Sentinelle: {
    id: "sentinel_ancrage",
    label: "Ancrage",
    shortLabel: "Ancre",
    description: "+Défense et +Mana. Stabilise la ligne.",
    tone: "cleanse",
    modifiers: { defense: 1, maxMana: 6, magic: 1 },
  },
};

const CLASS_BRANCH_CHOICES: Record<ClassType, LevelUpChoiceOption[]> = {
  Guerrier: [
    {
      id: "warrior_garde",
      label: "Mur",
      shortLabel: "Mur",
      description: "+PV. Défendre donne aussi un bouclier personnel.",
      tone: "survive",
      modifiers: { maxHp: 8, defense: 1 },
    },
    {
      id: "warrior_riposte",
      label: "Contre",
      shortLabel: "Contre",
      description: "+Force. Les ripostes frappent plus fort.",
      tone: "damage",
      modifiers: { strength: 1, defense: 1 },
    },
    {
      id: "warrior_commandement",
      label: "Ligne",
      shortLabel: "Ligne",
      description: "+Défense. Défendre couvre un peu l'équipe.",
      tone: "survive",
      modifiers: { defense: 2 },
    },
    {
      id: "warrior_stalwart",
      label: "Bastion",
      shortLabel: "Bastion",
      description: "+Défense. Mur donne un bouclier plus haut et plus long.",
      tone: "survive",
      modifiers: { defense: 2, maxHp: 6 },
    },
    {
      id: "warrior_riposte_master",
      label: "Acier rendu",
      shortLabel: "Acier",
      description: "+Force. La riposte inflige beaucoup plus après défense.",
      tone: "damage",
      modifiers: { strength: 1, defense: 1 },
    },
    {
      id: "warrior_battle_line",
      label: "Rang d'or",
      shortLabel: "Rang",
      description: "+Défense. Ligne protège davantage toute l'équipe.",
      tone: "survive",
      modifiers: { defense: 1, maxHp: 4 },
    },
  ],
  Mage: [
    {
      id: "mage_feu",
      label: "Braise",
      shortLabel: "Braise",
      description: "+Magie. Les sorts peuvent laisser une brûlure.",
      tone: "magic",
      modifiers: { magic: 2 },
    },
    {
      id: "mage_voile",
      label: "Voile",
      shortLabel: "Voile",
      description: "+Mana. Les cibles altérées subissent plus.",
      tone: "magic",
      modifiers: { maxMana: 10 },
    },
    {
      id: "mage_surcharge",
      label: "Surcharge",
      shortLabel: "Charge",
      description: "+Magie. La surcharge est plus violente.",
      tone: "damage",
      modifiers: { magic: 1, speed: 1 },
    },
    {
      id: "mage_inferno",
      label: "Flamme vive",
      shortLabel: "Flamme",
      description: "+Magie. Braise ajoute un bonus selon la magie.",
      tone: "magic",
      modifiers: { magic: 2 },
    },
    {
      id: "mage_void_reading",
      label: "Lecture noire",
      shortLabel: "Lecture",
      description: "+Mana. Voile punit mieux les cibles altérées.",
      tone: "magic",
      modifiers: { maxMana: 8, magic: 1 },
    },
    {
      id: "mage_overcharge",
      label: "Orage captif",
      shortLabel: "Orage",
      description: "+Vitesse. La surcharge pleine gagne un palier de dégâts.",
      tone: "damage",
      modifiers: { speed: 1, magic: 1 },
    },
  ],
  Archer: [
    {
      id: "archer_marque",
      label: "Trace",
      shortLabel: "Trace",
      description: "+Vitesse. Les marques durent mieux.",
      tone: "tempo",
      modifiers: { speed: 2 },
    },
    {
      id: "archer_execution",
      label: "Finir",
      shortLabel: "Finir",
      description: "+Force. Les cibles faibles tombent plus vite.",
      tone: "damage",
      modifiers: { strength: 2 },
    },
    {
      id: "archer_piste",
      label: "Piste",
      shortLabel: "Piste",
      description: "+Vitesse. Frapper une marque charge mieux l'élan.",
      tone: "tempo",
      modifiers: { strength: 1, speed: 1 },
    },
    {
      id: "archer_hunters_mark",
      label: "Proie liée",
      shortLabel: "Proie",
      description: "+Vitesse. Les marques durent plus et frappent plus fort.",
      tone: "tempo",
      modifiers: { speed: 2 },
    },
    {
      id: "archer_finisher",
      label: "Trait final",
      shortLabel: "Final",
      description: "+Force. Finir agit plus tôt sur les cibles blessées.",
      tone: "damage",
      modifiers: { strength: 1, speed: 1 },
    },
    {
      id: "archer_momentum",
      label: "Pas sûr",
      shortLabel: "Pas",
      description: "+Force et +Vitesse. Exploiter une marque ajoute un bonus plat.",
      tone: "tempo",
      modifiers: { strength: 1, speed: 1 },
    },
  ],
  Voleur: [
    {
      id: "rogue_combo",
      label: "Chaîne",
      shortLabel: "Chaîne",
      description: "+Force. Les combos finaux frappent plus.",
      tone: "damage",
      modifiers: { strength: 1, speed: 1 },
    },
    {
      id: "rogue_ombre",
      label: "Ombre",
      shortLabel: "Ombre",
      description: "+Vitesse. Le premier coup d'une cible démarre mieux.",
      tone: "tempo",
      modifiers: { speed: 2 },
    },
    {
      id: "rogue_butin",
      label: "Butin",
      shortLabel: "Butin",
      description: "+Vitesse. Les objets de combat rendent de l'élan.",
      tone: "tempo",
      modifiers: { speed: 1, maxHp: 4 },
    },
    {
      id: "rogue_chain_finish",
      label: "Dernier anneau",
      shortLabel: "Anneau",
      description: "+Force. Le 3e coup du combo gagne un gros palier.",
      tone: "damage",
      modifiers: { strength: 1, speed: 1 },
    },
    {
      id: "rogue_first_shadow",
      label: "Pas d'ombre",
      shortLabel: "Ombre",
      description: "+Vitesse. Le premier coup sur une cible neuve est renforcé.",
      tone: "tempo",
      modifiers: { speed: 2 },
    },
    {
      id: "rogue_quick_loot",
      label: "Main sûre",
      shortLabel: "Main",
      description: "+PV et +Vitesse. Les objets de combat rendent mieux l'élan.",
      tone: "tempo",
      modifiers: { speed: 1, maxHp: 6 },
    },
  ],
  Demoniste: [
    {
      id: "warlock_sang",
      label: "Sang",
      shortLabel: "Sang",
      description: "+Magie. Le pacte coûte moins cher.",
      tone: "risk",
      modifiers: { magic: 2, maxHp: -2 },
    },
    {
      id: "warlock_abime",
      label: "Abîme",
      shortLabel: "Abîme",
      description: "+Mana. Les cibles altérées nourrissent les dégâts.",
      tone: "risk",
      modifiers: { maxMana: 12 },
    },
    {
      id: "warlock_faim",
      label: "Faim",
      shortLabel: "Faim",
      description: "+Magie. Plus dangereux quand les PV sont bas.",
      tone: "damage",
      modifiers: { magic: 2, defense: -1 },
    },
    {
      id: "warlock_blood_price",
      label: "Prix moindre",
      shortLabel: "Prix",
      description: "+Magie. Le pacte coûte encore moins de PV.",
      tone: "risk",
      modifiers: { magic: 2, maxHp: -1 },
    },
    {
      id: "warlock_black_tide",
      label: "Marée noire",
      shortLabel: "Marée",
      description: "+Mana. Les cibles altérées nourrissent davantage l'abîme.",
      tone: "risk",
      modifiers: { maxMana: 8, magic: 1 },
    },
    {
      id: "warlock_last_hunger",
      label: "Faim dernière",
      shortLabel: "Faim+",
      description: "+Magie, -Défense. Sous 50% PV, les dégâts montent plus fort.",
      tone: "damage",
      modifiers: { magic: 2, defense: -1 },
    },
  ],
  Clerc: [
    {
      id: "cleric_foi",
      label: "Foi",
      shortLabel: "Foi",
      description: "+Mana. Les boucliers de foi sont plus larges.",
      tone: "cleanse",
      modifiers: { maxMana: 8, magic: 1 },
    },
    {
      id: "cleric_sceau",
      label: "Sceau",
      shortLabel: "Sceau",
      description: "+Défense. Défendre protège l'allié le plus fragile.",
      tone: "survive",
      modifiers: { defense: 2 },
    },
    {
      id: "cleric_jugement",
      label: "Jugement",
      shortLabel: "Jugement",
      description: "+Magie. Les ennemis marqués subissent plus.",
      tone: "damage",
      modifiers: { magic: 2 },
    },
    {
      id: "cleric_wide_faith",
      label: "Foi large",
      shortLabel: "Foi+",
      description: "+Mana. La foi pleine donne un bouclier d'équipe plus haut.",
      tone: "cleanse",
      modifiers: { maxMana: 8, magic: 1 },
    },
    {
      id: "cleric_guardian_seal",
      label: "Sceau gardien",
      shortLabel: "Gardien",
      description: "+Défense. Défendre donne un meilleur bouclier à l'allié fragile.",
      tone: "survive",
      modifiers: { defense: 2, maxHp: 4 },
    },
    {
      id: "cleric_sentence",
      label: "Sentence",
      shortLabel: "Sentence",
      description: "+Magie. Jugement inflige un multiplicateur plus fort.",
      tone: "damage",
      modifiers: { magic: 2 },
    },
  ],
  Sentinelle: [
    {
      id: "sentinel_egide",
      label: "Égide",
      shortLabel: "Égide",
      description: "+Défense. Les boucliers d'équipe tiennent mieux.",
      tone: "survive",
      modifiers: { defense: 2, maxHp: 4 },
    },
    {
      id: "sentinel_faille",
      label: "Faille",
      shortLabel: "Faille",
      description: "+Magie. Les cibles Vulnérables subissent plus.",
      tone: "magic",
      modifiers: { magic: 2 },
    },
    {
      id: "sentinel_anchor_pulse",
      label: "Pulsation",
      shortLabel: "Pulse",
      description: "+Vitesse. Les sceaux reviennent plus vite.",
      tone: "tempo",
      modifiers: { speed: 1, maxMana: 6 },
    },
    {
      id: "sentinel_veil_guard",
      label: "Garde-Voile",
      shortLabel: "Garde",
      description: "+Défense. Les boucliers d'équipe gagnent un palier.",
      tone: "survive",
      modifiers: { defense: 2, maxHp: 6 },
    },
    {
      id: "sentinel_second_veil",
      label: "Second Voile",
      shortLabel: "Voile",
      description: "+Magie et +Défense. Les cibles altérées sont mieux scellées.",
      tone: "cleanse",
      modifiers: { magic: 1, defense: 1, maxMana: 6 },
    },
    {
      id: "sentinel_anchor_relay",
      label: "Relais d'ancre",
      shortLabel: "Relais",
      description: "+Vitesse et +Mana. Les sceaux soutiennent mieux le rythme.",
      tone: "tempo",
      modifiers: { speed: 1, maxMana: 8 },
    },
  ],
};

const COMMON_CHOICES: LevelUpChoiceOption[] = [
  {
    id: "vitalite",
    label: "Vitalité",
    shortLabel: "PV",
    description: "+PV max. Repart avec un peu plus de marge.",
    tone: "survive",
    modifiers: { maxHp: 14, defense: 1 },
    healPercent: 0.35,
  },
  {
    id: "puissance",
    label: "Puissance",
    shortLabel: "Dégâts",
    description: "+Force. Les attaques directes frappent mieux.",
    tone: "damage",
    modifiers: { strength: 2 },
  },
  {
    id: "arcane",
    label: "Réserve",
    shortLabel: "Mana",
    description: "+Mana et +Magie. Plus de place pour les compétences.",
    tone: "magic",
    modifiers: { maxMana: 8, magic: 1 },
    healPercent: 0.2,
  },
  {
    id: "tempo",
    label: "Rythme",
    shortLabel: "Vitesse",
    description: "+Vitesse. Agit plus tôt dans les combats.",
    tone: "tempo",
    modifiers: { speed: 2 },
  },
];

function uniqueById(options: LevelUpChoiceOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

export function getLevelUpChoiceOptionById(classType: ClassType, id: LevelUpChoiceId): LevelUpChoiceOption | undefined {
  return uniqueById([
    CLASS_CORE[classType],
    ...(CLASS_BRANCH_CHOICES[classType] ?? []),
    ...COMMON_CHOICES,
  ]).find((choice) => choice.id === id);
}

export function getLevelUpChoiceOptions(classType: ClassType, level: number): LevelUpChoiceOption[] {
  const classChoice = CLASS_CORE[classType];
  const classBranches = CLASS_BRANCH_CHOICES[classType] ?? [];
  const branchOffset = Math.max(0, level - 2) % Math.max(1, classBranches.length);
  const rotatedBranches = [
    ...classBranches.slice(branchOffset),
    ...classBranches.slice(0, branchOffset),
  ];
  const offset = level % COMMON_CHOICES.length;
  const rotatedCommon = [...COMMON_CHOICES.slice(offset), ...COMMON_CHOICES.slice(0, offset)];

  return uniqueById([
    rotatedBranches[0] ?? classChoice,
    rotatedBranches[1] ?? rotatedCommon[0],
    classChoice,
    ...rotatedCommon,
  ]).slice(0, 3);
}

function modifiersToTrait(choice: LevelUpChoiceOption, level: number): TraitEffect {
  return {
    id: `build:${choice.id}:${level}:${Date.now().toString(36)}`,
    name: choice.label,
    description: choice.description,
    category: "blessing",
    trigger: "stats",
    modifiers: choice.modifiers,
  };
}

export function describeChoiceModifiers(choice: LevelUpChoiceOption): string {
  const mods = choice.modifiers ?? {};
  const parts: string[] = [];
  if (mods.maxHp) parts.push(`${mods.maxHp > 0 ? "+" : ""}${mods.maxHp} PV`);
  if (mods.maxMana) parts.push(`${mods.maxMana > 0 ? "+" : ""}${mods.maxMana} Mana`);
  if (mods.strength) parts.push(`${mods.strength > 0 ? "+" : ""}${mods.strength} Force`);
  if (mods.magic) parts.push(`${mods.magic > 0 ? "+" : ""}${mods.magic} Magie`);
  if (mods.defense) parts.push(`${mods.defense > 0 ? "+" : ""}${mods.defense} Défense`);
  if (mods.speed) parts.push(`${mods.speed > 0 ? "+" : ""}${mods.speed} Vitesse`);
  return parts.join(" · ") || "Spécialisation";
}

export function applyLevelUpChoiceToPlayer(player: Player, choice: LevelUpChoiceOption, level: number): Player {
  const nextBuildChoice: PlayerBuildChoice = {
    id: choice.id,
    label: choice.label,
    level,
    description: describeChoiceModifiers(choice),
  };
  const maxHpGain = choice.modifiers?.maxHp ?? 0;
  const maxManaGain = choice.modifiers?.maxMana ?? 0;
  const healHp = choice.healPercent ? Math.max(0, Math.floor((player.stats.maxHp + maxHpGain) * choice.healPercent)) : Math.max(0, maxHpGain);
  const healMana = choice.healPercent ? Math.max(0, Math.floor((player.stats.maxMana + maxManaGain) * choice.healPercent)) : Math.max(0, maxManaGain);

  return {
    ...player,
    buildChoices: [...(player.buildChoices ?? []), nextBuildChoice],
    traits: [...(player.traits ?? []), modifiersToTrait(choice, level)],
    stats: {
      ...player.stats,
      hp: Math.min(player.stats.maxHp, player.stats.hp + healHp),
      mana: Math.min(player.stats.maxMana, player.stats.mana + healMana),
    },
  };
}

export function applyLevelUpChoiceToRunPlayers<T extends { players: Player[] }>(
  run: T,
  playerId: number,
  choice: LevelUpChoiceOption,
  level: number,
): T {
  return {
    ...run,
    players: run.players.map((player) =>
      player.id === playerId ? applyLevelUpChoiceToPlayer(player, choice, level) : player,
    ),
  };
}
