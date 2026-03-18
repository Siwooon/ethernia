import { StatusEffect } from "@/app/component/types/game";

export function addStatus(
  statuses: StatusEffect[],
  newStatus: StatusEffect
): StatusEffect[] {
  const existing = statuses.find((s) => s.type === newStatus.type);

  if (!existing) {
    return [...statuses, newStatus];
  }

  return statuses.map((s) =>
    s.type === newStatus.type
      ? {
          ...s,
          value: Math.max(s.value, newStatus.value),
          duration: Math.max(s.duration, newStatus.duration),
        }
      : s
  );
}

export function tickStatuses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses
    .map((status) => ({
      ...status,
      duration: status.duration - 1,
    }))
    .filter((status) => status.duration > 0);
}

export function getStatusValue(statuses: StatusEffect[], type: StatusEffect["type"]) {
  return statuses
    .filter((s) => s.type === type)
    .reduce((sum, s) => sum + s.value, 0);
}

export function hasStatus(statuses: StatusEffect[], type: StatusEffect["type"]) {
  return statuses.some((s) => s.type === type);
}

export function applyTurnStatusEffectsToStats<
  T extends { hp: number; maxHp: number; statuses: StatusEffect[] }
>(target: T) {
  let nextHp = target.hp;
  const logs: string[] = [];

  for (const status of target.statuses) {
    if (status.type === "poison") {
      nextHp = Math.max(0, nextHp - status.value);
      logs.push(`☠️ Poison : -${status.value} PV`);
    }

    if (status.type === "burn") {
      nextHp = Math.max(0, nextHp - status.value);
      logs.push(`🔥 Brûlure : -${status.value} PV`);
    }

    if (status.type === "regen") {
      const healed = Math.min(status.value, target.maxHp - nextHp);
      nextHp = Math.min(target.maxHp, nextHp + status.value);
      if (healed > 0) {
        logs.push(`✨ Régénération : +${healed} PV`);
      }
    }
  }

  return {
    hp: nextHp,
    logs,
    statuses: tickStatuses(target.statuses),
  };
}