import { EtherniaRunSave } from "./gameTypes";
import { EquipmentItem, EquipmentSlot, MapNode, Player } from "@/shared/types/game";

export type MobileRunValidationSeverity = "info" | "warning" | "critical";

export type MobileRunValidationIssue = {
  id: string;
  title: string;
  severity: MobileRunValidationSeverity;
  detail: string;
  fixHint?: string;
};

export type MobileRunValidationResult = {
  isPlayable: boolean;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: MobileRunValidationIssue[];
  recommendations: string[];
};

function addIssue(
  issues: MobileRunValidationIssue[],
  issue: MobileRunValidationIssue
) {
  issues.push(issue);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function countDuplicateNodeIds(nodes: MapNode[]) {
  const seen = new Set<number>();
  let duplicates = 0;

  for (const node of nodes) {
    if (seen.has(node.id)) {
      duplicates += 1;
    }
    seen.add(node.id);
  }

  return duplicates;
}

function countInvalidNeighborRefs(nodes: MapNode[]) {
  const ids = new Set(nodes.map((node) => node.id));

  return nodes.reduce((total, node) => {
    return total + node.neighbors.filter((neighborId) => !ids.has(neighborId)).length;
  }, 0);
}

function countOneWayNeighborRefs(nodes: MapNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  let oneWayCount = 0;

  for (const node of nodes) {
    for (const neighborId of node.neighbors) {
      const neighbor = byId.get(neighborId);
      if (neighbor && !neighbor.neighbors.includes(node.id)) {
        oneWayCount += 1;
      }
    }
  }

  return oneWayCount;
}

function validatePlayerStats(player: Player, issues: MobileRunValidationIssue[]) {
  const stats = player.stats;
  const invalidStat = Object.entries(stats).find(([, value]) => !isFiniteNumber(value));

  if (invalidStat) {
    addIssue(issues, {
      id: `player-${player.id}-invalid-stat`,
      title: `Stats invalides pour ${player.name}`,
      severity: "critical",
      detail: `La stat ${invalidStat[0]} n’est pas un nombre valide.`,
      fixHint: "Efface la sauvegarde si la run ne peut plus être chargée correctement.",
    });
    return;
  }

  if (stats.maxHp <= 0 || stats.maxMana < 0) {
    addIssue(issues, {
      id: `player-${player.id}-invalid-max`,
      title: `Maximums invalides pour ${player.name}`,
      severity: "critical",
      detail: `PV max ${stats.maxHp}, mana max ${stats.maxMana}.`,
      fixHint: "Vérifie les équipements, traits ou effets temporaires appliqués au héros.",
    });
  }

  if (stats.hp > stats.maxHp || stats.mana > stats.maxMana) {
    addIssue(issues, {
      id: `player-${player.id}-overflow`,
      title: `Ressources au-dessus du maximum pour ${player.name}`,
      severity: "warning",
      detail: `PV ${stats.hp}/${stats.maxHp}, mana ${stats.mana}/${stats.maxMana}.`,
      fixHint: "Ce n’est pas bloquant, mais une normalisation de sauvegarde devrait plafonner ces valeurs.",
    });
  }

  if (stats.hp <= 0 && !player.isDead) {
    addIssue(issues, {
      id: `player-${player.id}-death-flag`,
      title: `État de mort incohérent pour ${player.name}`,
      severity: "warning",
      detail: "Le héros a 0 PV ou moins, mais n’est pas marqué comme mort.",
      fixHint: "Le prochain combat ou changement d’étage peut corriger l’état.",
    });
  }
}

function validatePlayerInventory(player: Player, issues: MobileRunValidationIssue[]) {
  const invalidItems = player.inventory.filter((item) => !isFiniteNumber(item.quantity) || item.quantity <= 0);

  if (invalidItems.length > 0) {
    addIssue(issues, {
      id: `player-${player.id}-inventory-quantity`,
      title: `Inventaire suspect pour ${player.name}`,
      severity: "warning",
      detail: `${invalidItems.length} objet(s) ont une quantité invalide.`,
      fixHint: "Évite de vendre/utiliser ces objets avant nettoyage de sauvegarde.",
    });
  }

  const equipmentEntries = Object.entries(player.equipment) as [EquipmentSlot, EquipmentItem | null][];
  const wrongSlot = equipmentEntries.find(([slot, item]) => item && item.slot !== slot);

  if (wrongSlot) {
    addIssue(issues, {
      id: `player-${player.id}-equipment-slot`,
      title: `Équipement incohérent pour ${player.name}`,
      severity: "warning",
      detail: `Un objet est équipé dans ${wrongSlot[0]}, mais déclare le slot ${wrongSlot[1]?.slot}.`,
      fixHint: "Déséquipe puis rééquipe l’objet depuis le sac mobile.",
    });
  }
}

export function validateMobileRun(run: EtherniaRunSave): MobileRunValidationResult {
  const issues: MobileRunValidationIssue[] = [];

  if (run.players.length === 0) {
    addIssue(issues, {
      id: "no-players",
      title: "Aucun héros dans la run",
      severity: "critical",
      detail: "Une run doit contenir au moins un héros.",
      fixHint: "Retourne au lobby et crée une nouvelle partie.",
    });
  }

  if (run.currentPlayerIndex < 0 || run.currentPlayerIndex >= run.players.length) {
    addIssue(issues, {
      id: "active-index",
      title: "Index du joueur actif invalide",
      severity: "critical",
      detail: `Index ${run.currentPlayerIndex} pour ${run.players.length} héros.`,
      fixHint: "Une sauvegarde cassée peut bloquer les tours. Efface la sauvegarde si le jeu ne répond plus.",
    });
  }

  if (run.nodes.length === 0) {
    addIssue(issues, {
      id: "empty-map",
      title: "Carte vide",
      severity: "critical",
      detail: "Aucun nœud de carte n’est présent dans la sauvegarde.",
      fixHint: "Relance une run ou régénère l’étage.",
    });
  }

  const duplicateNodeIds = countDuplicateNodeIds(run.nodes);
  if (duplicateNodeIds > 0) {
    addIssue(issues, {
      id: "duplicate-nodes",
      title: "Identifiants de nœuds dupliqués",
      severity: "critical",
      detail: `${duplicateNodeIds} doublon(s) détecté(s).`,
      fixHint: "Les déplacements et la résolution de nœuds peuvent devenir instables.",
    });
  }

  const invalidNeighborRefs = countInvalidNeighborRefs(run.nodes);
  if (invalidNeighborRefs > 0) {
    addIssue(issues, {
      id: "invalid-neighbors",
      title: "Connexions vers des nœuds absents",
      severity: "critical",
      detail: `${invalidNeighborRefs} connexion(s) invalides détectée(s).`,
      fixHint: "La carte peut bloquer certains déplacements.",
    });
  }

  const oneWayNeighborRefs = countOneWayNeighborRefs(run.nodes);
  if (oneWayNeighborRefs > 0) {
    addIssue(issues, {
      id: "one-way-neighbors",
      title: "Connexions non réciproques",
      severity: "warning",
      detail: `${oneWayNeighborRefs} lien(s) ne reviennent pas vers le nœud source.`,
      fixHint: "Ce n’est pas toujours bloquant, mais cela peut rendre certains retours impossibles.",
    });
  }

  const nodeIds = new Set(run.nodes.map((node) => node.id));
  const playersOutsideMap = run.players.filter((player) => !nodeIds.has(player.currentNode));
  if (playersOutsideMap.length > 0) {
    addIssue(issues, {
      id: "players-outside-map",
      title: "Héros hors carte",
      severity: "critical",
      detail: `${playersOutsideMap.map((player) => player.name).join(", ")} ne sont pas placés sur un nœud valide.`,
      fixHint: "Le jeu ne peut pas déplacer ces héros correctement.",
    });
  }

  const alivePlayers = run.players.filter((player) => !player.isDead && player.stats.hp > 0);
  if (run.players.length > 0 && alivePlayers.length === 0) {
    addIssue(issues, {
      id: "no-alive-players",
      title: "Aucun héros vivant",
      severity: "critical",
      detail: "La run devrait basculer sur l’écran de défaite.",
      fixHint: "Retourne au lobby ou efface la sauvegarde si l’écran de défaite n’apparaît pas.",
    });
  }

  for (const player of run.players) {
    validatePlayerStats(player, issues);
    validatePlayerInventory(player, issues);
  }

  const invalidCorruptedRefs = run.corruptedNodeIds.filter((nodeId) => !nodeIds.has(nodeId));
  if (invalidCorruptedRefs.length > 0) {
    addIssue(issues, {
      id: "corruption-orphans",
      title: "Corruption orpheline",
      severity: "warning",
      detail: `${invalidCorruptedRefs.length} référence(s) de corruption pointent vers un nœud absent.`,
      fixHint: "Ce problème est généralement sans danger, mais il indique une sauvegarde à nettoyer.",
    });
  }

  if (!run.runSeed) {
    addIssue(issues, {
      id: "missing-seed",
      title: "Seed de run absent",
      severity: "warning",
      detail: "La run sera plus difficile à reproduire en cas de bug.",
      fixHint: "Les nouvelles runs devraient toujours générer un seed.",
    });
  }

  if (run.corruptionLevel < 0 || run.corruptionCharge < 0 || run.corruptionCharge > 100) {
    addIssue(issues, {
      id: "corruption-range",
      title: "Valeurs de corruption suspectes",
      severity: "warning",
      detail: `Niveau ${run.corruptionLevel}, charge ${run.corruptionCharge}/100.`,
      fixHint: "Une normalisation devrait garder la charge entre 0 et 100.",
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;
  const recommendations = [
    criticalCount > 0
      ? "Sauvegarde potentiellement cassée : évite de continuer une longue run avant correction."
      : "Aucun blocage critique détecté.",
    warningCount > 0
      ? "Vérifie encore un déplacement, un combat et une sauvegarde avant de préparer la build."
      : "La run est prête pour une session longue sur téléphone.",
  ];

  return {
    isPlayable: criticalCount === 0,
    criticalCount,
    warningCount,
    infoCount,
    issues,
    recommendations,
  };
}
