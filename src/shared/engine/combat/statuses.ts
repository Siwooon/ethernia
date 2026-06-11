import { StatusEffect } from "@/shared/types/game";
import {
  addStatus,
  consumeMarked,
  consumeShield,
  getShieldValue,
} from "@/shared/lib/statusEffects";

export type ShieldResolution = {
  statuses: StatusEffect[];
  absorbed: number;
  remainingDamage: number;
  shieldAfter: number;
};

export type MarkResolution = {
  statuses: StatusEffect[];
  consumed: boolean;
  damageMultiplier: number;
};

export function addCombatStatus(
  statuses: StatusEffect[],
  status: StatusEffect,
): StatusEffect[] {
  return addStatus(statuses, status);
}

export function resolveMarkedDamage(statuses: StatusEffect[]): MarkResolution {
  const result = consumeMarked(statuses);
  return {
    statuses: result.updatedStatuses,
    consumed: result.consumed,
    damageMultiplier: result.consumed
      ? 1.75 + Math.min(3, result.consumedValue) * 0.25
      : 1,
  };
}

export function resolveShieldDamage(
  statuses: StatusEffect[],
  incomingDamage: number,
): ShieldResolution {
  const result = consumeShield(statuses, incomingDamage);
  const shieldAfter = getShieldValue(result.updatedStatuses);

  return {
    statuses: result.updatedStatuses,
    absorbed: result.absorbed,
    remainingDamage: result.remainingDamage,
    shieldAfter,
  };
}

export function getCombatShieldValue(statuses: StatusEffect[]): number {
  return getShieldValue(statuses);
}
