import { createScopedRandom, randomChance } from "@/shared/platform/random";
import { MapNode } from "@/shared/types/game";
import { EtherniaRunSave } from "./gameTypes";

export type MobileCombatEncounterKind = "ambush" | "blockade" | "standoff" | "boss_gate";

export type MobileCombatEncounter = {
  kind: MobileCombatEncounterKind;
  title: string;
  text: string;
  startsImmediately: boolean;
};

function getSeed(state: EtherniaRunSave, node: MapNode) {
  return `${state.runSeed ?? "mobile-run"}:floor-${state.currentFloor}:node-${node.id}:encounter`;
}

export function buildMobileCombatEncounter(state: EtherniaRunSave, node: MapNode): MobileCombatEncounter {
  const rng = createScopedRandom(getSeed(state, node), node.eventType);
  const isBoss = node.type === "boss" || node.eventType === "boss";
  const isElite = node.eventType === "elite";

  if (isBoss) {
    if (state.currentFloor >= 4) {
      return {
        kind: "boss_gate",
        title: "Seuil du Cœur-Monde",
        text: "La cathédrale-machine bat sous les pieds. Le Second Voile attend de l'autre côté.",
        startsImmediately: false,
      };
    }

    return {
      kind: "boss_gate",
      title: "Seuil du boss",
      text: "Une présence écrase le silence. Le groupe peut encore se préparer, mais la sortie est derrière cette porte.",
      startsImmediately: false,
    };
  }

  const ambushChance = isElite ? 0.14 : 0.18;
  if (randomChance(rng, ambushChance)) {
    return {
      kind: "ambush",
      title: isElite ? "Embuscade d’élite" : "Embuscade",
      text: "Les silhouettes surgissent avant que le groupe ne puisse reculer. Le combat commence immédiatement.",
      startsImmediately: true,
    };
  }

  const blockadeChance = isElite ? 0.72 : 0.66;
  if (randomChance(rng, blockadeChance)) {
    return {
      kind: "blockade",
      title: isElite ? "Barrage d’élite" : "Blocage hostile",
      text: "Des ennemis tiennent la route. Ils n’attaquent pas encore, mais ils empêchent tout passage tant que le lieu n’est pas résolu.",
      startsImmediately: false,
    };
  }

  return {
    kind: "standoff",
    title: "Face-à-face",
    text: "La menace est visible. Le groupe peut choisir le moment de l’affrontement, mais ne peut pas quitter la zone sans la sécuriser.",
    startsImmediately: false,
  };
}
