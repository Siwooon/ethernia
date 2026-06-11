import { EtherniaRunSave } from "./gameTypes";
import { MapNode } from "@/shared/types/game";

export type MobileDiagnosticSeverity = "ok" | "info" | "warning" | "danger";

export type MobileDiagnosticItem = {
  id: string;
  label: string;
  value: string;
  severity: MobileDiagnosticSeverity;
  detail: string;
};

export type MobileRunDiagnostics = {
  score: number;
  status: MobileDiagnosticSeverity;
  headline: string;
  items: MobileDiagnosticItem[];
};

function uniqueCount<T>(values: T[]) {
  return new Set(values).size;
}

function countInvalidNeighbors(nodes: MapNode[]) {
  const ids = new Set(nodes.map((node) => node.id));
  return nodes.reduce((count, node) => {
    return count + node.neighbors.filter((neighborId) => !ids.has(neighborId)).length;
  }, 0);
}

function buildItem({
  id,
  label,
  value,
  severity,
  detail,
}: MobileDiagnosticItem): MobileDiagnosticItem {
  return { id, label, value, severity, detail };
}

export function buildMobileRunDiagnostics(run: EtherniaRunSave): MobileRunDiagnostics {
  const nodeIds = run.nodes.map((node) => node.id);
  const duplicateNodeCount = Math.max(0, nodeIds.length - uniqueCount(nodeIds));
  const invalidNeighborCount = countInvalidNeighbors(run.nodes);
  const visibleNodes = run.nodes.filter((node) => node.visibility !== "hidden");
  const resolvedNodes = run.nodes.filter((node) => node.isConsumed);
  const alivePlayers = run.players.filter((player) => !player.isDead && player.stats.hp > 0);
  const activePlayer = run.players[run.currentPlayerIndex] ?? null;
  const activeNode = activePlayer ? run.nodes.find((node) => node.id === activePlayer.currentNode) ?? null : null;
  const playersWithoutNode = run.players.filter(
    (player) => !run.nodes.some((node) => node.id === player.currentNode)
  );
  const corruptedExistingNodes = run.corruptedNodeIds.filter((nodeId) => nodeIds.includes(nodeId));
  const orphanCorruptionCount = Math.max(0, run.corruptedNodeIds.length - corruptedExistingNodes.length);

  const items: MobileDiagnosticItem[] = [
    buildItem({
      id: "team",
      label: "Équipe",
      value: `${alivePlayers.length}/${run.players.length} vivants`,
      severity: alivePlayers.length > 0 ? "ok" : "danger",
      detail: alivePlayers.length > 0 ? "La run peut continuer." : "Aucun héros vivant détecté.",
    }),
    buildItem({
      id: "active-player",
      label: "Joueur actif",
      value: activePlayer ? activePlayer.name : "introuvable",
      severity: activePlayer && activeNode ? "ok" : "danger",
      detail: activePlayer && activeNode ? `Position actuelle : nœud ${activeNode.id}.` : "Le joueur actif ou son nœud courant est invalide.",
    }),
    buildItem({
      id: "map-visibility",
      label: "Carte révélée",
      value: `${visibleNodes.length}/${run.nodes.length}`,
      severity: visibleNodes.length > 0 ? "ok" : "warning",
      detail: `${resolvedNodes.length} nœud(s) résolu(s).`,
    }),
    buildItem({
      id: "node-ids",
      label: "Identifiants de nœuds",
      value: duplicateNodeCount === 0 ? "OK" : `${duplicateNodeCount} doublon(s)`,
      severity: duplicateNodeCount === 0 ? "ok" : "danger",
      detail: duplicateNodeCount === 0 ? "Tous les nœuds ont un identifiant unique." : "Des doublons peuvent casser les déplacements ou la sauvegarde.",
    }),
    buildItem({
      id: "neighbors",
      label: "Connexions carte",
      value: invalidNeighborCount === 0 ? "OK" : `${invalidNeighborCount} invalide(s)`,
      severity: invalidNeighborCount === 0 ? "ok" : "danger",
      detail: invalidNeighborCount === 0 ? "Tous les liens pointent vers un nœud existant." : "Certains voisins pointent vers un nœud inexistant.",
    }),
    buildItem({
      id: "player-positions",
      label: "Positions héros",
      value: playersWithoutNode.length === 0 ? "OK" : `${playersWithoutNode.length} invalide(s)`,
      severity: playersWithoutNode.length === 0 ? "ok" : "danger",
      detail: playersWithoutNode.length === 0 ? "Tous les héros sont placés sur la carte." : "Un héros référence un nœud absent de la carte.",
    }),
    buildItem({
      id: "corruption",
      label: "Corruption",
      value: `Niv. ${run.corruptionLevel} · ${run.corruptionCharge}/100`,
      severity: run.corruptionLevel >= 5 ? "warning" : "info",
      detail: `${corruptedExistingNodes.length} nœud(s) corrompu(s), ${orphanCorruptionCount} référence(s) orpheline(s).`,
    }),
    buildItem({
      id: "seed",
      label: "Seed",
      value: run.runSeed ?? "absent",
      severity: run.runSeed ? "ok" : "warning",
      detail: run.runSeed ? "La run peut être reproduite plus facilement." : "La run n’a pas de seed sauvegardé.",
    }),
  ];

  const dangerCount = items.filter((item) => item.severity === "danger").length;
  const warningCount = items.filter((item) => item.severity === "warning").length;
  const score = Math.max(0, 100 - dangerCount * 30 - warningCount * 10);
  const status: MobileDiagnosticSeverity = dangerCount > 0 ? "danger" : warningCount > 0 ? "warning" : "ok";
  const headline = dangerCount > 0
    ? "Problèmes critiques détectés"
    : warningCount > 0
      ? "Run jouable avec avertissements"
      : "Run saine";

  return { score, status, headline, items };
}
