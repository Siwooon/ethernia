import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { consumeItem, equipInventoryItem, unequipInventorySlot } from "@/shared/lib/inventory";
import { getDerivedPlayerStats } from "@/shared/lib/playerStats";
import { EquipmentSlot, InventoryItem, Player, Stats } from "@/shared/types/game";


export type MobileInventoryFilter = "all" | "equipment" | "consumable" | "material" | "compatible";
export type MobileInventorySort = "type" | "name" | "power" | "quantity";

export type MobileStatComparison = {
  key: keyof Pick<Stats, "maxHp" | "maxMana" | "strength" | "magic" | "defense" | "speed">;
  label: string;
  current: number;
  next: number;
  delta: number;
};

export type MobileEquipmentComparison = {
  item: InventoryItem;
  slot: EquipmentSlot;
  currentItemName: string | null;
  powerDelta: number;
  statComparisons: MobileStatComparison[];
  summary: string;
};

export type MobileInventoryResult = {
  state: EtherniaRunSave;
  success: boolean;
  message: string;
};

export type MobileInventoryPlayerSummary = {
  player: Player;
  derivedStats: Stats;
  equipmentPower: number;
  inventoryCount: number;
};

export type MobileItemPresentation = {
  title: string;
  subtitle: string;
  description: string;
  effectLines: string[];
  canEquip: boolean;
  canUse: boolean;
};

function updatePlayerAtIndex(
  state: EtherniaRunSave,
  playerIndex: number,
  nextPlayer: Player
): EtherniaRunSave {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === playerIndex ? nextPlayer : player
    ),
  };
}

function getPlayer(state: EtherniaRunSave, playerIndex: number): Player | null {
  return state.players[playerIndex] ?? null;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}



export type MobileForgePreview = {
  slot: EquipmentSlot;
  item: InventoryItem;
  nextItem: InventoryItem;
  currentLevel: number;
  nextLevel: number;
  maxLevel: number;
  cost: number;
  canUpgrade: boolean;
  reason: string | null;
  beforePower: number;
  afterPower: number;
  gainedLines: string[];
};

const FORGE_MAX_LEVEL = 5;

function getItemForgeLevel(item: InventoryItem | null | undefined): number {
  return Math.max(0, item?.upgradeLevel ?? 0);
}

function addForgeStat(item: InventoryItem): InventoryItem {
  const effects = { ...(item.effects ?? {}) };
  const slot = item.slot;

  if (slot === "weapon") {
    const strength = effects.strength ?? 0;
    const magic = effects.magic ?? 0;
    if (magic > strength) effects.magic = magic + 1;
    else effects.strength = strength + 1;
  } else if (slot === "offhand") {
    effects.defense = (effects.defense ?? 0) + 1;
    effects.maxHp = (effects.maxHp ?? 0) + 2;
  } else if (slot === "armor") {
    effects.defense = (effects.defense ?? 0) + 1;
    effects.maxHp = (effects.maxHp ?? 0) + 4;
  } else if (slot === "amulet") {
    effects.maxMana = (effects.maxMana ?? 0) + 4;
    effects.magic = (effects.magic ?? 0) + 1;
  } else if (slot === "ring") {
    effects.speed = (effects.speed ?? 0) + 1;
    effects.maxMana = (effects.maxMana ?? 0) + 2;
  } else if (slot === "relic") {
    effects.magic = (effects.magic ?? 0) + 1;
    effects.defense = (effects.defense ?? 0) + 1;
  }

  const nextLevel = getItemForgeLevel(item) + 1;
  return {
    ...item,
    upgradeLevel: nextLevel,
    name: item.name.includes("+") ? item.name.replace(/\+\d+$/, `+${nextLevel}`) : `${item.name} +${nextLevel}`,
    effects,
  };
}

function getForgeGainLines(before: InventoryItem, after: InventoryItem): string[] {
  const beforeEffects = before.effects ?? {};
  const afterEffects = after.effects ?? {};
  const labels: Array<[keyof NonNullable<InventoryItem["effects"]>, string]> = [
    ["strength", "Force"],
    ["magic", "Magie"],
    ["defense", "Défense"],
    ["speed", "Vitesse"],
    ["maxHp", "PV max"],
    ["maxMana", "Mana max"],
    ["damageEnemy", "Dégâts"],
    ["shield", "Bouclier"],
  ];
  return labels.flatMap(([key, label]) => {
    const delta = (afterEffects[key] ?? 0) - (beforeEffects[key] ?? 0);
    return delta ? [`${label} +${delta}`] : [];
  });
}

