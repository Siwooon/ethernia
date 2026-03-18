import { equipItem, unequipItem } from "@/app/component/lib/equipment";
import { InventoryItem, Player } from "@/app/component/types/game";
import { generateId } from "@/app/component/lib/id";

function stackOrInsertItem(inventory: InventoryItem[], item: InventoryItem): InventoryItem[] {
  const existingIndex = inventory.findIndex(
    (invItem) =>
      invItem.name === item.name &&
      invItem.type === item.type &&
      invItem.slot === item.slot
  );

  if (existingIndex === -1) {
    return [...inventory, item];
  }

  const updatedInventory = [...inventory];
  updatedInventory[existingIndex] = {
    ...updatedInventory[existingIndex],
    quantity: updatedInventory[existingIndex].quantity + item.quantity,
  };

  return updatedInventory;
}

export function addItemToInventory(player: Player, item: InventoryItem): Player {
  return {
    ...player,
    inventory: stackOrInsertItem(player.inventory, item),
  };
}

export function removeOneItemFromInventory(player: Player, itemId: string): Player {
  const updatedInventory = player.inventory
    .map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
    )
    .filter((item) => item.quantity > 0);

  return {
    ...player,
    inventory: updatedInventory,
  };
}

export function consumeItem(player: Player, itemId: string): Player {
  const item = player.inventory.find((invItem) => invItem.id === itemId);
  if (!item || item.type !== "consumable") return player;

  const hpGain = item.effects?.healHp || 0;
  const manaGain = item.effects?.healMana || 0;

  const updatedPlayer: Player = {
    ...player,
    stats: {
      ...player.stats,
      hp: Math.min(player.stats.maxHp, player.stats.hp + hpGain),
      mana: Math.min(player.stats.maxMana, player.stats.mana + manaGain),
    },
  };

  return removeOneItemFromInventory(updatedPlayer, itemId);
}

export function equipInventoryItem(player: Player, itemId: string): Player {
  const item = player.inventory.find((invItem) => invItem.id === itemId);
  if (!item || item.type !== "equipment" || !item.slot) return player;

  return equipItem(player, item);
}

export function unequipInventorySlot(player: Player, slot: "weapon" | "armor" | "relic"): Player {
  return unequipItem(player, slot);
}

export function buyItem(player: Player, item: InventoryItem): Player {
  const price = item.buyPrice || 0;
  if (player.gold < price) return player;

  return addItemToInventory(
    {
      ...player,
      gold: player.gold - price,
    },
    {
      ...item,
      id: generateId(),
      quantity: 1,
    }
  );
}

export function sellItem(player: Player, itemId: string): Player {
  const item = player.inventory.find((invItem) => invItem.id === itemId);
  if (!item) return player;

  const sellValue = item.sellPrice || 0;

  const updatedPlayer = removeOneItemFromInventory(player, itemId);

  return {
    ...updatedPlayer,
    gold: updatedPlayer.gold + sellValue,
  };
}