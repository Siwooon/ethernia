import { BossMechanicType, ClassType, EliteRewardCategory, InventoryItem } from "@/shared/types/game";
import { generateId } from "@/shared/utils/id";

export const BASE_ITEMS = {
  potion_small: (): InventoryItem => ({
    id: generateId(),
    name: "Petite potion",
    description: "Rend 25 PV.",
    type: "consumable",
    quantity: 1,
    stackable: true,
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
    stackable: true,
    buyPrice: 20,
    sellPrice: 10,
    effects: { healMana: 20 },
  }),

  fire_bomb: (): InventoryItem => ({
    id: generateId(),
    name: "Bombe incendiaire",
    description: "Objet de combat. Inflige 18 dégâts et applique Brûlure.",
    type: "consumable",
    quantity: 1,
    stackable: true,
    buyPrice: 34,
    sellPrice: 15,
    effects: { damageEnemy: 18 },
    combatEffects: {
      target: "enemy",
      damageEnemy: 18,
      applyStatus: { type: "burn", value: 4, duration: 2, target: "enemy" },
    },
  }),

  venom_vial: (): InventoryItem => ({
    id: generateId(),
    name: "Fiole de venin",
    description: "Objet de combat. Applique Poison sur une cible.",
    type: "consumable",
    quantity: 1,
    stackable: true,
    buyPrice: 30,
    sellPrice: 14,
    combatEffects: {
      target: "enemy",
      applyStatus: { type: "poison", value: 5, duration: 3, target: "enemy" },
    },
  }),

  guard_tonic: (): InventoryItem => ({
    id: generateId(),
    name: "Tonique de garde",
    description: "Objet de combat. Donne un bouclier temporaire au héros actif.",
    type: "consumable",
    quantity: 1,
    stackable: true,
    buyPrice: 28,
    sellPrice: 12,
    effects: { shield: 16 },
    combatEffects: { target: "self", shield: 16 },
  }),

  iron_shard: (): InventoryItem => ({
    id: generateId(),
    name: "Éclat de fer",
    description: "Matériau utilisable chez certains marchands.",
    type: "material",
    stackable: true,
    quantity: 1,
    buyPrice: 10,
    sellPrice: 5,
  }),

  relic_guard: (): InventoryItem => ({
    id: generateId(),
    name: "Relique du gardien",
    description: "Confère une protection ancienne.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "relic",
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
    stackable: false,
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
    stackable: false,
    slot: "weapon",
    buyPrice: 48,
    sellPrice: 24,
    effects: { magic: 2 },
  }),

  hunter_bow: (): InventoryItem => ({
    id: generateId(),
    name: "Arc de pisteur",
    description: "Force +1 Vitesse +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "weapon",
    buyPrice: 46,
    sellPrice: 22,
    effects: { strength: 1, speed: 1 },
  }),

  shadow_daggers: (): InventoryItem => ({
    id: generateId(),
    name: "Dagues d’ombre",
    description: "Force +1 Vitesse +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "weapon",
    buyPrice: 46,
    sellPrice: 22,
    effects: { strength: 1, speed: 1 },
  }),

  ritual_grimoire: (): InventoryItem => ({
    id: generateId(),
    name: "Grimoire de pacte",
    description: "Magie +2 Mana max +4.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "weapon",
    buyPrice: 50,
    sellPrice: 24,
    effects: { magic: 2, maxMana: 4 },
  }),

  votive_mace: (): InventoryItem => ({
    id: generateId(),
    name: "Masse votive",
    description: "Magie +1 Défense +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "weapon",
    buyPrice: 46,
    sellPrice: 22,
    effects: { magic: 1, defense: 1 },
  }),

  anchor_blade: (): InventoryItem => ({
    id: generateId(),
    name: "Lame d’Ancre",
    description: "Force +1 Magie +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "weapon",
    buyPrice: 50,
    sellPrice: 24,
    effects: { strength: 1, magic: 1 },
  }),

  leather_armor: (): InventoryItem => ({
    id: generateId(),
    name: "Armure de cuir",
    description: "Défense +2 Vie max +5.",
    type: "equipment",
    quantity: 1,
    stackable: false,
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
    stackable: false,
    slot: "relic",
    buyPrice: 60,
    sellPrice: 30,
    effects: { defense: 1, maxMana: 5 },
  }),

  wooden_buckler: (): InventoryItem => ({
    id: generateId(),
    name: "Rondache de voyage",
    description: "Défense +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "offhand",
    buyPrice: 36,
    sellPrice: 16,
    effects: { defense: 1 },
  }),

  apprentice_focus: (): InventoryItem => ({
    id: generateId(),
    name: "Focus d’apprenti",
    description: "Magie +1 Mana max +5.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "offhand",
    buyPrice: 38,
    sellPrice: 17,
    effects: { magic: 1, maxMana: 5 },
  }),

  cleric_talisman: (): InventoryItem => ({
    id: generateId(),
    name: "Talisman clair",
    description: "Mana max +6 Défense +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "offhand",
    buyPrice: 40,
    sellPrice: 18,
    effects: { maxMana: 6, defense: 1 },
  }),

  anchor_guard: (): InventoryItem => ({
    id: generateId(),
    name: "Garde d’Ancre",
    description: "Défense +1 Mana max +4.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "offhand",
    buyPrice: 42,
    sellPrice: 19,
    effects: { defense: 1, maxMana: 4 },
  }),

  copper_amulet: (): InventoryItem => ({
    id: generateId(),
    name: "Amulette de cuivre",
    description: "PV max +8.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "amulet",
    buyPrice: 42,
    sellPrice: 19,
    effects: { maxHp: 8 },
  }),

  iron_ring: (): InventoryItem => ({
    id: generateId(),
    name: "Anneau de fer",
    description: "Force +1 Défense +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "ring",
    buyPrice: 44,
    sellPrice: 20,
    effects: { strength: 1, defense: 1 },
  }),

  mana_ring: (): InventoryItem => ({
    id: generateId(),
    name: "Anneau de mana",
    description: "Magie +1 Mana max +5.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "ring",
    buyPrice: 44,
    sellPrice: 20,
    effects: { magic: 1, maxMana: 5 },
  }),

  cracked_ring: (): InventoryItem => ({
    id: generateId(),
    name: "Anneau fendu",
    description: "Vitesse +1. Gagner des dégâts charge l'Élan.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "ring",
    buyPrice: 76,
    sellPrice: 34,
    effects: { speed: 1 },
  }),

  cold_seal: (): InventoryItem => ({
    id: generateId(),
    name: "Sceau froid",
    description: "Défense +1. Défendre protège aussi un allié faible.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "amulet",
    buyPrice: 82,
    sellPrice: 38,
    effects: { defense: 1, maxMana: 4 },
  }),

  veil_shard: (): InventoryItem => ({
    id: generateId(),
    name: "Éclat du Voile",
    description: "Mana max +8. Les compétences coûtent un peu moins.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "relic",
    buyPrice: 88,
    sellPrice: 42,
    effects: { maxMana: 8 },
  }),

  black_ember: (): InventoryItem => ({
    id: generateId(),
    name: "Braise noire",
    description: "Magie +2. La brûlure mord plus fort.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "relic",
    buyPrice: 92,
    sellPrice: 44,
    effects: { magic: 2 },
  }),

  empty_crown: (): InventoryItem => ({
    id: generateId(),
    name: "Couronne vide",
    description: "Force +1 Magie +1. Puissante, mais instable.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "amulet",
    corrupted: true,
    buyPrice: 105,
    sellPrice: 48,
    effects: { strength: 1, magic: 1 },
    curseEffects: { defense: -1 },
  }),
};

