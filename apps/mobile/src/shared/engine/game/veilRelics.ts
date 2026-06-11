import { EtherniaRunSave } from "./gameTypes";
import { PostBossChoiceId } from "./postBossChoices";
import { TraitEffect, TraitModifiers } from "@/shared/types/game";

export type VeilRelicRole = "Survie" | "Dégâts" | "Soutien" | "Contrôle" | "Risque";

export type VeilRelic = {
  id: string;
  name: string;
  icon: string;
  role: VeilRelicRole;
  description: string;
  technical: string;
  modifiers: TraitModifiers;
  corruptionDelta?: number;
};

const VEIL_RELICS: VeilRelic[] = [
  {
    id: "maeril-splinter",
    name: "Éclat filtrant",
    icon: "◇",
    role: "Soutien",
    description: "Un fragment du Voile guide les gestes.",
    technical: "Équipe : Vitesse +1, Mana max +3.",
    modifiers: { speed: 1, maxMana: 3 },
  },
  {
    id: "filter-anchor",
    name: "Ancre de Filtration",
    icon: "▣",
    role: "Survie",
    description: "Le Cœur-Monde pèse moins sur les corps.",
    technical: "Équipe : PV max +5, Défense +1.",
    modifiers: { maxHp: 5, defense: 1 },
  },
  {
    id: "second-veil-needle",
    name: "Aiguille du Second Voile",
    icon: "⌁",
    role: "Contrôle",
    description: "Une couture de réalité tient encore.",
    technical: "Équipe : Magie +1, Défense +1.",
    modifiers: { magic: 1, defense: 1 },
  },
  {
    id: "seraphis-thread",
    name: "Fil d’atelier",
    icon: "✦",
    role: "Dégâts",
    description: "Un protocole ancien renforce les armes.",
    technical: "Équipe : Force +1, Magie +1.",
    modifiers: { strength: 1, magic: 1 },
  },
  {
    id: "black-sea-tooth",
    name: "Dent de Mer Noire",
    icon: "☾",
    role: "Risque",
    description: "La Mer Noire mord, puis offre sa force.",
    technical: "Équipe : Force +2, Magie +2, Défense -1. Corruption +8.",
    modifiers: { strength: 2, magic: 2, defense: -1 },
    corruptionDelta: 8,
  },
  {
    id: "empty-crown-memory",
    name: "Mémoire de Couronne Vide",
    icon: "♛",
    role: "Risque",
    description: "Un souvenir royal refuse de disparaître.",
    technical: "Équipe : Mana max +6, Vitesse +1, PV max -3. Corruption +6.",
    modifiers: { maxMana: 6, speed: 1, maxHp: -3 },
    corruptionDelta: 6,
  },
];

export function getVeilRelicTrait(relic: VeilRelic): TraitEffect {
  return {
    id: `veil-relic-${relic.id}`,
    name: `Relique · ${relic.name}`,
    description: relic.technical,
    category: relic.role === "Risque" ? "curse" : "blessing",
    trigger: "stats",
    modifiers: relic.modifiers,
  };
}

function relicAlreadyOwned(run: EtherniaRunSave, relic: VeilRelic): boolean {
  return (run.veilRelics ?? []).some((current) => current.id === relic.id);
}

export function getOwnedVeilRelics(run: EtherniaRunSave): VeilRelic[] {
  return run.veilRelics ?? [];
}

export function getNextVeilRelicCandidate(run: EtherniaRunSave, choiceId: PostBossChoiceId): VeilRelic | null {
  const pool = choiceId === "pact"
    ? VEIL_RELICS.filter((relic) => relic.role === "Risque")
    : VEIL_RELICS.filter((relic) => relic.role !== "Risque");

  const unowned = pool.filter((relic) => !relicAlreadyOwned(run, relic));
  const candidates = unowned.length ? unowned : pool;
  if (!candidates.length) return null;

  const index = Math.abs((run.currentFloor * 3 + run.players.length + choiceId.length) % candidates.length);
  return candidates[index];
}

export function applyVeilRelicToRun(run: EtherniaRunSave, relic: VeilRelic): EtherniaRunSave {
  const ownedRelics = run.veilRelics ?? [];
  const nextRelics = relicAlreadyOwned(run, relic) ? ownedRelics : [...ownedRelics, relic];
  const trait = getVeilRelicTrait(relic);

  return {
    ...run,
    veilRelics: nextRelics,
    players: run.players.map((player) => {
      const traits = player.traits ?? [];
      if (traits.some((current) => current.id === trait.id)) return player;
      return {
        ...player,
        traits: [...traits, trait],
      };
    }),
    corruptionCharge: Math.min(99, Math.max(0, run.corruptionCharge + (relic.corruptionDelta ?? 0))),
  };
}

export function describeVeilRelics(run: EtherniaRunSave): string {
  const relics = getOwnedVeilRelics(run);
  if (!relics.length) return "Aucune relique du Voile.";
  return relics.map((relic) => `${relic.icon} ${relic.name}`).join(" · ");
}
