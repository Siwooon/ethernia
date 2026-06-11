export type CorruptionChargeResult = {
  nextCharge: number;
  levelUps: number;
  nextLevel: number;
};

export type CorruptionStageId = "murmur" | "taint" | "infestation" | "rupture" | "apocalypse";

export type CorruptionStage = {
  id: CorruptionStageId;
  label: string;
  shortLabel: string;
  description: string;
  pressure: number;
  rewardMultiplier: number;
  spreadSteps: number;
  nodeMutationChance: number;
};

export function applyCorruptionChargeToState(params: {
  currentCharge: number;
  currentLevel: number;
  amount: number;
  chargeMax: number;
}): CorruptionChargeResult {
  const safeMax = Math.max(1, params.chargeMax);
  const total = Math.max(0, params.currentLevel * safeMax + params.currentCharge + params.amount);
  const nextLevel = Math.floor(total / safeMax);
  const nextCharge = total % safeMax;

  return {
    nextCharge,
    levelUps: Math.max(0, nextLevel - params.currentLevel),
    nextLevel,
  };
}

export function getCorruptionPressure(level: number, charge: number) {
  return Math.max(0, level * 100 + charge);
}

export function getCorruptionStage(level: number, charge: number): CorruptionStage {
  const pressure = getCorruptionPressure(level, charge);

  if (pressure >= 400) {
    return {
      id: "apocalypse",
      label: "Apocalypse proche",
      shortLabel: "Apocalypse",
      description: "La carte cède. Les lieux corrompus offrent plus, mais chaque détour devient lourd.",
      pressure,
      rewardMultiplier: 1.55,
      spreadSteps: 2,
      nodeMutationChance: 0.9,
    };
  }

  if (pressure >= 275) {
    return {
      id: "rupture",
      label: "Rupture",
      shortLabel: "Rupture",
      description: "La corruption force les passages et transforme les lieux déjà connus.",
      pressure,
      rewardMultiplier: 1.38,
      spreadSteps: 2,
      nodeMutationChance: 0.72,
    };
  }

  if (pressure >= 150) {
    return {
      id: "infestation",
      label: "Infestation",
      shortLabel: "Infestation",
      description: "Les routes restent praticables, mais les lieux corrompus réclament un prix.",
      pressure,
      rewardMultiplier: 1.24,
      spreadSteps: 1,
      nodeMutationChance: 0.52,
    };
  }

  if (pressure >= 60) {
    return {
      id: "taint",
      label: "Souillure",
      shortLabel: "Souillure",
      description: "Quelques signes changent. Le risque augmente, les gains aussi.",
      pressure,
      rewardMultiplier: 1.12,
      spreadSteps: 1,
      nodeMutationChance: 0.32,
    };
  }

  return {
    id: "murmur",
    label: "Murmure",
    shortLabel: "Murmure",
    description: "La menace est basse. Les premiers signes restent discrets.",
    pressure,
    rewardMultiplier: 1,
    spreadSteps: 1,
    nodeMutationChance: 0.14,
  };
}