export const CORRUPTED_EQUIPMENT_ITEMS = {
  cursed_blade: (): InventoryItem => ({
    id: generateId(),
    name: "Lame du sacrifice",
    description: "Force +5, PV max -15.",
    type: "equipment",
    quantity: 1,
    stackable: false,
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
    stackable: false,
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
    stackable: false,
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
    stackable: false,
    slot: "relic",
    corrupted: true,
    buyPrice: 110,
    sellPrice: 50,
    effects: { maxMana: 20 },
    curseEffects: { maxHp: -10 },
  }),
};


export const BOSS_REWARD_ITEMS = {
  wild_heart: (): InventoryItem => ({
    id: generateId(),
    name: "Cœur",
    description: "Force +2 Vitesse +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "relic",
    buyPrice: 120,
    sellPrice: 55,
    effects: { strength: 2, speed: 1 },
  }),

  oracle_seal: (): InventoryItem => ({
    id: generateId(),
    name: "Sceau",
    description: "Magie +2 Défense +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "amulet",
    buyPrice: 120,
    sellPrice: 55,
    effects: { magic: 2, defense: 1 },
  }),

  black_core: (): InventoryItem => ({
    id: generateId(),
    name: "Noyau",
    description: "PV max +12 Magie +1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "relic",
    buyPrice: 125,
    sellPrice: 58,
    effects: { maxHp: 12, magic: 1 },
  }),

  plague_root: (): InventoryItem => ({
    id: generateId(),
    name: "Racine",
    description: "Défense +1 Mana max +12.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "offhand",
    buyPrice: 118,
    sellPrice: 54,
    effects: { defense: 1, maxMana: 12 },
  }),

  stone_plate: (): InventoryItem => ({
    id: generateId(),
    name: "Plaque",
    description: "Défense +3 Vitesse -1.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "armor",
    buyPrice: 135,
    sellPrice: 62,
    effects: { defense: 3, speed: -1 },
  }),

  echo_ring: (): InventoryItem => ({
    id: generateId(),
    name: "Écho",
    description: "Vitesse +2 Mana max +6.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "ring",
    buyPrice: 118,
    sellPrice: 54,
    effects: { speed: 2, maxMana: 6 },
  }),

  pale_judgment: (): InventoryItem => ({
    id: generateId(),
    name: "Sentence",
    description: "Magie +2 PV max +8.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "weapon",
    buyPrice: 140,
    sellPrice: 66,
    effects: { magic: 2, maxHp: 8 },
  }),

  ember: (): InventoryItem => ({
    id: generateId(),
    name: "Braise",
    description: "Force +1 Magie +2.",
    type: "equipment",
    quantity: 1,
    stackable: false,
    slot: "relic",
    buyPrice: 130,
    sellPrice: 60,
    effects: { strength: 1, magic: 2 },
  }),
};