export function getMobileForgePreview(player: Player, slot: EquipmentSlot): MobileForgePreview | null {
  const item = player.equipment?.[slot];
  if (!item) return null;

  const currentLevel = getItemForgeLevel(item);
  const nextLevel = currentLevel + 1;
  const maxLevel = FORGE_MAX_LEVEL;
  const beforePower = getMobileItemPowerScore(item);
  const nextItem = currentLevel >= maxLevel ? item : addForgeStat(item);
  const afterPower = getMobileItemPowerScore(nextItem);
  const cost = 45 + currentLevel * 35 + Math.max(0, beforePower) * 6;
  const canUpgrade = currentLevel < maxLevel && (player.gold ?? 0) >= cost;

  return {
    slot,
    item,
    nextItem,
    currentLevel,
    nextLevel: Math.min(nextLevel, maxLevel),
    maxLevel,
    cost,
    canUpgrade,
    reason: currentLevel >= maxLevel ? "Objet au rang maximum." : (player.gold ?? 0) < cost ? "Or insuffisant." : null,
    beforePower,
    afterPower,
    gainedLines: getForgeGainLines(item, nextItem),
  };
}

export function upgradeMobileEquipmentAtForge(
  state: EtherniaRunSave,
  playerIndex: number,
  slot: EquipmentSlot
): MobileInventoryResult {
  const player = getPlayer(state, playerIndex);
  if (!player) return { state, success: false, message: "Héros introuvable." };

  const preview = getMobileForgePreview(player, slot);
  if (!preview) return { state, success: false, message: "Aucun équipement à forger." };
  if (!preview.canUpgrade) return { state, success: false, message: preview.reason ?? "Forge impossible." };

  const nextPlayer: Player = {
    ...player,
    gold: Math.max(0, (player.gold ?? 0) - preview.cost),
    equipment: {
      ...(player.equipment ?? {}),
      [slot]: preview.nextItem,
    },
  };

  return {
    state: updatePlayerAtIndex(state, playerIndex, nextPlayer),
    success: true,
    message: `Forge : ${preview.item.name} passe au rang +${preview.nextLevel}.`,
  };
}

export function getMobileInventoryPlayerSummaries(
  state: EtherniaRunSave
): MobileInventoryPlayerSummary[] {
  return state.players.map((player) => {
    const equipmentPower = Object.values(player.equipment ?? {})
      .filter(Boolean)
      .reduce((total, item) => {
        if (!item) return total;
        const effects = item.effects ?? {};
        const curses = item.curseEffects ?? {};
        return (
          total +
          (effects.strength ?? 0) +
          (effects.magic ?? 0) +
          (effects.defense ?? 0) +
          Math.floor((effects.maxHp ?? 0) / 5) +
          Math.floor((effects.maxMana ?? 0) / 5) +
          (curses.strength ?? 0) +
          (curses.magic ?? 0) +
          (curses.defense ?? 0) +
          Math.floor((curses.maxHp ?? 0) / 5) +
          Math.floor((curses.maxMana ?? 0) / 5)
        );
      }, 0);

    return {
      player,
      derivedStats: getDerivedPlayerStats(player),
      equipmentPower,
      inventoryCount: (player.inventory ?? []).reduce((count, item) => count + (item.quantity ?? 1), 0),
    };
  });
}

export function presentMobileInventoryItem(item: InventoryItem): MobileItemPresentation {
  const effectLines: string[] = [];
  const effects = item.effects ?? {};
  const curses = item.curseEffects ?? {};

  if (effects.healHp) effectLines.push(`PV ${formatSigned(effects.healHp)}`);
  if (effects.healMana) effectLines.push(`Mana ${formatSigned(effects.healMana)}`);
  if (effects.strength) effectLines.push(`Force ${formatSigned(effects.strength)}`);
  if (effects.magic) effectLines.push(`Magie ${formatSigned(effects.magic)}`);
  if (effects.defense) effectLines.push(`Défense ${formatSigned(effects.defense)}`);
  if (effects.maxHp) effectLines.push(`PV max ${formatSigned(effects.maxHp)}`);
  if (effects.maxMana) effectLines.push(`Mana max ${formatSigned(effects.maxMana)}`);
  if (effects.damageEnemy) effectLines.push(`Dégâts combat ${formatSigned(effects.damageEnemy)}`);
  if (effects.shield) effectLines.push(`Bouclier ${formatSigned(effects.shield)}`);

  if (item.combatEffects?.damageEnemy) effectLines.push(`Combat : ${item.combatEffects.damageEnemy} dégâts`);
  if (item.combatEffects?.healHp) effectLines.push(`Combat : PV ${formatSigned(item.combatEffects.healHp)}`);
  if (item.combatEffects?.healMana) effectLines.push(`Combat : mana ${formatSigned(item.combatEffects.healMana)}`);
  if (item.combatEffects?.shield) effectLines.push(`Combat : bouclier ${formatSigned(item.combatEffects.shield)}`);
  if (item.combatEffects?.applyStatus) effectLines.push(`Combat : applique ${item.combatEffects.applyStatus.type}`);

  if (curses.strength) effectLines.push(`Malus force ${formatSigned(curses.strength)}`);
  if (curses.magic) effectLines.push(`Malus magie ${formatSigned(curses.magic)}`);
  if (curses.defense) effectLines.push(`Malus défense ${formatSigned(curses.defense)}`);
  if (curses.maxHp) effectLines.push(`Malus PV max ${formatSigned(curses.maxHp)}`);
  if (curses.maxMana) effectLines.push(`Malus mana max ${formatSigned(curses.maxMana)}`);

  const subtitleParts: string[] = [item.type];
  if (item.slot) subtitleParts.push(item.slot);
  if (item.corrupted) subtitleParts.push("corrompu");
  if (item.quantity > 1) subtitleParts.push(`x${item.quantity}`);

  return {
    title: item.name,
    subtitle: subtitleParts.join(" · "),
    description: item.description,
    effectLines,
    canEquip: item.type === "equipment" && Boolean(item.slot),
    canUse: item.type === "consumable",
  };
}


