import { StatusEffect } from "@/shared/types/game";

export type StatusTone = {
  bg: string;
  border: string;
  text: string;
};

export type StatusBadgeView = {
  key: string;
  type: StatusEffect["type"];
  label: string;
  value: number;
  duration: number;
  source?: string;
  tone: StatusTone;
  title: string;
  shortText: string;
  description: string;
  impact: string;
  mobileHint: string;
};

export const STATUS_LABELS: Record<StatusEffect["type"], string> = {
  poison: "☠️ Poison",
  burn: "🔥 Brûlure",
  shield: "🛡️ Bouclier",
  regen: "✨ Régénération",
  weakness: "🪓 Faiblesse",
  frailty: "🩹 Fragilité",
  silence: "🔇 Silence",
  vulnerability: "🎯 Vulnérable",
  marked: "🎯 Marqué",
};

export const STATUS_TONES: Record<StatusEffect["type"], StatusTone> = {
  poison: {
    bg: "bg-lime-950/40",
    border: "border-lime-700",
    text: "text-lime-200",
  },
  burn: {
    bg: "bg-red-950/40",
    border: "border-red-700",
    text: "text-red-200",
  },
  shield: {
    bg: "bg-sky-950/40",
    border: "border-sky-700",
    text: "text-sky-200",
  },
  regen: {
    bg: "bg-emerald-950/40",
    border: "border-emerald-700",
    text: "text-emerald-200",
  },
  weakness: {
    bg: "bg-orange-950/40",
    border: "border-orange-700",
    text: "text-orange-200",
  },
  frailty: {
    bg: "bg-amber-950/40",
    border: "border-amber-700",
    text: "text-amber-200",
  },
  silence: {
    bg: "bg-violet-950/40",
    border: "border-violet-700",
    text: "text-violet-200",
  },
  vulnerability: {
    bg: "bg-fuchsia-950/40",
    border: "border-fuchsia-700",
    text: "text-fuchsia-200",
  },
  marked: {
    bg: "bg-rose-950/40",
    border: "border-rose-700",
    text: "text-rose-200",
  },
};

const DEFAULT_STATUS_TONE: StatusTone = {
  bg: "bg-slate-950/40",
  border: "border-slate-700",
  text: "text-slate-200",
};

const STATUS_DESCRIPTIONS: Record<StatusEffect["type"], string> = {
  poison: "Inflige des dégâts réguliers au début ou à la fin des tours selon la résolution du combat.",
  burn: "Inflige des dégâts de feu répétés. La valeur indique l'intensité de la brûlure.",
  shield: "Absorbe les dégâts avant les points de vie. Le bouclier n'a pas de durée affichée.",
  regen: "Rend des points de vie au fil des tours tant que l'effet est actif.",
  weakness: "Réduit la puissance offensive de la cible et rend ses attaques moins dangereuses.",
  frailty: "Réduit la résistance de la cible et la rend plus facile à achever.",
  silence: "Empêche ou limite l'utilisation des compétences magiques pendant la durée de l'effet.",
  vulnerability: "Augmente les dégâts reçus par la cible pendant la durée de l'effet.",
  marked: "Désigne une cible prioritaire. Certaines attaques ou passifs peuvent profiter de ce marquage.",
};

function getStatusImpact(status: StatusEffect): string {
  switch (status.type) {
    case "shield":
      return `Absorption restante : ${status.value}.`;
    case "silence":
      return `Durée restante : ${status.duration} tour(s).`;
    case "weakness":
    case "frailty":
    case "vulnerability":
    case "marked":
      return `Intensité : ${status.value}. Durée restante : ${status.duration} tour(s).`;
    case "poison":
    case "burn":
    case "regen":
      return `Valeur par déclenchement : ${status.value}. Durée restante : ${status.duration} tour(s).`;
    default:
      return `Valeur : ${status.value}. Durée restante : ${status.duration} tour(s).`;
  }
}

export function getStatusLabel(type: StatusEffect["type"]): string {
  return STATUS_LABELS[type] ?? type;
}

export function getStatusDescription(type: StatusEffect["type"]): string {
  return STATUS_DESCRIPTIONS[type] ?? "Effet spécial actif.";
}

export function formatCombatStatuses(
  statuses: StatusEffect[],
): StatusBadgeView[] {
  return statuses.map((status, index) => {
    const label = getStatusLabel(status.type);
    const isShield = status.type === "shield";
    const duration = isShield ? 0 : status.duration;
    const description = getStatusDescription(status.type);
    const impact = getStatusImpact(status);
    const sourceText = status.source ? `Source : ${status.source}.` : "";
    const title = isShield
      ? `${label} • valeur ${status.value}`
      : `${label} • valeur ${status.value} • ${duration} tour(s)`;
    const shortText = isShield
      ? `${label} · ${status.value}`
      : `${label} · ${status.value} · ${duration}t`;

    return {
      key: `${status.type}-${status.source ?? "unknown"}-${index}`,
      type: status.type,
      label,
      value: status.value,
      duration,
      source: status.source,
      tone: STATUS_TONES[status.type] ?? DEFAULT_STATUS_TONE,
      title,
      shortText,
      description,
      impact,
      mobileHint: [description, impact, sourceText].filter(Boolean).join(" "),
    };
  });
}
