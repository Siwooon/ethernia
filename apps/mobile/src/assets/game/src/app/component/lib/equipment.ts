import { EquipmentSlot, InventoryItem, Player } from "@/app/component/types/game";
import {
  addItemToInventoryList,
  cloneInventoryItem,
  removeOneItemFromInventoryList,
} from "@/app/component/lib/inventoryHelpers";

export function equipItem(player: Player, item: InventoryItem): Player {
  if (item.type !== "equipment" || !item.slot) return player;

  const currentEquipped = player.equipment[item.slot];
  let nextInventory = removeOneItemFromInventoryList(player.inventory, item.id);

  if (currentEquipped) {
    nextInventory = addItemToInventoryList(
      nextInventory,
      cloneInventoryItem(currentEquipped, { quantity: 1 })
    );
  }

  return {
    ...player,
    inventory: nextInventory,
    equipment: {
      ...player.equipment,
      [item.slot]: {
        ...item,
        quantity: 1,
      },
    },
  };
}

export function unequipItem(player: Player, slot: EquipmentSlot): Player {
  const equippedItem = player.equipment[slot];
  if (!equippedItem) return player;

  const nextInventory = addItemToInventoryList(
    player.inventory,
    cloneInventoryItem(equippedItem, { quantity: 1 })
  );

  return {
    ...player,
    inventory: nextInventory,
    equipment: {
      ...player.equipment,
      [slot]: null,
    },
  };
}

export function getEquipmentBonuses(player: Player) {
  const equippedItems = [
    player.equipment.weapon,
    player.equipment.armor,
    player.equipment.relic,
  ].filter(Boolean);

  return equippedItems.reduce(
    (acc, item) => {
      if (!item) return acc;

      if (item.effects) {
        acc.strength += item.effects.strength || 0;
        acc.magic += item.effects.magic || 0;
        acc.defense += item.effects.defense || 0;
        acc.maxHp += item.effects.maxHp || 0;
        acc.maxMana += item.effects.maxMana || 0;
      }

      if (item.curseEffects) {
        acc.strength += item.curseEffects.strength || 0;
        acc.magic += item.curseEffects.magic || 0;
        acc.defense += item.curseEffects.defense || 0;
        acc.maxHp += item.curseEffects.maxHp || 0;
        acc.maxMana += item.curseEffects.maxMana || 0;
      }

      return acc;
    },
    {
      strength: 0,
      magic: 0,
      defense: 0,
      maxHp: 0,
      maxMana: 0,
    }
  );
}