export function getMobileItemTypeLabel(item: InventoryItem): string {
  if (item.type === "equipment") {
    if (item.slot === "weapon") return "Arme";
    if (item.slot === "offhand") return "Main gauche";
    if (item.slot === "armor") return "Armure";
    if (item.slot === "amulet") return "Amulette";
    if (item.slot === "ring") return "Anneau";
    if (item.slot === "relic") return "Relique";
    return "Équipement";
  }
  if (item.type === "consumable") return "Consommable";
  if (item.type === "material") return "Matériau";
  if (item.type === "relic") return "Relique";
  return item.type;
}

export function getMobileItemPowerScore(item: InventoryItem): number {
  const effects = item.effects ?? {};
  const curses = item.curseEffects ?? {};
  return (
    (effects.strength ?? 0) * 3 +
    (effects.magic ?? 0) * 3 +
    (effects.defense ?? 0) * 3 +
    Math.floor((effects.maxHp ?? 0) / 4) +
    Math.floor((effects.maxMana ?? 0) / 4) +
    Math.floor((effects.healHp ?? 0) / 8) +
    Math.floor((effects.healMana ?? 0) / 8) +
    Math.floor((effects.damageEnemy ?? 0) / 5) +
    Math.floor((effects.shield ?? 0) / 5) +
    Math.floor((item.combatEffects?.damageEnemy ?? 0) / 5) +
    Math.floor((item.combatEffects?.shield ?? 0) / 5) +
    Math.floor((item.combatEffects?.healHp ?? 0) / 8) +
    Math.floor((item.combatEffects?.healMana ?? 0) / 8) +
    (curses.strength ?? 0) * 3 +
    (curses.magic ?? 0) * 3 +
    (curses.defense ?? 0) * 3 +
    Math.floor((curses.maxHp ?? 0) / 4) +
    Math.floor((curses.maxMana ?? 0) / 4)
  );
}

export function isMobileItemCompatibleWithPlayer(item: InventoryItem, player: Player): boolean {
  if (item.type === "consumable") {
    const hpUseful = Boolean(item.effects?.healHp) && player.stats.hp < player.stats.maxHp;
    const manaUseful = Boolean(item.effects?.healMana) && player.stats.mana < player.stats.maxMana;
    return hpUseful || manaUseful;
  }

  if (item.type === "equipment") return Boolean(item.slot);
  return false;
}

export function filterAndSortMobileInventory(
  player: Player,
  filter: MobileInventoryFilter,
  sort: MobileInventorySort
): InventoryItem[] {
  const filtered = (player.inventory ?? []).filter((item) => {
    if (filter === "all") return true;
    if (filter === "equipment") return item.type === "equipment";
    if (filter === "consumable") return item.type === "consumable";
    if (filter === "material") return item.type === "material" || item.type === "relic";
    if (filter === "compatible") return isMobileItemCompatibleWithPlayer(item, player);
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "quantity") return (b.quantity ?? 1) - (a.quantity ?? 1) || a.name.localeCompare(b.name);
    if (sort === "power") return getMobileItemPowerScore(b) - getMobileItemPowerScore(a) || a.name.localeCompare(b.name);

    const typeOrder: Record<string, number> = {
      equipment: 0,
      consumable: 1,
      relic: 2,
      material: 3,
    };
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99) || a.name.localeCompare(b.name);
  });
}

