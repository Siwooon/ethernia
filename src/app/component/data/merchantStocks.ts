import { BASE_ITEMS, EQUIPMENT_ITEMS } from "@/app/component/data/items";
import { InventoryItem } from "@/app/component/types/game";

export type MerchantType =
  | "merchant_blacksmith"
  | "merchant_alchemist"
  | "merchant_mystic";

export function getMerchantStock(type: MerchantType): InventoryItem[] {
  switch (type) {
    case "merchant_blacksmith":
      return [
        EQUIPMENT_ITEMS.iron_sword(),
        EQUIPMENT_ITEMS.leather_armor(),
        BASE_ITEMS.iron_shard(),
      ];

    case "merchant_alchemist":
      return [
        BASE_ITEMS.potion_small(),
        BASE_ITEMS.potion_small(),
        BASE_ITEMS.ether_small(),
        BASE_ITEMS.ether_small(),
      ];

    case "merchant_mystic":
      return [
        EQUIPMENT_ITEMS.mystic_staff(),
        EQUIPMENT_ITEMS.guardian_relic(),
        BASE_ITEMS.relic_guard(),
      ];

    default:
      return [];
  }
}