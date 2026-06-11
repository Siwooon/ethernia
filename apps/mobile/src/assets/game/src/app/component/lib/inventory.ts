import { equipItem, unequipItem } from "@/app/component/lib/equipment";
import { InventoryItem, Player } from "@/app/component/types/game";
import { generateId } from "@/app/component/lib/id";
import {
  addItemToInventoryList,
  cloneInventoryItem,
  removeOneItemFromInventoryList,
} from "@/app/component/lib/inventoryHelpers";

export function addItemToInventory(player: Player, item: InventoryItem): Player {
  return {
    ...player,
    inventory: addItemToInventoryList(player.inventory, item),
  };
}

export function removeOneItemFromInventory(player: Player, itemId: string): Player {
  return {
    ...player,
    inventory: removeOneItemFromInventoryList(player.inventory, itemId),
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

export function unequipInventorySlot(
  player: Player,
  slot: "weapon" | "armor" | "relic"
): Player {
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
    cloneInventoryItem(item, {
      id: generateId(),
      quantity: 1,
    })
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