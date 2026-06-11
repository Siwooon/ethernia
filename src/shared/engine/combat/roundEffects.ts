import { applyTurnStatusEffectsToStats } from "@/shared/lib/statusEffects";
import { CombatEnemyState, CombatPlayerState } from "./combatTypes";

export type EndOfRoundResult = {
  allies: CombatPlayerState[];
  enemies: CombatEnemyState[];
  logs: string[];
};

export function applyEndOfRoundEffects(
  currentAllies: CombatPlayerState[],
  currentEnemies: CombatEnemyState[],
): EndOfRoundResult {
  const logs: string[] = [];

  const allies = currentAllies.map((ally) => {
    if (ally.isDead) {
      return { ...ally, defending: false };
    }

    const turnResult = applyTurnStatusEffectsToStats({
      hp: ally.stats.hp,
      maxHp: ally.stats.maxHp,
      statuses: ally.statuses,
    });

    turnResult.logs.forEach((log) => {
      logs.push(`🧙 ${ally.player.name} — ${log}`);
    });

    return {
      ...ally,
      stats: {
        ...ally.stats,
        hp: turnResult.hp,
      },
      statuses: turnResult.statuses,
      defending: turnResult.hp <= 0 ? false : ally.defending,
      isDead: turnResult.hp <= 0,
    };
  });

  const enemies = currentEnemies.map((enemyState) => {
    if (enemyState.isDead) return enemyState;

    const turnResult = applyTurnStatusEffectsToStats({
      hp: enemyState.stats.hp,
      maxHp: enemyState.stats.maxHp,
      statuses: enemyState.statuses,
    });

    turnResult.logs.forEach((log) => {
      logs.push(`👹 ${enemyState.enemy.name} — ${log}`);
    });

    return {
      ...enemyState,
      stats: {
        ...enemyState.stats,
        hp: turnResult.hp,
      },
      enemy: {
        ...enemyState.enemy,
        hp: turnResult.hp,
        statuses: turnResult.statuses,
      },
      statuses: turnResult.statuses,
      isDead: turnResult.hp <= 0,
    };
  });

  return { allies, enemies, logs };
}

export function applyStartOfTurnEffects(
  currentAllies: CombatPlayerState[],
  currentEnemies: CombatEnemyState[],
  activeTurn: { kind: "player" | "enemy"; entityId: number | string } | undefined,
): EndOfRoundResult {
  const logs: string[] = [];

  if (!activeTurn) {
    return { allies: currentAllies, enemies: currentEnemies, logs };
  }

  if (activeTurn.kind === "player") {
    const allies = currentAllies.map((ally) => {
      if (ally.playerId !== activeTurn.entityId) return ally;
      if (ally.isDead) return { ...ally, defending: false };

      const turnResult = applyTurnStatusEffectsToStats({
        hp: ally.stats.hp,
        maxHp: ally.stats.maxHp,
        statuses: ally.statuses,
      });

      turnResult.logs.forEach((log) => {
        logs.push(`🧙 ${ally.player.name} — ${log}`);
      });

      return {
        ...ally,
        stats: {
          ...ally.stats,
          hp: turnResult.hp,
        },
        statuses: turnResult.statuses,
        defending: turnResult.hp <= 0 ? false : ally.defending,
        isDead: turnResult.hp <= 0,
      };
    });

    return { allies, enemies: currentEnemies, logs };
  }

  const enemies = currentEnemies.map((enemyState) => {
    if (enemyState.enemyId !== activeTurn.entityId) return enemyState;
    if (enemyState.isDead) return enemyState;

    const turnResult = applyTurnStatusEffectsToStats({
      hp: enemyState.stats.hp,
      maxHp: enemyState.stats.maxHp,
      statuses: enemyState.statuses,
    });

    turnResult.logs.forEach((log) => {
      logs.push(`👹 ${enemyState.enemy.name} — ${log}`);
    });

    return {
      ...enemyState,
      stats: {
        ...enemyState.stats,
        hp: turnResult.hp,
      },
      enemy: {
        ...enemyState.enemy,
        hp: turnResult.hp,
        statuses: turnResult.statuses,
      },
      statuses: turnResult.statuses,
      isDead: turnResult.hp <= 0,
    };
  });

  return { allies: currentAllies, enemies, logs };
}
