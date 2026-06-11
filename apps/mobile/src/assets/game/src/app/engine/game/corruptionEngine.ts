export type CorruptionChargeResult = {
  nextCharge: number;
  levelUps: number;
  nextLevel: number;
};

export function applyCorruptionChargeToState(params: {
  currentCharge: number;
  currentLevel: number;
  amount: number;
  chargeMax: number;
}): CorruptionChargeResult {
  const total = params.currentCharge + params.amount;
  const levelUps = Math.floor(total / params.chargeMax);
  const nextCharge = total % params.chargeMax;

  return {
    nextCharge,
    levelUps,
    nextLevel: params.currentLevel + levelUps,
  };
}
