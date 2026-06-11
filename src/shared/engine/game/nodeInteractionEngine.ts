import { createEnemyFromNode, createEnemyGroupFromNode } from "@/shared/lib/enemies";
import { Enemy, EventChoice, MapNode, Player } from "@/shared/types/game";
import { REQUIRED_STATUES } from "./gameState";

export type NodeInteractionPromptKind = "first_contact" | "waiting_here" | "resume_current";

export type NodeInteractionPrompt = {
  title: string;
  text: string;
  choices: EventChoice[];
};

const ENGAGE_BATTLE_CHOICE: EventChoice = {
  id: "engage_battle",
  label: "Engager le combat",
  description: "Commencer le combat.",
};

const LAUNCH_BATTLE_CHOICE: EventChoice = {
  id: "engage_battle",
  label: "Lancer le combat",
  description: "Commencer le combat avec les héros présents.",
};

const WAIT_CHOICE: EventChoice = {
  id: "wait_for_party",
  label: "Tenir la position",
  description: "Passe le tour. Le lieu reste à résoudre.",
};

const JOIN_WAIT_CHOICE: EventChoice = {
  id: "wait_for_party",
  label: "Tenir la position",
  description: "Passe le tour. La menace reste en place.",
};

const RETREAT_CHOICE: EventChoice = {
  id: "retreat",
  label: "Repartir",
  description: "Retourner au lieu précédent.",
};

export function getBossEngageText(currentFloorStatues: number) {
  if (currentFloorStatues === 0) {
    return "Le boss est prêt. Aucune statuette récupérée : il sera beaucoup plus fort.";
  }

  if (currentFloorStatues < REQUIRED_STATUES) {
    return "Le boss est prêt. Une seule statuette récupérée : il reste renforcé.";
  }

  return "Le boss est prêt. Les statuettes l’ont affaibli.";
}

export function getNodeInteractionPrompt(
  node: MapNode,
  currentFloorStatues: number,
  kind: NodeInteractionPromptKind = "first_contact"
): NodeInteractionPrompt {
  if (kind === "waiting_here") {
    return {
      title: node.type === "boss" ? "Boss en attente" : "Combat en attente",
      text: "Un allié est déjà sur ce lieu. La menace reste à vaincre.",
      choices: [LAUNCH_BATTLE_CHOICE, JOIN_WAIT_CHOICE, RETREAT_CHOICE],
    };
  }

  const isBoss = node.type === "boss";
  const isElite = node.eventType === "elite";

  return {
    title: isBoss ? (kind === "resume_current" ? "Boss en attente" : "Boss repéré") : isElite ? "Ennemi d'élite" : "Zone hostile",
    text: isBoss
      ? getBossEngageText(currentFloorStatues)
      : isElite
      ? "Un ennemi d’élite bloque le passage."
      : "Des ennemis bloquent la route.",
    choices: [ENGAGE_BATTLE_CHOICE, WAIT_CHOICE, RETREAT_CHOICE],
  };
}

export function getAlivePlayerIndexesAtNode(players: Player[], nodeId: number) {
  return players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isDead && player.currentNode === nodeId)
    .map(({ index }) => index);
}

export function createEnemiesForInteractionNode(node: MapNode): Enemy[] {
  return node.eventType === "battle"
    ? createEnemyGroupFromNode(node)
    : [createEnemyFromNode(node)];
}
