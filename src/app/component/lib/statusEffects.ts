import { StatusEffect } from "@/app/component/types/game";

const FRAILTY_DEFENSE_REDUCTION_PER_STACK = 0.3;
const WEAKNESS_POWER_REDUCTION_PER_STACK = 0.2;
const VULNERABILITY_DAMAGE_TAKEN_PER_STACK = 0.2;
const SILENCE_MAGIC_REDUCTION_PER_STACK = 0.35;

export function getShieldValue(statuses: StatusEffect[]) {
  return statuses
    .filter((s) => s.type === "shield")
    .reduce((sum, s) => sum + s.value, 0);
}

export function consumeMarked(
  statuses: StatusEffect[]
): {
  updatedStatuses: StatusEffect[];
  consumed: boolean;
} {
  let consumed = false;

  const updatedStatuses = statuses
    .map((status) => {
      if (!consumed && status.type === "marked") {
        consumed = true;
        return {
          ...status,
          duration: 0,
        };
      }

      return status;
    })
    .filter((status) => status.duration > 0);

  return {
    updatedStatuses,
    consumed,
  };
}

export function setShieldValue(
  statuses: StatusEffect[],
  newShieldValue: number
): StatusEffect[] {
  const filtered = statuses.filter((s) => s.type !== "shield");

  if (newShieldValue <= 0) {
    return filtered;
  }

  return [
    ...filtered,
    {
      type: "shield",
      value: newShieldValue,
      duration: 999,
      source: "shield_pool",
    },
  ];
}

export function consumeShield(
  statuses: StatusEffect[],
  damage: number
): {
  remainingDamage: number;
  updatedStatuses: StatusEffect[];
  absorbed: number;
} {
  const shield = getShieldValue(statuses);

  if (shield <= 0) {
    return {
      remainingDamage: damage,
      updatedStatuses: statuses,
      absorbed: 0,
    };
  }

  const absorbed = Math.min(shield, damage);
  const remainingShield = shield - absorbed;
  const remainingDamage = damage - absorbed;

  return {
    remainingDamage,
    updatedStatuses: setShieldValue(statuses, remainingShield),
    absorbed,
  };
}

export function getStatusStacks(
  statuses: StatusEffect[],
  type: StatusEffect["type"]
) {
  return statuses
    .filter((status) => status.type === type)
    .reduce((sum, status) => sum + status.value, 0);
}

export function getDebuffMultiplier(
  statuses: StatusEffect[],
  type: StatusEffect["type"]
) {
  const stacks = getStatusStacks(statuses, type);

  switch (type) {
    case "frailty":
      return Math.max(0.05, 1 - stacks * FRAILTY_DEFENSE_REDUCTION_PER_STACK);

    case "weakness":
      return Math.max(0.1, 1 - stacks * WEAKNESS_POWER_REDUCTION_PER_STACK);

    case "vulnerability":
      return 1 + stacks * VULNERABILITY_DAMAGE_TAKEN_PER_STACK;

    case "silence":
      return Math.max(0, 1 - stacks * SILENCE_MAGIC_REDUCTION_PER_STACK);

    default:
      return 1;
  }
}

export function addStatus(
  statuses: StatusEffect[],
  newStatus: StatusEffect
): StatusEffect[] {
  const existing = statuses.find((s) => s.type === newStatus.type);

  if (!existing) {
    return [...statuses, newStatus];
  }
  

  return statuses.map((s) => {
    if (s.type !== newStatus.type) return s;

    if (s.type === "shield") {
      return {
        ...s,
        value: s.value + newStatus.value,
        duration: Math.max(s.duration, newStatus.duration),
      };
    }

    if (s.type === "marked") {
      return {
        ...s,
        value: 1,
        duration: Math.max(s.duration, newStatus.duration),
      };
    }

    return {
      ...s,
      value: s.value + newStatus.value,
      duration: Math.max(s.duration, newStatus.duration),
    };
  });
}

export function tickStatuses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses
    .map((status) => {
      if (status.type === "shield") return status;

      return {
        ...status,
        duration: status.duration - 1,
      };
    })
    .filter((status) => status.type === "shield" || status.duration > 0);
}

export function getStatusValue(
  statuses: StatusEffect[],
  type: StatusEffect["type"]
) {
  return getStatusStacks(statuses, type);
}

export function hasStatus(
  statuses: StatusEffect[],
  type: StatusEffect["type"]
) {
  return statuses.some((s) => s.type === type);
}

export function applyStatusModifiersToStats<
  T extends {
    strength?: number;
    magic?: number;
    defense?: number;
    statuses: StatusEffect[];
  }
>(target: T): T {
  const next = { ...target };

  const weaknessMultiplier = getDebuffMultiplier(target.statuses, "weakness");
  const frailtyMultiplier = getDebuffMultiplier(target.statuses, "frailty");
  const silenceMultiplier = getDebuffMultiplier(target.statuses, "silence");

  if (typeof next.strength === "number") {
    next.strength = Math.max(1, Math.floor(next.strength * weaknessMultiplier));
  }

  if (typeof next.magic === "number") {
    const weakenedMagic = Math.floor(next.magic * weaknessMultiplier);
    next.magic = Math.max(0, Math.floor(weakenedMagic * silenceMultiplier));
  }

  if (typeof next.defense === "number") {
    next.defense = Math.max(0, Math.floor(next.defense * frailtyMultiplier));
  }

  return next;
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