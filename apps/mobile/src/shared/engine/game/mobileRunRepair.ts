import { EtherniaRunSave } from "./gameTypes";
import { EquipmentItem, EquipmentSlot, InventoryItem, MapNode, Player } from "@/shared/types/game";

export type MobileRunRepairResult = {
  state: EtherniaRunSave;
  changed: boolean;
  logs: string[];
};

const EQUIPMENT_SLOTS: EquipmentSlot[] = ["weapon", "offhand", "armor", "amulet", "ring", "relic"];

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeNodeLinks(nodes: MapNode[] | undefined, logs: string[]): MapNode[] {
  const safeNodes = nodes ?? [];
  const ids = new Set(safeNodes.map((node) => node.id));
  let changed = false;
  const byId = new Map<number, MapNode>(safeNodes.map((node) => [node.id, { ...node, neighbors: (node.neighbors ?? []).filter((id) => ids.has(id)) }]));

  for (const node of byId.values()) {
    const uniqueNeighbors = Array.from(new Set(node.neighbors)).filter((id) => id !== node.id && ids.has(id));
    if (uniqueNeighbors.length !== node.neighbors.length) changed = true;
    node.neighbors = uniqueNeighbors;
  }

  for (const node of byId.values()) {
    for (const neighborId of node.neighbors) {
      const neighbor = byId.get(neighborId);
      if (neighbor && !neighbor.neighbors.includes(node.id)) {
        neighbor.neighbors = [...neighbor.neighbors, node.id];
        changed = true;
      }
    }
  }

  if (changed) logs.push("Liens de carte nettoyés.");
  return safeNodes.map((node) => byId.get(node.id) ?? node);
}

function normalizeInventory(inventory: InventoryItem[] | undefined, logs: string[], ownerName: string): InventoryItem[] {
  const safeInventory = inventory ?? [];
  const nextInventory = safeInventory
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0)
    .map((item) => ({ ...item, quantity: Math.max(1, Math.floor(item.quantity)) }));

  if (nextInventory.length !== safeInventory.length) {
    logs.push(`${ownerName} : objets invalides retirés du sac.`);
  }

  return nextInventory;
}

function normalizeEquipment(player: Player, logs: string[]): Player {
  const nextEquipment = { ...(player.equipment ?? {}) } as Player["equipment"];
  let nextInventory = normalizeInventory(player.inventory, logs, player.name);
  let changed = false;

  for (const slot of EQUIPMENT_SLOTS) {
    const item = nextEquipment[slot];
    if (!item) continue;

    if (item.slot === slot) continue;

    const correctSlot = item.slot;
    if (EQUIPMENT_SLOTS.includes(correctSlot) && !nextEquipment[correctSlot]) {
      nextEquipment[correctSlot] = item;
      logs.push(`${player.name} : équipement replacé dans ${correctSlot}.`);
    } else {
      const inventoryCopy: InventoryItem = { ...item, type: item.type ?? "equipment", quantity: Math.max(1, item.quantity ?? 1) };
      nextInventory = [...nextInventory, inventoryCopy];
      logs.push(`${player.name} : équipement incohérent remis dans le sac.`);
    }

    nextEquipment[slot] = null;
    changed = true;
  }

  return changed || nextInventory !== player.inventory
    ? { ...player, equipment: nextEquipment, inventory: nextInventory }
    : player;
}

