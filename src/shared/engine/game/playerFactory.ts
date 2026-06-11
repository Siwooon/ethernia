import { CLASSES } from "@/shared/data/classes";
import { BASE_ITEMS, getStartingEquipmentForClass } from "@/shared/data/items";
import { PLAYER_PASSIVES } from "@/shared/lib/passives";
import { ClassType, EquipmentItem, InventoryItem, PassiveEffect, Player, PlayerEquipment } from "@/shared/types/game";

export function getStartingPassives(classType: ClassType): PassiveEffect[] {
  switch (classType) {
    case "Guerrier":
      return [PLAYER_PASSIVES.iron_skin()];
    case "Mage":
      return [PLAYER_PASSIVES.mana_surge()];
    case "Archer":
      return [PLAYER_PASSIVES.survivor_instinct()];
    case "Voleur":
      return [PLAYER_PASSIVES.toxic_blade()];
    case "Demoniste":
      return [PLAYER_PASSIVES.soul_feast()];
    case "Clerc":
      return [PLAYER_PASSIVES.divine_reserve()];
    case "Sentinelle":
      return [PLAYER_PASSIVES.mana_surge()];
    default:
      return [];
  }
}

export function createPlayer(params: {
  id: number;
  name: string;
  classType: ClassType;
  currentNode?: number;
}): Player {
  const classData = CLASSES[params.classType];
  const startingItems = getStartingEquipmentForClass(params.classType);
  const startingEquipment: PlayerEquipment = {
    weapon: null,
    offhand: null,
    armor: null,
    amulet: null,
    ring: null,
    relic: null,
  };
  const startingInventory: InventoryItem[] = [BASE_ITEMS.potion_small()];

  for (const item of startingItems) {
    if (item.type === "equipment" && item.slot) {
      startingEquipment[item.slot] = { ...item, slot: item.slot, quantity: 1 } as EquipmentItem;
    } else {
      startingInventory.push(item);
    }
  }

  return {
    id: params.id,
    name: params.name.trim(),
    classType: params.classType,
    stats: { ...classData.stats },
    currentNode: params.currentNode ?? 0,
    image: classData.image,
    portrait: classData.portrait,
    isDead: false,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    statuses: [],
    mapEffects: [],
    passives: getStartingPassives(params.classType),
    traits: [],
    gold: 50,
    inventory: startingInventory,
    equipment: startingEquipment,
  };
}
