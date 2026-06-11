import { createEnemyFromNode, createEnemyGroupFromNode } from "@/app/component/lib/enemies";
import { Enemy, EventChoice, MapNode, Player } from "@/app/component/types/game";
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
  description: "Lancer le combat immédiatement.",
};

const LAUNCH_BATTLE_CHOICE: EventChoice = {
  id: "engage_battle",
  label: "Lancer le combat",
  description: "Commencer le combat avec tous les joueurs présents.",
};

const WAIT_CHOICE: EventChoice = {
  id: "wait_for_party",
  label: "Attendre les autres",
  description: "Rester sur place et passer le tour.",
};

const JOIN_WAIT_CHOICE: EventChoice = {
  id: "wait_for_party",
  label: "Se joindre à l'attente",
  description: "Rester sur place et attendre encore.",
};

export function getBossEngageText(currentFloorStatues: number) {
  if (currentFloorStatues === 0) {
    return "Le boss est devant vous. Aucune statuette n’a été récupérée : il sera déchaîné. Voulez-vous lancer le combat maintenant ou attendre les autres joueurs ?";
  }

  if (currentFloorStatues < REQUIRED_STATUES) {
    return "Le boss est devant vous. Une seule statuette a été récupérée : il restera renforcé. Voulez-vous lancer le combat maintenant ou attendre les autres joueurs ?";
  }

  return "Le boss est devant vous. Il a été correctement affaibli. Voulez-vous lancer le combat maintenant ou attendre les autres joueurs ?";
}

export function getNodeInteractionPrompt(
  node: MapNode,
  currentFloorStatues: number,
  kind: NodeInteractionPromptKind = "first_contact"
): NodeInteractionPrompt {
  if (kind === "waiting_here") {
    return {
      title: node.type === "boss" ? "Boss en attente" : "Combat en attente",
      text: "Un autre joueur attend déjà ici. Voulez-vous rejoindre le combat ou attendre avec lui ?",
      choices: [LAUNCH_BATTLE_CHOICE, JOIN_WAIT_CHOICE],
    };
  }

  const isBoss = node.type === "boss";
  const isElite = node.eventType === "elite";

  return {
    title: isBoss ? (kind === "resume_current" ? "Boss en attente" : "Boss repéré") : isElite ? "Ennemi d'élite" : "Zone hostile",
    text: isBoss
      ? getBossEngageText(currentFloorStatues)
      : isElite
      ? "Un ennemi d'élite bloque le passage. Voulez-vous engager le combat maintenant ou attendre les autres joueurs ?"
      : "Un combat vous attend sur cette case. Voulez-vous engager le combat maintenant ou attendre les autres joueurs ?",
    choices: [ENGAGE_BATTLE_CHOICE, WAIT_CHOICE],
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