function normalizePlayer(player: Player, validNodeIds: Set<number>, fallbackNodeId: number, logs: string[]): Player {
  let nextPlayer = normalizeEquipment({
    ...player,
    inventory: player.inventory ?? [],
    mapEffects: player.mapEffects ?? [],
    statuses: player.statuses ?? [],
    traits: player.traits ?? [],
    passives: player.passives ?? [],
    buildChoices: player.buildChoices ?? [],
  }, logs);
  const maxHp = Math.max(1, Math.floor(nextPlayer.stats.maxHp || 1));
  const maxMana = Math.max(0, Math.floor(nextPlayer.stats.maxMana || 0));
  const hp = clamp(Math.floor(nextPlayer.stats.hp), 0, maxHp);
  const mana = clamp(Math.floor(nextPlayer.stats.mana), 0, maxMana);
  const shouldBeDead = hp <= 0;
  const currentNode = validNodeIds.has(nextPlayer.currentNode) ? nextPlayer.currentNode : fallbackNodeId;

  if (currentNode !== nextPlayer.currentNode) logs.push(`${nextPlayer.name} : repositionné sur la carte.`);
  if (hp !== nextPlayer.stats.hp || mana !== nextPlayer.stats.mana) logs.push(`${nextPlayer.name} : PV/Mana plafonnés.`);
  if (shouldBeDead !== nextPlayer.isDead) logs.push(`${nextPlayer.name} : état vivant/tombé corrigé.`);

  nextPlayer = {
    ...nextPlayer,
    currentNode,
    isDead: shouldBeDead,
    stats: {
      ...nextPlayer.stats,
      maxHp,
      maxMana,
      hp,
      mana,
      strength: Math.max(0, Math.floor(nextPlayer.stats.strength || 0)),
      magic: Math.max(0, Math.floor(nextPlayer.stats.magic || 0)),
      defense: Math.max(0, Math.floor(nextPlayer.stats.defense || 0)),
      speed: Math.max(1, Math.floor(nextPlayer.stats.speed || 1)),
    },
    level: Math.max(1, Math.floor(nextPlayer.level || 1)),
    xp: Math.max(0, Math.floor(nextPlayer.xp || 0)),
    xpToNextLevel: Math.max(1, Math.floor(nextPlayer.xpToNextLevel || 1)),
    gold: Math.max(0, Math.floor(nextPlayer.gold || 0)),
    mapEffects: (nextPlayer.mapEffects ?? []).filter((effect) => effect.duration > 0 && Number.isFinite(effect.value)),
    statuses: (nextPlayer.statuses ?? []).filter((status) => status.duration > 0 && Number.isFinite(status.value)),
    inventory: nextPlayer.inventory ?? [],
    traits: nextPlayer.traits ?? [],
    passives: nextPlayer.passives ?? [],
    buildChoices: nextPlayer.buildChoices ?? [],
  };

  return nextPlayer;
}

export function repairMobileRunSave(run: EtherniaRunSave): MobileRunRepairResult {
  const logs: string[] = [];
  const nodes = normalizeNodeLinks(run.nodes, logs);
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const fallbackNode = nodes.find((node) => node.type === "start") ?? nodes[0];
  const fallbackNodeId = fallbackNode?.id ?? 0;

  const players = (run.players ?? []).map((player) => normalizePlayer(player, validNodeIds, fallbackNodeId, logs));
  const aliveIndex = players.findIndex((player) => !player.isDead && player.stats.hp > 0);
  const safeCurrentPlayerIndex = players.length === 0
    ? 0
    : clamp(run.currentPlayerIndex, 0, players.length - 1);
  const nextCurrentPlayerIndex = aliveIndex >= 0 && players[safeCurrentPlayerIndex]?.isDead ? aliveIndex : safeCurrentPlayerIndex;

  if (nextCurrentPlayerIndex !== run.currentPlayerIndex) logs.push("Héros actif corrigé.");

  const sourceCorruptedNodeIds = run.corruptedNodeIds ?? [];
  const corruptedNodeIds = Array.from(new Set(sourceCorruptedNodeIds.filter((nodeId) => validNodeIds.has(nodeId))));
  if (corruptedNodeIds.length !== sourceCorruptedNodeIds.length) logs.push("Références de corruption nettoyées.");

  const previousNode = typeof run.previousNode === "number" && validNodeIds.has(run.previousNode) ? run.previousNode : null;
  if (previousNode !== run.previousNode) logs.push("Chemin de retour invalidé nettoyé.");

  const state: EtherniaRunSave = {
    ...run,
    players,
    nodes,
    currentPlayerIndex: nextCurrentPlayerIndex,
    previousNode,
    corruptionLevel: Math.max(0, Math.floor(run.corruptionLevel || 0)),
    corruptionCharge: clamp(Math.floor(run.corruptionCharge || 0), 0, 99),
    corruptedNodeIds,
    floorCorruptionTurn: Math.max(0, Math.floor(run.floorCorruptionTurn || 0)),
    currentFloorStatues: clamp(Math.floor(run.currentFloorStatues || 0), 0, 3),
    veilRelics: run.veilRelics ?? [],
  };

  return {
    state,
    changed: logs.length > 0,
    logs: logs.length > 0 ? logs : ["Aucune correction nécessaire."],
  };
}
