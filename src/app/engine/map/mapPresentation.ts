import { MapNode } from "@/app/component/types/game";

export type MapNodeDisplay = {
  icon: string;
  label: string;
  border: string;
  bg: string;
};

export function getMapNodeDisplay(node: MapNode): MapNodeDisplay {
  if (node.kind === "start") {
    return { icon: "🟢", label: "Camp", border: "border-lime-400", bg: "bg-lime-100/90 text-black" };
  }

  if (node.kind === "statuette") {
    return { icon: "🗿", label: "Statuette", border: "border-cyan-300", bg: "bg-cyan-100/90 text-black" };
  }

  if (node.kind === "boss_prep") {
    return { icon: "🛌", label: "Repos", border: "border-yellow-400", bg: "bg-yellow-100/90 text-black" };
  }

  if (node.kind === "boss") {
    return { icon: "👑", label: "Boss", border: "border-red-500", bg: "bg-red-100/90 text-black" };
  }

  switch (node.eventType) {
    case "battle":
      return { icon: "⚔️", label: "Combat", border: "border-slate-300", bg: "bg-white/90 text-black" };
    case "elite":
      return { icon: "💀", label: "Élite", border: "border-red-400", bg: "bg-red-100/90 text-black" };
    case "rest":
      return { icon: "🛌", label: "Repos", border: "border-cyan-400", bg: "bg-cyan-100/90 text-black" };
    case "treasure":
      return { icon: "💰", label: "Trésor", border: "border-amber-400", bg: "bg-amber-100/90 text-black" };
    case "random":
      return { icon: "❓", label: "Mystère", border: "border-violet-400", bg: "bg-violet-100/90 text-black" };
    case "merchant_blacksmith":
      return { icon: "🔨", label: "Forge", border: "border-orange-400", bg: "bg-orange-100/90 text-black" };
    case "merchant_alchemist":
      return { icon: "⚗️", label: "Alchi", border: "border-emerald-400", bg: "bg-emerald-100/90 text-black" };
    case "merchant_mystic":
      return { icon: "✨", label: "Mystique", border: "border-fuchsia-400", bg: "bg-fuchsia-100/90 text-black" };
    case "scripted_shrine":
      return { icon: "🕯️", label: "Sanctuaire", border: "border-indigo-400", bg: "bg-indigo-100/90 text-black" };
    default:
      return { icon: "•", label: "Inconnu", border: "border-gray-300", bg: "bg-white/90 text-black" };
  }
}

export function getMapNodeDescription(node: MapNode): string {
  if (node.kind === "start") return "Point de départ et de rassemblement de l'équipe.";
  if (node.kind === "statuette") return "Récupère une statuette pour affaiblir le boss de l'étage.";
  if (node.kind === "boss_prep") return "Dernier repos avant le combat de boss.";
  if (node.kind === "boss") return "Combat majeur de l'étage. Il peut nécessiter des statuettes pour être abordable.";

  switch (node.eventType) {
    case "battle":
      return "Combat standard avec récompenses de progression.";
    case "elite":
      return "Combat difficile avec récompense supérieure.";
    case "rest":
      return "Nœud de récupération pour soigner ou préparer la suite.";
    case "treasure":
      return "Récompense ou butin à récupérer.";
    case "random":
      return "Événement à choix avec risques et récompenses.";
    case "merchant_blacksmith":
      return "Marchand spécialisé dans l'équipement et l'amélioration martiale.";
    case "merchant_alchemist":
      return "Marchand spécialisé dans les consommables et préparations.";
    case "merchant_mystic":
      return "Marchand spécialisé dans les objets mystiques.";
    case "scripted_shrine":
      return "Sanctuaire narratif ou rituel pouvant aider l'équipe.";
    default:
      return "Lieu inconnu.";
  }
}

export function getMapNodeStateLabel({
  isCurrent,
  isReachable,
  isCorrupted,
  isConsumed,
  bossLocked,
}: {
  isCurrent: boolean;
  isReachable: boolean;
  isCorrupted: boolean;
  isConsumed: boolean;
  bossLocked: boolean;
}) {
  if (isCurrent) return "Position actuelle";
  if (bossLocked) return "Boss verrouillé";
  if (isConsumed) return "Déjà résolu";
  if (isCorrupted) return "Corrompu";
  if (isReachable) return "Accessible";
  return "Non accessible ce tour";
}
