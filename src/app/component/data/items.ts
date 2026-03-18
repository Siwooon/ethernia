import { EliteRewardCategory, InventoryItem } from "@/app/component/types/game";
import { generateId } from "@/app/component/lib/id";

export const BASE_ITEMS = {
  potion_small: (): InventoryItem => ({
    id: generateId(),
    name: "Petite potion",
    description: "Rend 25 PV.",
    type: "consumable",
    quantity: 1,
    buyPrice: 18,
    sellPrice: 9,
    effects: { healHp: 25 },
  }),

  ether_small: (): InventoryItem => ({
    id: generateId(),
    name: "Petit éther",
    description: "Rend 20 Mana.",
    type: "consumable",
    quantity: 1,
    buyPrice: 20,
    sellPrice: 10,
    effects: { healMana: 20 },
  }),

  iron_shard: (): InventoryItem => ({
    id: generateId(),
    name: "Éclat de fer",
    description: "Matériau utilisable chez certains marchands.",
    type: "material",
    quantity: 1,
    buyPrice: 10,
    sellPrice: 5,
  }),

  relic_guard: (): InventoryItem => ({
    id: generateId(),
    name: "Relique du gardien",
    description: "Confère une protection ancienne.",
    type: "relic",
    quantity: 1,
    buyPrice: 40,
    sellPrice: 20,
    effects: { defense: 1 },
  }),
};

export const EQUIPMENT_ITEMS = {
  iron_sword: (): InventoryItem => ({
    id: generateId(),
    name: "Épée de fer",
    description: "Force +2.",
    type: "equipment",
    quantity: 1,
    slot: "weapon",
    buyPrice: 45,
    sellPrice: 22,
    effects: { strength: 2 },
  }),

  mystic_staff: (): InventoryItem => ({
    id: generateId(),
    name: "Bâton mystique",
    description: "Magie +2.",
    type: "equipment",
    quantity: 1,
    slot: "weapon",
    buyPrice: 48,
    sellPrice: 24,
    effects: { magic: 2 },
  }),

  leather_armor: (): InventoryItem => ({
    id: generateId(),
    name: "Armure de cuir",
    description: "Défense +2 Vie max +5.",
    type: "equipment",
    quantity: 1,
    slot: "armor",
    buyPrice: 52,
    sellPrice: 26,
    effects: { defense: 2, maxHp: 5 },
  }),

  guardian_relic: (): InventoryItem => ({
    id: generateId(),
    name: "Relique du gardien",
    description: "Défense +1 Mana max +5.",
    type: "equipment",
    quantity: 1,
    slot: "relic",
    buyPrice: 60,
    sellPrice: 30,
    effects: { defense: 1, maxMana: 5 },
  }),
};

export const CORRUPTED_EQUIPMENT_ITEMS = {
  cursed_blade: (): InventoryItem => ({
    id: generateId(),
    name: "Lame du sacrifice",
    description: "Force +5, PV max -15.",
    type: "equipment",
    quantity: 1,
    slot: "weapon",
    corrupted: true,
    buyPrice: 95,
    sellPrice: 40,
    effects: { strength: 5 },
    curseEffects: { maxHp: -15 },
  }),

  void_staff: (): InventoryItem => ({
    id: generateId(),
    name: "Bâton du vide",
    description: "Magie +6 Mana max -10.",
    type: "equipment",
    quantity: 1,
    slot: "weapon",
    corrupted: true,
    buyPrice: 100,
    sellPrice: 45,
    effects: { magic: 6 },
    curseEffects: { maxMana: -10 },
  }),

  rotten_plate: (): InventoryItem => ({
    id: generateId(),
    name: "Armure rongée",
    description: "Défense +4 Force -2.",
    type: "equipment",
    quantity: 1,
    slot: "armor",
    corrupted: true,
    buyPrice: 90,
    sellPrice: 38,
    effects: { defense: 4 },
    curseEffects: { strength: -2 },
  }),

  abyss_relic: (): InventoryItem => ({
    id: generateId(),
    name: "Relique du gouffre",
    description: "Mana max +20 PV max -10.",
    type: "equipment",
    quantity: 1,
    slot: "relic",
    corrupted: true,
    buyPrice: 110,
    sellPrice: 50,
    effects: { maxMana: 20 },
    curseEffects: { maxHp: -10 },
  }),
};

export function getEliteRewardByCategory(category: EliteRewardCategory): InventoryItem | null {
  switch (category) {
    case "weapon": {
      const pool = [
        EQUIPMENT_ITEMS.iron_sword(),
        EQUIPMENT_ITEMS.mystic_staff(),
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    case "armor": {
      const pool = [
        EQUIPMENT_ITEMS.leather_armor(),
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    case "relic": {
      const pool = [
        EQUIPMENT_ITEMS.guardian_relic(),
        BASE_ITEMS.relic_guard(),
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    case "consumable": {
      const pool = [
        BASE_ITEMS.potion_small(),
        BASE_ITEMS.ether_small(),
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    case "material": {
      return BASE_ITEMS.iron_shard();
    }

    case "gold":
    default:
      return null;
  }
}