export function getBossRewardItem(mechanic?: BossMechanicType): InventoryItem {
  switch (mechanic) {
    case "feral_heart":
      return BOSS_REWARD_ITEMS.wild_heart();
    case "tainted_oracle":
      return BOSS_REWARD_ITEMS.oracle_seal();
    case "grave_heart":
      return BOSS_REWARD_ITEMS.black_core();
    case "plague_root":
      return BOSS_REWARD_ITEMS.plague_root();
    case "stone_colossus":
      return BOSS_REWARD_ITEMS.stone_plate();
    case "echo_brood":
      return BOSS_REWARD_ITEMS.echo_ring();
    case "cathedral_judge":
      return BOSS_REWARD_ITEMS.pale_judgment();
    case "ashen_pyre":
      return BOSS_REWARD_ITEMS.ember();
    default:
      return BOSS_REWARD_ITEMS.wild_heart();
  }
}

export function getStartingEquipmentForClass(classType: ClassType): InventoryItem[] {
  switch (classType) {
    case "Guerrier":
      return [EQUIPMENT_ITEMS.iron_sword(), EQUIPMENT_ITEMS.wooden_buckler(), EQUIPMENT_ITEMS.leather_armor()];
    case "Mage":
      return [EQUIPMENT_ITEMS.mystic_staff(), EQUIPMENT_ITEMS.apprentice_focus(), EQUIPMENT_ITEMS.mana_ring()];
    case "Clerc":
      return [EQUIPMENT_ITEMS.votive_mace(), EQUIPMENT_ITEMS.cleric_talisman(), EQUIPMENT_ITEMS.copper_amulet()];
    case "Archer":
      return [EQUIPMENT_ITEMS.hunter_bow(), EQUIPMENT_ITEMS.leather_armor(), EQUIPMENT_ITEMS.copper_amulet()];
    case "Voleur":
      return [EQUIPMENT_ITEMS.shadow_daggers(), EQUIPMENT_ITEMS.cracked_ring(), BASE_ITEMS.venom_vial()];
    case "Demoniste":
      return [EQUIPMENT_ITEMS.ritual_grimoire(), EQUIPMENT_ITEMS.apprentice_focus(), BASE_ITEMS.fire_bomb()];
    case "Sentinelle":
      return [EQUIPMENT_ITEMS.anchor_blade(), EQUIPMENT_ITEMS.anchor_guard(), EQUIPMENT_ITEMS.leather_armor()];
    default:
      return [EQUIPMENT_ITEMS.iron_sword()];
  }
}

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
        EQUIPMENT_ITEMS.copper_amulet(),
        EQUIPMENT_ITEMS.iron_ring(),
        EQUIPMENT_ITEMS.mana_ring(),
        EQUIPMENT_ITEMS.cracked_ring(),
        EQUIPMENT_ITEMS.cold_seal(),
        EQUIPMENT_ITEMS.veil_shard(),
        EQUIPMENT_ITEMS.black_ember(),
        EQUIPMENT_ITEMS.empty_crown(),
        BASE_ITEMS.relic_guard(),
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    case "consumable": {
      const pool = [
        BASE_ITEMS.potion_small(),
        BASE_ITEMS.ether_small(),
        BASE_ITEMS.fire_bomb(),
        BASE_ITEMS.venom_vial(),
        BASE_ITEMS.guard_tonic(),
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