import { MapNode, NodeState } from "@/shared/types/game";
import { getNarrativeNodeState } from "./mapEngine";

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
    return { icon: "🗿", label: "Relique", border: "border-cyan-300", bg: "bg-cyan-100/90 text-black" };
  }

  if (node.kind === "boss_prep") {
    return { icon: "🛌", label: "Halte", border: "border-yellow-400", bg: "bg-yellow-100/90 text-black" };
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
      return { icon: "🛌", label: "Refuge", border: "border-cyan-400", bg: "bg-cyan-100/90 text-black" };
    case "treasure":
      return { icon: "💰", label: "Butin", border: "border-amber-400", bg: "bg-amber-100/90 text-black" };
    case "random":
      return { icon: "❓", label: "Événement", border: "border-violet-400", bg: "bg-violet-100/90 text-black" };
    case "merchant_blacksmith":
      return { icon: "🔨", label: "Forge nomade", border: "border-orange-400", bg: "bg-orange-100/90 text-black" };
    case "merchant_alchemist":
      return { icon: "⚗️", label: "Alchimiste", border: "border-emerald-400", bg: "bg-emerald-100/90 text-black" };
    case "merchant_mystic":
      return { icon: "✨", label: "Mystique", border: "border-fuchsia-400", bg: "bg-fuchsia-100/90 text-black" };
    case "scripted_shrine":
      return { icon: "🕯️", label: "Sanctuaire", border: "border-indigo-400", bg: "bg-indigo-100/90 text-black" };
    default:
      return { icon: "•", label: "Route", border: "border-gray-300", bg: "bg-white/90 text-black" };
  }
}

export function isMapNodeRevealedForMobile(node: MapNode) {
  return node.kind === "start" || node.visibility === "visited" || Boolean(node.isConsumed);
}

function getResolvedDisplay(node: MapNode, state: NodeState): MapNodeDisplay | null {
  if (node.kind === "start") return null;

  if (state === "corrupted") {
    return { icon: "🩸", label: "Corruption active", border: "border-red-500", bg: "bg-red-100/90 text-black" };
  }

  if (state === "exhausted") {
    if (node.eventType === "scripted_shrine") {
      return { icon: "🕯️", label: "Sanctuaire muet", border: "border-stone-500", bg: "bg-stone-900/90 text-white" };
    }
    if (node.eventType === "rest") {
      return { icon: "🌙", label: "Abri froid", border: "border-stone-500", bg: "bg-stone-900/90 text-white" };
    }
    if ((node.eventType === "merchant_blacksmith" || node.eventType === "merchant_alchemist" || node.eventType === "merchant_mystic")) {
      return { icon: "🏚️", label: "Camp abandonné", border: "border-stone-500", bg: "bg-stone-900/90 text-white" };
    }
    return { icon: "✦", label: "Lieu épuisé", border: "border-stone-500", bg: "bg-stone-900/90 text-white" };
  }

  if (state === "revisitable") {
    if (node.eventType === "battle" || node.eventType === "elite") {
      return { icon: "🪦", label: "Restes du combat", border: "border-stone-400", bg: "bg-stone-900/90 text-white" };
    }
    if (node.eventType === "treasure") {
      return { icon: "📦", label: "Coffre vidé", border: "border-stone-400", bg: "bg-stone-900/90 text-white" };
    }
    return { icon: "🌫️", label: "Trace restante", border: "border-stone-400", bg: "bg-stone-900/90 text-white" };
  }

  if (state === "resolved") {
    return { icon: "✦", label: "Lieu sécurisé", border: "border-stone-400", bg: "bg-stone-900/90 text-white" };
  }

  return null;
}

export function getMobileMapNodeDisplay(node: MapNode, corruptedNodeIds: number[] = []): MapNodeDisplay {
  if (!isMapNodeRevealedForMobile(node)) {
    return { icon: "◆", label: "Brume", border: "border-slate-500", bg: "bg-slate-900/90 text-white" };
  }

  const state = getNarrativeNodeState(node, corruptedNodeIds);
  const resolved = node.isConsumed ? getResolvedDisplay(node, state) : null;
  if (resolved) return resolved;

  return getMapNodeDisplay(node);
}

export function getMobileMapNodeDescription(node: MapNode, corruptedNodeIds: number[] = []) {
  if (!isMapNodeRevealedForMobile(node)) {
    return "Lieu non découvert. Avance sur une route ouverte pour le révéler.";
  }

  const state = getNarrativeNodeState(node, corruptedNodeIds);

  if (state === "corrupted" && node.isConsumed) {
    if (node.eventType === "battle" || node.eventType === "elite") {
      return "Combat terminé. Une fouille peut donner un petit butin, mais une embuscade reste possible.";
    }
    if (node.eventType === "treasure") {
      return "Coffre vidé. Une cache peut rester, avec risque d’embuscade.";
    }
    return "Lieu déjà traversé. La corruption y a laissé un nouveau risque.";
  }

  if (state === "exhausted") {
    if (node.eventType === "scripted_shrine") return "Sanctuaire épuisé. Plus aucun bonus ici.";
    if (node.eventType === "rest") return "Abri épuisé. Tu peux passer, mais plus te reposer.";
    if ((node.eventType === "merchant_blacksmith" || node.eventType === "merchant_alchemist" || node.eventType === "merchant_mystic")) return "Le marchand est parti. La boutique n’est plus disponible.";
    return "Lieu terminé. Tu peux le traverser.";
  }

  if (state === "revisitable") {
    if (node.eventType === "battle" || node.eventType === "elite") return "Passage libre. Des restes pourront être fouillés si la corruption revient.";
    if (node.eventType === "treasure") return "Butin principal pris. Le lieu reste traversable.";
    return "Lieu traversé. Il ne bloque plus la route.";
  }

  return getMapNodeDescription(node);
}

export function getMapNodeDescription(node: MapNode): string {
  if (node.kind === "start") return "Point de départ. Aucun danger ici.";
  if (node.kind === "statuette") return "Récupère une statuette pour affaiblir le boss de l’étage.";
  if (node.kind === "boss_prep") return "Dernière halte avant le boss. Prépare PV, mana et objets.";
  if (node.kind === "boss") return "Boss de l’étage. Les statuettes récupérées le rendent moins dangereux.";

  switch (node.eventType) {
    case "battle":
      return "Combat standard. Gagne XP et récompenses en sécurisant le lieu.";
    case "elite":
      return "Combat d’élite. Plus dur, meilleure récompense.";
    case "rest":
      return "Repos possible. Récupère PV, mana ou retire des malus.";
    case "treasure":
      return "Butin possible. Ouvre prudemment ou force pour viser mieux.";
    case "random":
      return "Événement court. Choisis un gain, une fouille ou un départ sûr.";
    case "merchant_blacksmith":
      return "Forge disponible. Achète, vends ou améliore l’équipement.";
    case "merchant_alchemist":
      return "Alchimiste disponible. Achète ou vends des consommables.";
    case "merchant_mystic":
      return "Mystique disponible. Achète ou vends des reliques.";
    case "scripted_shrine":
      return "Sanctuaire. Bonus, soin d’allié ou choix à coût.";
    default:
      return "Route inconnue.";
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
  if (isCurrent) return "Ici";
  if (bossLocked) return "Seuil scellé";
  if (isCorrupted && isConsumed) return "Corruption active";
  if (isConsumed) return "Traversable";
  if (isCorrupted) return "Corrompu";
  if (isReachable) return "Route ouverte";
  return "Hors de portée";
}