function clonePlayerWithEquipment(player: Player, slot: EquipmentSlot, item: InventoryItem): Player {
  return {
    ...player,
    equipment: {
      ...player.equipment,
      [slot]: {
        ...item,
        slot,
        quantity: 1,
      },
    },
  };
}

export function compareMobileEquipmentForPlayer(
  player: Player,
  item: InventoryItem
): MobileEquipmentComparison | null {
  if (item.type !== "equipment" || !item.slot) return null;

  const currentStats = getDerivedPlayerStats(player);
  const nextStats = getDerivedPlayerStats(clonePlayerWithEquipment(player, item.slot, item));
  const keys: Array<MobileStatComparison["key"]> = ["maxHp", "maxMana", "strength", "magic", "defense", "speed"];
  const labels: Record<MobileStatComparison["key"], string> = {
    maxHp: "PV max",
    maxMana: "Mana max",
    strength: "Force",
    magic: "Magie",
    defense: "Défense",
    speed: "Vitesse",
  };

  const statComparisons = keys.map((key) => ({
    key,
    label: labels[key],
    current: currentStats[key],
    next: nextStats[key],
    delta: nextStats[key] - currentStats[key],
  }));

  const powerDelta = statComparisons.reduce((total, comparison) => {
    const weight = comparison.key === "maxHp" || comparison.key === "maxMana" ? 0.25 : 1;
    return total + comparison.delta * weight;
  }, 0);

  const changed = statComparisons.filter((comparison) => comparison.delta !== 0);
  const summary = changed.length
    ? changed.map((comparison) => `${comparison.label} ${formatSigned(comparison.delta)}`).join(" · ")
    : "Aucun changement direct de statistiques.";

  return {
    item,
    slot: item.slot,
    currentItemName: player.equipment?.[item.slot]?.name ?? null,
    powerDelta,
    statComparisons,
    summary,
  };
}

export function equipMobileInventoryItem(
  state: EtherniaRunSave,
  playerIndex: number,
  itemId: string
): MobileInventoryResult {
  const player = getPlayer(state, playerIndex);
  if (!player) return { state, success: false, message: "Héros introuvable." };

  const item = (player.inventory ?? []).find((candidate) => candidate.id === itemId);
  if (!item) return { state, success: false, message: "Objet introuvable." };
  if (item.type !== "equipment" || !item.slot) {
    return { state, success: false, message: "Cet objet ne peut pas être équipé." };
  }

  const nextPlayer = equipInventoryItem(player, itemId);
  return {
    state: updatePlayerAtIndex(state, playerIndex, nextPlayer),
    success: true,
    message: `${player.name} équipe ${item.name}.`,
  };
}

export function unequipMobileInventorySlot(
  state: EtherniaRunSave,
  playerIndex: number,
  slot: EquipmentSlot
): MobileInventoryResult {
  const player = getPlayer(state, playerIndex);
  if (!player) return { state, success: false, message: "Héros introuvable." };

  const item = player.equipment?.[slot];
  if (!item) return { state, success: false, message: "Aucun objet équipé dans cet emplacement." };

  const nextPlayer = unequipInventorySlot(player, slot);
  return {
    state: updatePlayerAtIndex(state, playerIndex, nextPlayer),
    success: true,
    message: `${player.name} retire ${item.name}.`,
  };
}

export function useMobileInventoryItem(
  state: EtherniaRunSave,
  playerIndex: number,
  itemId: string
): MobileInventoryResult {
  const player = getPlayer(state, playerIndex);
  if (!player) return { state, success: false, message: "Héros introuvable." };

  const item = (player.inventory ?? []).find((candidate) => candidate.id === itemId);
  if (!item) return { state, success: false, message: "Objet introuvable." };
  if (item.type !== "consumable") {
    return { state, success: false, message: "Cet objet ne peut pas être utilisé maintenant." };
  }

  const beforeHp = player.stats.hp;
  const beforeMana = player.stats.mana;
  const nextPlayer = consumeItem(player, itemId);
  const hpGain = Math.max(0, nextPlayer.stats.hp - beforeHp);
  const manaGain = Math.max(0, nextPlayer.stats.mana - beforeMana);
  const gains = [hpGain ? `+${hpGain} PV` : null, manaGain ? `+${manaGain} mana` : null].filter(Boolean).join(" · ");

  return {
    state: updatePlayerAtIndex(state, playerIndex, nextPlayer),
    success: true,
    message: `${player.name} utilise ${item.name}${gains ? ` (${gains})` : ""}.`,
  };
}
