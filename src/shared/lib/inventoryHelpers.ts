import { InventoryItem } from "@/shared/types/game";

function stableStringify(value: unknown): string {
  if (!value) return "";
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

export function isItemStackable(item: InventoryItem): boolean {
  if (typeof item.stackable === "boolean") return item.stackable;

  return item.type === "consumable" || item.type === "material";
}

export function getItemStackKey(item: InventoryItem): string {
  if (!isItemStackable(item)) {
    return item.id;
  }

  return [
    item.type,
    item.name,
    item.slot ?? "",
    item.corrupted ? "1" : "0",
    stableStringify(item.effects),
    stableStringify(item.curseEffects),
  ].join("::");
}

export function cloneInventoryItem(
  item: InventoryItem,
  overrides: Partial<InventoryItem> = {}
): InventoryItem {
  return {
    ...item,
    ...overrides,
  };
}

export function addItemToInventoryList(
  inventory: InventoryItem[],
  item: InventoryItem
): InventoryItem[] {
  const normalizedItem: InventoryItem = {
    ...item,
    quantity: Math.max(1, item.quantity ?? 1),
  };

  const itemKey = getItemStackKey(normalizedItem);
  const existingIndex = inventory.findIndex(
    (invItem) => getItemStackKey(invItem) === itemKey
  );

  if (existingIndex === -1) {
    return [...inventory, normalizedItem];
  }

  const updatedInventory = [...inventory];
  updatedInventory[existingIndex] = {
    ...updatedInventory[existingIndex],
    quantity:
      updatedInventory[existingIndex].quantity + normalizedItem.quantity,
  };

  return updatedInventory;
}

export function removeOneItemFromInventoryList(
  inventory: InventoryItem[],
  itemId: string
): InventoryItem[] {
  return inventory
    .map((item) =>
      item.id === itemId
        ? { ...item, quantity: item.quantity - 1 }
        : item
    )
    .filter((item) => item.quantity > 0);
}