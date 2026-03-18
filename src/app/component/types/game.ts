export type ClassType = "Archer" | "Guerrier" | "Mage" | "Voleur" | "Invocateur";
export type NodeType = "start" | "boss" | "normal" | "step";
export type EventType = "none" | "battle" | "rest" | "treasure" | "random" | "merchant_blacksmith" | "merchant_alchemist" | "merchant_mystic" | "scripted_shrine" | "statuette" | "boss" | "elite";
export type LocationTheme = "forest" | "ruins" | "swamp" | "crypt" | "mountain" | "village" | "cathedral" | "cavern" | "ashlands";
export type ItemType = "consumable" | "equipment" | "material" | "relic";
export type EnemyArchetype = "brute" | "assassin" | "mage" | "tank" | "leech";
export type StatusEffectType = "poison" | "burn" | "shield" | "regen";
export type MapEffectType = "wound" | "infection" | "blessing" | "protection" | "corruption_mark";
export type GridNodeKind = "start" | "path" | "statuette" | "boss_prep" | "boss" | "stairs";
export type NodeVisibility = "hidden" | "discovered" | "visited";
export type EliteRewardCategory = "weapon" | "armor" | "relic" | "consumable" | "material" | "gold";
export type EnemySourceTag = "normal" | "elite" | "statue_guardian" | "merchant_blacksmith_corrupted" | "merchant_alchemist_corrupted" | "merchant_mystic_corrupted" | "treasure_mimic" | "random_ambush";
export type EventChoiceAction = "take_statue" | "purify_statue" | "absorb_statue" | "rest_sleep" | "rest_focus" | "rest_cleanse" | "treasure_open_safe" | "treasure_force" | "treasure_leave" | "shrine_bless" | "shrine_offer" | "shrine_leave" | "random_help" | "random_search" | "random_ignore";
export type EffectTrigger = "battle_start" | "turn_start" | "turn_end" | "before_attack" | "after_attack" | "on_hit" | "on_damaged" | "on_kill";
export type TraitCategory = "passive" | "blessing" | "curse";

export type TraitTrigger ="stats" | "battle_start" | "turn_start" | "turn_end" | "before_attack" | "after_attack" | "on_hit" | "on_damaged" | "on_kill";

export type TraitModifiers = {
  maxHp?: number;
  maxMana?: number;
  strength?: number;
  magic?: number;
  defense?: number;
};

export interface TraitEffect {
  id: string;
  name: string;
  description: string;
  category: TraitCategory;
  trigger: TraitTrigger;

  value?: number;
  duration?: number;
  stacks?: number;
  chance?: number;

  modifiers?: TraitModifiers;

  statusEffect?: {
    type: StatusEffectType | MapEffectType;
    value: number;
    duration: number;
    target: "player" | "enemy";
  };
}

export interface CombatEffectContext {
  player: Player;
  enemy: Enemy;
  source: "player" | "enemy";
  target: "player" | "enemy";
  trait: TraitEffect;
}

export interface EventChoice {
  id: EventChoiceAction;
  label: string;
  description: string;
  style?: "danger" | "sacrifice" | "power";
}

export interface MapEffect {
  type: MapEffectType;
  value: number;
  duration: number;
  source?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
  slot?: EquipmentSlot;
  buyPrice?: number;
  sellPrice?: number;
  corrupted?: boolean;
  curseEffects?: {
    maxHp?: number;
    maxMana?: number;
    strength?: number;
    magic?: number;
    defense?: number;
  };

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

export type PassiveEffect = { // to be removed
  id: string;
  name: string;
  description: string;
  trigger: EffectTrigger;

  apply: (ctx: CombatEffectContext) => void;
};

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
  statuses: StatusEffect[];
  mapEffects: MapEffect[];

  level: number;
  xp: number;
  xpToNextLevel: number;

  traits: TraitEffect[];
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
  statuses: StatusEffect[];

  archetype: EnemyArchetype;
  passive?: string;
  specialAttack?: string;
  attacks: EnemyAttack[];
  passives?: PassiveEffect[]; // To be removed
  traits?: TraitEffect[];

  rewardCategory?: EliteRewardCategory;
  sourceTag?: EnemySourceTag;
  grantsStatueOnWin?: boolean;
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

export interface StatusEffect {
  type: StatusEffectType;
  value: number;
  duration: number;
  source?: string;
}

export interface EnemyAttack {
  id?: string;
  description?: string;
  name: string;
  kind: "physical" | "magical" | "hybrid";
  powerMultiplier: number;
  critChance?: number;
  manaBurn?: number;
  selfHealPercent?: number;
  statusEffect?: {
    type: StatusEffectType;
    value: number;
    duration: number;
    target: "player" | "enemy";
  };
}

export interface MapNode {
  id: number;

  x: number;
  y: number;

  lane: 0 | 1 | 2;
  depth: number;

  row: number;
  col: number;
  kind: GridNodeKind;

  label?: string;
  type: NodeType;
  eventType: EventType;
  locationTheme: LocationTheme;
  neighbors: number[];
  isConsumed?: boolean;

  visibility: NodeVisibility;
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

