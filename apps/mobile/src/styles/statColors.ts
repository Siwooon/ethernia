export type AttributeTone = "hp" | "mana" | "strength" | "magic" | "defense" | "speed" | "gold" | "corruption";

export const attributeColors: Record<AttributeTone, { label: string; color: string; soft: string; border: string; icon: string }> = {
  hp: {
    label: "PV",
    color: "#ff6b7d",
    soft: "rgba(255,107,125,0.14)",
    border: "rgba(255,107,125,0.42)",
    icon: "♥",
  },
  mana: {
    label: "Mana",
    color: "#8fb7ff",
    soft: "rgba(143,183,255,0.14)",
    border: "rgba(143,183,255,0.42)",
    icon: "✦",
  },
  strength: {
    label: "Force",
    color: "#ff9f5a",
    soft: "rgba(255,159,90,0.14)",
    border: "rgba(255,159,90,0.42)",
    icon: "⚔",
  },
  magic: {
    label: "Magie",
    color: "#b084ff",
    soft: "rgba(176,132,255,0.14)",
    border: "rgba(176,132,255,0.42)",
    icon: "◆",
  },
  defense: {
    label: "Défense",
    color: "#74d6ff",
    soft: "rgba(116,214,255,0.13)",
    border: "rgba(116,214,255,0.40)",
    icon: "⬟",
  },
  speed: {
    label: "Vitesse",
    color: "#7ee787",
    soft: "rgba(126,231,135,0.13)",
    border: "rgba(126,231,135,0.40)",
    icon: "➤",
  },
  gold: {
    label: "Or",
    color: "#f6c453",
    soft: "rgba(246,196,83,0.14)",
    border: "rgba(246,196,83,0.42)",
    icon: "●",
  },
  corruption: {
    label: "Corruption",
    color: "#d06bff",
    soft: "rgba(208,107,255,0.14)",
    border: "rgba(208,107,255,0.42)",
    icon: "✹",
  },
};

export function getAttributeTone(label: string): AttributeTone | undefined {
  const normalized = label.toLowerCase();
  if (normalized.includes("pv") || normalized.includes("vie")) return "hp";
  if (normalized.includes("mana")) return "mana";
  if (normalized.includes("for") || normalized.includes("force")) return "strength";
  if (normalized.includes("mag") || normalized.includes("sort")) return "magic";
  if (normalized.includes("def") || normalized.includes("déf")) return "defense";
  if (normalized.includes("vit") || normalized.includes("vitesse")) return "speed";
  if (normalized.includes("or")) return "gold";
  if (normalized.includes("corruption")) return "corruption";
  return undefined;
}
