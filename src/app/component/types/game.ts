export type ClassType = "Archer" | "Guerrier" | "Mage" | "Voleur" | "Invocateur";
export type NodeType = "start" | "boss" | "normal" | "step";
export type EventType ="none" | "battle" | "boss" | "rest" | "random" | "treasure" | "merchant_blacksmith" | "merchant_alchemist" | "merchant_mystic" | "scripted_shrine";
export type LocationTheme = "forest" | "ruins" | "swamp" | "crypt" | "mountain" | "village" | "cathedral" | "cavern" | "ashlands";
export type ItemType = "consumable" | "equipment" | "material" | "relic";
export type EnemyArchetype = "brute" | "assassin" | "mage" | "tank" | "leech";

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
  slot?: EquipmentSlot;
  buyPrice?: number;
  sellPrice?: number;

  effects?: {
    healHp?: number;
    healMana?: number;
    strength?: number;
    magic?: number;
    defense?: number;
    maxHp?: number;
    maxMana?: number;
  };
}

export interface Stats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  strength: number;
  magic: number;
  defense: number;
}
export type EquipmentSlot = "weapon" | "armor" | "relic";

export interface EquipmentItem extends InventoryItem {
  slot: EquipmentSlot;
}

export interface PlayerEquipment {
  weapon: EquipmentItem | null;
  armor: EquipmentItem | null;
  relic: EquipmentItem | null;
}

export interface Player {
  id: number;
  name: string;
  classType: ClassType;
  stats: Stats;
  currentNode: number;
  image: string;
  portrait: string;
  isDead: boolean;

  level: number;
  xp: number;
  xpToNextLevel: number;
  
  gold: number;
  equipment: PlayerEquipment;
  inventory: InventoryItem[];
}


export interface Enemy {
  name: string;
  hp: number;
  maxHp: number;
  strength: number;
  magic: number;
  defense: number;
  image: string;

  archetype: EnemyArchetype;
  passive?: string;
  specialAttack?: string;
  attacks: EnemyAttack[];
}

export interface PlayerSkill {
  id: string;
  name: string;
  icon: string;
  manaCost: number;
  minLevel: number;
  description: string;
  scaling: "strength" | "magic" | "hybrid";
  multiplier: number;
  ignoreDefense?: boolean;
  guaranteedCrit?: boolean;
}

export interface EnemyAttack {
  id: string;
  name: string;
  description: string;
  kind: "physical" | "magical" | "hybrid";
  powerMultiplier: number;
  accuracy?: number;
  critChance?: number;
  manaBurn?: number;
  selfHealPercent?: number;
}

export interface MapNode {
  id: number;
  x: number;
  y: number;
  lane: 0 | 1 | 2;
  depth: number;
  label?: string;
  type: NodeType;
  eventType: EventType;
  locationTheme: LocationTheme;
  neighbors: number[];
}

export interface ClassData {
  image: string;
  portrait: string;
  stats: Stats;
}

export interface ClassAbility {
  label: string;
  icon: string;
  manaCost: number;
  description: string;
}