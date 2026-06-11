import { BASE_ITEMS, EQUIPMENT_ITEMS } from "@/shared/data/items";
import { InventoryItem } from "@/shared/types/game";
import { CORRUPTED_EQUIPMENT_ITEMS } from "@/shared/data/items";

export type MerchantType = "merchant_blacksmith" | "merchant_alchemist" | "merchant_mystic" | "merchant_blacksmith_corrupted" | "merchant_alchemist_corrupted" | "merchant_mystic_corrupted";

export function getMerchantStock(type: MerchantType): InventoryItem[] {
  switch (type) {
    case "merchant_blacksmith":
      return [
        EQUIPMENT_ITEMS.iron_sword(),
        EQUIPMENT_ITEMS.wooden_buckler(),
        EQUIPMENT_ITEMS.leather_armor(),
        EQUIPMENT_ITEMS.iron_ring(),
        BASE_ITEMS.iron_shard(),
      ];

    case "merchant_alchemist":
      return [
        BASE_ITEMS.potion_small(),
        BASE_ITEMS.potion_small(),
        BASE_ITEMS.ether_small(),
        BASE_ITEMS.ether_small(),
        BASE_ITEMS.fire_bomb(),
        BASE_ITEMS.venom_vial(),
        BASE_ITEMS.guard_tonic(),
      ];

    case "merchant_mystic":
      return [
        EQUIPMENT_ITEMS.mystic_staff(),
        EQUIPMENT_ITEMS.apprentice_focus(),
        EQUIPMENT_ITEMS.copper_amulet(),
        EQUIPMENT_ITEMS.mana_ring(),
        EQUIPMENT_ITEMS.guardian_relic(),
        BASE_ITEMS.relic_guard(),
      ];

    case "merchant_blacksmith_corrupted":
      return [
        CORRUPTED_EQUIPMENT_ITEMS.cursed_blade(),
        CORRUPTED_EQUIPMENT_ITEMS.rotten_plate(),
      ];

    case "merchant_alchemist_corrupted":
      return [
        BASE_ITEMS.potion_small(),
        BASE_ITEMS.ether_small(),
        BASE_ITEMS.fire_bomb(),
        BASE_ITEMS.venom_vial(),
        CORRUPTED_EQUIPMENT_ITEMS.abyss_relic(),
      ];

    case "merchant_mystic_corrupted":
      return [
        CORRUPTED_EQUIPMENT_ITEMS.void_staff(),
        CORRUPTED_EQUIPMENT_ITEMS.abyss_relic(),
      ];

    default:
      return [];
  }
}