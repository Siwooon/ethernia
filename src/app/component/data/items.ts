import { InventoryItem } from "@/app/component/types/game";

export const BASE_ITEMS = {
  potion_small: (): InventoryItem => ({
    id: crypto.randomUUID(),
    name: "Petite potion",
    description: "Rend 25 PV.",
    type: "consumable",
    quantity: 1,
    buyPrice: 18,
    sellPrice: 9,
    effects: { healHp: 25 },
  }),

  ether_small: (): InventoryItem => ({
    id: crypto.randomUUID(),
    name: "Petit éther",
    description: "Rend 20 Mana.",
    type: "consumable",
    quantity: 1,
    buyPrice: 20,
    sellPrice: 10,
    effects: { healMana: 20 },
  }),

  iron_shard: (): InventoryItem => ({
    id: crypto.randomUUID(),
    name: "Éclat de fer",
    description: "Matériau utilisable chez certains marchands.",
    type: "material",
    quantity: 1,
    buyPrice: 10,
    sellPrice: 5,
  }),

  relic_guard: (): InventoryItem => ({
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
    name: "Épée de fer",
    description: "Arme simple. Force +2.",
    type: "equipment",
    quantity: 1,
    slot: "weapon",
    buyPrice: 45,
    sellPrice: 22,
    effects: { strength: 2 },
  }),

  mystic_staff: (): InventoryItem => ({
    id: crypto.randomUUID(),
    name: "Bâton mystique",
    description: "Catalyseur ancien. Magie +2.",
    type: "equipment",
    quantity: 1,
    slot: "weapon",
    buyPrice: 48,
    sellPrice: 24,
    effects: { magic: 2 },
  }),

  leather_armor: (): InventoryItem => ({
    id: crypto.randomUUID(),
    name: "Armure de cuir",
    description: "Protection légère. Défense +2, Vie max +5.",
    type: "equipment",
    quantity: 1,
    slot: "armor",
    buyPrice: 52,
    sellPrice: 26,
    effects: { defense: 2, maxHp: 5 },
  }),

  guardian_relic: (): InventoryItem => ({
    id: crypto.randomUUID(),
    name: "Relique du gardien",
    description: "Relique protectrice. Défense +1, Mana max +5.",
    type: "equipment",
    quantity: 1,
    slot: "relic",
    buyPrice: 60,
    sellPrice: 30,
    effects: { defense: 1, maxMana: 5 },
  }),
};