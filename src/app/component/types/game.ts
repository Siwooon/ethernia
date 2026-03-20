export type ClassType = "Archer" | "Guerrier" | "Mage" | "Voleur" | "Demoniste" | "Clerc";
export type NodeType = "start" | "boss" | "normal" | "step";
export type EventType = "none" | "battle" | "rest" | "treasure" | "random" | "merchant_blacksmith" | "merchant_alchemist" | "merchant_mystic" | "scripted_shrine" | "statuette" | "boss" | "elite";
export type LocationTheme = "forest" | "ruins" | "swamp" | "crypt" | "mountain" | "village" | "cathedral" | "cavern" | "ashlands";
export type ItemType = "consumable" | "equipment" | "material" | "relic";
export type EnemyArchetype = "brute" | "assassin" | "mage" | "tank" | "leech";

export type StatusEffectType = "poison" | "burn" | "shield" | "regen" | "weakness" | "frailty" | "silence" | "vulnerability";
export type MapEffectType = "wound" | "infection" | "blessing" | "protection" | "corruption_mark" | "fatigue" | "hex";

export type GridNodeKind = "start" | "path" | "statuette" | "boss_prep" | "boss" | "stairs";
export type NodeVisibility = "hidden" | "discovered" | "visited";
export type EliteRewardCategory = "weapon" | "armor" | "relic" | "consumable" | "material" | "gold";
export type EnemySourceTag = "normal" | "elite" | "statue_guardian" | "merchant_blacksmith_corrupted" | "merchant_alchemist_corrupted" | "merchant_mystic_corrupted" | "treasure_mimic" | "random_ambush";
export type EventChoiceAction = "take_statue" | "purify_statue" | "absorb_statue" | "rest_sleep" | "rest_focus" | "rest_cleanse" | "treasure_open_safe" | "treasure_force" | "treasure_leave" | "shrine_bless" | "shrine_offer" | "shrine_revive" | "shrine_leave" | "random_help" | "random_search" | "random_ignore" | "engage_battle" | "wait_for_party";

  export type EffectTrigger = "battle_start" | "turn_start" | "turn_end" | "before_attack" | "after_attack" | "on_hit" | "on_damaged" | "on_kill";
export type TraitCategory = "passive" | "blessing" | "curse";



export type TraitTrigger ="stats" | "battle_start" | "turn_start" | "turn_end" | "before_attack" | "after_attack" | "on_hit" | "on_damaged" | "on_kill";

export type TraitModifiers = {
  maxHp?: number;
  maxMana?: number;
  strength?: number;
  magic?: number;
  defense?: number;
  speed?: number;
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

export type SkillCondition =
  | {
      type: "target_status";
      status: StatusEffectType;
      bonusMultiplier?: number;
      bonusFlat?: number;
    }
  | {
      type: "self_hp_below";
      threshold: number; // ex: 0.5 = 50%
      bonusMultiplier?: number;
      bonusFlat?: number;
    }
  | {
      type: "self_mana_above";
      threshold: number; // ex: 0.7 = 70%
      bonusMultiplier?: number;
      bonusFlat?: number;
    }
  | {
      type: "target_hp_below";
      threshold: number;
      bonusMultiplier?: number;
      bonusFlat?: number;
    }
  | {
      type: "self_has_status";
      status: StatusEffectType;
      bonusMultiplier?: number;
      bonusFlat?: number;
    };

export type SkillExtraEffect =
  | {
      type: "apply_status";
      status: StatusEffectType;
      value: number;
      duration: number;
      target: "player" | "enemy";
      chance?: number;
    }
  | {
      type: "heal_self";
      percentDamageDealt?: number;
      flat?: number;
    };

export type TerrainEffectType =
  | "toxic_fog"
  | "sacred_ground"
  | "storm_field"
  | "mana_spring"
  | "ashen_heat";

export interface TerrainEffect {
  type: TerrainEffectType;
  value: number;
  duration?: number;
  source?: string;
  scope?: "node" | "floor";
}

export type PassiveTrigger =
  | "combat_start"
  | "combat_end"
  | "turn_start"
  | "turn_end"
  | "before_attack"
  | "after_attack"
  | "before_take_damage"
  | "after_take_damage"
  | "map_enter_node"
  | "map_end_turn";

export interface PassiveEffect {
  id: string;
  name: string;
  description: string;
  trigger: PassiveTrigger;
  owner: "player" | "enemy";
  oncePerCombat?: boolean;
  chance?: number;
  value?: number;
}

export interface CombatEffectContext {
  player: Player;
  enemy: Enemy;
  source: "player" | "enemy";
  target: "player" | "enemy";
  trait?: TraitEffect;
}

export interface EventChoice {
  id: EventChoiceAction;
  label: string;
  description: string;
  style?: "danger" | "sacrifice" | "power" ;
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
  stackable?: boolean;
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

export interface Stats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  strength: number;
  magic: number;
  defense: number;
  speed: number;
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
  statuses?: StatusEffect[];
  mapEffects: MapEffect[];

  level: number;
  xp: number;
  xpToNextLevel: number;
  
  passives: PassiveEffect[];
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
  speed: number;
  image: string;
  statuses?: StatusEffect[];

  archetype: EnemyArchetype;
  specialAttack?: string;
  attacks: EnemyAttack[];
  passive?: string; // tu peux le garder juste pour l'affichage si tu veux
  passives: PassiveEffect[];
  traits?: TraitEffect[];

  rewardCategory?: EliteRewardCategory;
  sourceTag?: EnemySourceTag;
  grantsStatueOnWin?: boolean;
}

export type PlayerSkill = {
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
  conditions?: SkillCondition[];
  extraEffects?: SkillExtraEffect[];
};

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

  terrainEffects?: TerrainEffect[];
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

  role: string;
  baseSkillName: string;
  signatureSkillName: string;
  shortDescription: string;
  synergyTags: string[];
}

export interface ClassAbility {
  label: string;
  icon: string;
  manaCost: number;
  description: string;
}

