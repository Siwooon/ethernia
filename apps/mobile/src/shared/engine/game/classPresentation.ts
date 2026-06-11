import { ClassType } from "@/shared/types/game";

export type ClassIconVariant = "portrait" | "combat" | "map" | "state";

export type ClassPresentation = {
  title: string;
  short: string;
  portraitIcon: string;
  combatIcon: string;
  mapIcon: string;
  stateIcon: string;
  accent: string;
  dark: string;
};

export const CLASS_PRESENTATION: Record<ClassType, ClassPresentation> = {
  Guerrier: {
    title: "Bastion",
    short: "Tank",
    portraitIcon: "🛡️",
    combatIcon: "⚔️",
    mapIcon: "🛡",
    stateIcon: "🛡️",
    accent: "#f0b35a",
    dark: "#43220f",
  },
  Mage: {
    title: "Arcaniste",
    short: "Burst magique",
    portraitIcon: "🔮",
    combatIcon: "✨",
    mapIcon: "✦",
    stateIcon: "🔮",
    accent: "#a98bff",
    dark: "#25134f",
  },
  Archer: {
    title: "Traqueur",
    short: "Précision",
    portraitIcon: "🏹",
    combatIcon: "➶",
    mapIcon: "➶",
    stateIcon: "🏹",
    accent: "#75d39b",
    dark: "#123821",
  },
  Voleur: {
    title: "Ombre",
    short: "Assassin",
    portraitIcon: "🗡️",
    combatIcon: "☾",
    mapIcon: "☾",
    stateIcon: "🗡️",
    accent: "#ef7fb3",
    dark: "#42122b",
  },
  Demoniste: {
    title: "Pactisant",
    short: "Altérations",
    portraitIcon: "☠️",
    combatIcon: "☠",
    mapIcon: "✹",
    stateIcon: "☠️",
    accent: "#c56cff",
    dark: "#31104f",
  },
  Clerc: {
    title: "Gardien",
    short: "Soutien",
    portraitIcon: "✚",
    combatIcon: "✚",
    mapIcon: "✚",
    stateIcon: "✚",
    accent: "#f6df8b",
    dark: "#3d3212",
  },

  Sentinelle: {
    title: "Ancre du Voile",
    short: "Hybride",
    portraitIcon: "◇",
    combatIcon: "⛨",
    mapIcon: "◇",
    stateIcon: "◇",
    accent: "#67e8f9",
    dark: "#0f2b38",
  },
};

export function getClassPresentation(classType: ClassType): ClassPresentation {
  return CLASS_PRESENTATION[classType];
}

export function getClassIcon(classType: ClassType, variant: ClassIconVariant = "state") {
  const presentation = getClassPresentation(classType);
  if (variant === "portrait") return presentation.portraitIcon;
  if (variant === "combat") return presentation.combatIcon;
  if (variant === "map") return presentation.mapIcon;
  return presentation.stateIcon;
}
