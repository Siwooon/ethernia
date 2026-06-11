import { CORRUPTED_EQUIPMENT_ITEMS, EQUIPMENT_ITEMS, getEliteRewardByCategory } from "@/shared/data/items";
import { InventoryItem, Player, TraitEffect } from "@/shared/types/game";
import { EtherniaRunSave } from "./gameTypes";
import { applyCorruptionChargeToState } from "./corruptionEngine";
import { applyVeilRelicToRun, getNextVeilRelicCandidate } from "./veilRelics";

export type PostBossChoiceId = "seal" | "trophy" | "echo" | "pact";

export type PostBossChoice = {
  id: PostBossChoiceId;
  label: string;
  shortText: string;
  detail: string;
  tone: "safe" | "reward" | "mystery" | "risk";
};

export const POST_BOSS_CHOICES: PostBossChoice[] = [
  {
    id: "seal",
    label: "Sceller",
    shortText: "Calme la faille.",
    detail: "Corruption réduite. Le groupe commence protégé.",
    tone: "safe",
  },
  {
    id: "trophy",
    label: "Prendre",
    shortText: "Ramasser ce qui reste.",
    detail: "Or d'équipe, relique portée et fragment du Voile.",
    tone: "reward",
  },
  {
    id: "echo",
    label: "Écouter",
    shortText: "Un fragment répond.",
    detail: "Relique du Voile stable pour toute l'équipe.",
    tone: "mystery",
  },
  {
    id: "pact",
    label: "Pacte",
    shortText: "Accepter la trace noire.",
    detail: "Butin corrompu et relique noire. La faille gagne.",
    tone: "risk",
  },
];

function addInventoryItem(player: Player, item: InventoryItem): Player {
  return {
    ...player,
    inventory: [...player.inventory, item],
  };
}

function addGold(player: Player, amount: number): Player {
  return {
    ...player,
    gold: Math.max(0, player.gold + amount),
  };
}

function addTraitOnce(player: Player, trait: TraitEffect): Player {
  const traits = player.traits ?? [];
  if (traits.some((current) => current.id === trait.id)) return player;
  return {
    ...player,
    traits: [...traits, trait],
  };
}

function addMapProtection(player: Player, source: string): Player {
  const remaining = (player.mapEffects ?? []).filter((effect) => effect.source !== source);
  return {
    ...player,
    mapEffects: [
      ...remaining,
      { type: "protection", value: 1, duration: 3, source },
    ],
  };
}

function firstAliveIndex(players: Player[]): number {
  const alive = players.findIndex((player) => !player.isDead && player.stats.hp > 0);
  return alive >= 0 ? alive : 0;
}

function pickStableRelic(floor: number): InventoryItem {
  const pool = [
    getEliteRewardByCategory("relic"),
    EQUIPMENT_ITEMS.cold_seal(),
    EQUIPMENT_ITEMS.veil_shard(),
    EQUIPMENT_ITEMS.cracked_ring(),
  ].filter(Boolean) as InventoryItem[];
  return pool[Math.max(0, floor - 1) % pool.length];
}

function pickCorruptedRelic(floor: number): InventoryItem {
  const pool = [
    CORRUPTED_EQUIPMENT_ITEMS.cursed_blade(),
    CORRUPTED_EQUIPMENT_ITEMS.void_staff(),
    CORRUPTED_EQUIPMENT_ITEMS.rotten_plate(),
    CORRUPTED_EQUIPMENT_ITEMS.abyss_relic(),
    EQUIPMENT_ITEMS.empty_crown(),
  ];
  return pool[Math.max(0, floor - 1) % pool.length];
}

function applyCharge(run: EtherniaRunSave, amount: number): EtherniaRunSave {
  const result = applyCorruptionChargeToState({
    currentCharge: run.corruptionCharge,
    currentLevel: run.corruptionLevel,
    amount,
    chargeMax: 100,
  });

  return {
    ...run,
    corruptionCharge: result.nextCharge,
    corruptionLevel: result.nextLevel,
  };
}

export function applyPostBossChoice(run: EtherniaRunSave, choiceId: PostBossChoiceId): EtherniaRunSave {
  const recipientIndex = firstAliveIndex(run.players);

  if (choiceId === "seal") {
    const cleansedCount = Math.max(1, Math.ceil(run.corruptedNodeIds.length / 3));
    const next = applyCharge(run, -18 - run.currentFloor * 2);
    return {
      ...next,
      corruptedNodeIds: next.corruptedNodeIds.slice(cleansedCount),
      players: next.players.map((player) => addMapProtection(player, `post-boss-seal-${run.currentFloor}`)),
    };
  }

  if (choiceId === "trophy") {
    const gold = 12 + run.currentFloor * 5;
    const item = pickStableRelic(run.currentFloor);
    const withLoot: EtherniaRunSave = {
      ...run,
      players: run.players.map((player, index) => {
        const withGold = addGold(player, gold);
        return index === recipientIndex ? addInventoryItem(withGold, item) : withGold;
      }),
    };
    const relic = getNextVeilRelicCandidate(withLoot, "trophy");
    return relic ? applyVeilRelicToRun(withLoot, relic) : withLoot;
  }

  if (choiceId === "echo") {
    const trait: TraitEffect = {
      id: `echo-after-boss-${run.currentFloor}`,
      name: "Écho",
      description: "Un fragment guide les gestes. Vitesse +1, Mana max +3.",
      category: "blessing",
      trigger: "stats",
      modifiers: { speed: 1, maxMana: 3 },
    };

    const withEcho: EtherniaRunSave = {
      ...run,
      players: run.players.map((player) => addTraitOnce(player, trait)),
    };
    const relic = getNextVeilRelicCandidate(withEcho, "echo");
    return relic ? applyVeilRelicToRun(withEcho, relic) : withEcho;
  }

  const pactTrait: TraitEffect = {
    id: `pact-after-boss-${run.currentFloor}`,
    name: "Trace",
    description: "La faille laisse une force brève. Force +1, Magie +1, Défense -1.",
    category: "curse",
    trigger: "stats",
    modifiers: { strength: 1, magic: 1, defense: -1 },
  };
  const withCharge = applyCharge(run, 24 + run.currentFloor * 3);
  const item = pickCorruptedRelic(run.currentFloor);

  const withPact: EtherniaRunSave = {
    ...withCharge,
    players: withCharge.players.map((player, index) => {
      const withTrait = addTraitOnce(player, pactTrait);
      return index === recipientIndex ? addInventoryItem(withTrait, item) : withTrait;
    }),
  };
  const relic = getNextVeilRelicCandidate(withPact, "pact");
  return relic ? applyVeilRelicToRun(withPact, relic) : withPact;
}
