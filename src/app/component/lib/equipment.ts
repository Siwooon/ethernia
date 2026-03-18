import { EquipmentSlot, InventoryItem, Player, Stats } from "@/app/component/types/game";

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

function removeOneInventoryItem(inventory: InventoryItem[], itemId: string): InventoryItem[] {
  return inventory
    .map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
    )
    .filter((item) => item.quantity > 0);
}

export function equipItem(player: Player, item: InventoryItem): Player {
  if (item.type !== "equipment" || !item.slot) return player;

  const currentEquipped = player.equipment[item.slot];

  let nextInventory = removeOneInventoryItem(player.inventory, item.id);

  if (currentEquipped) {
    nextInventory = stackOrInsertItem(nextInventory, {
      ...currentEquipped,
      quantity: 1,
    });
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

  const nextInventory = stackOrInsertItem(player.inventory, {
    ...equippedItem,
    quantity: 1,
  });

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

export function getEffectiveStats(player: Player): Stats {
  const bonus = getEquipmentBonuses(player);

  const effectiveMaxHp = player.stats.maxHp + bonus.maxHp;
  const effectiveMaxMana = player.stats.maxMana + bonus.maxMana;

  return {
    ...player.stats,
    strength: player.stats.strength + bonus.strength,
    magic: player.stats.magic + bonus.magic,
    defense: player.stats.defense + bonus.defense,
    maxHp: effectiveMaxHp,
    hp: Math.min(player.stats.hp, effectiveMaxHp),
    maxMana: effectiveMaxMana,
    mana: Math.min(player.stats.mana, effectiveMaxMana),
  };
}