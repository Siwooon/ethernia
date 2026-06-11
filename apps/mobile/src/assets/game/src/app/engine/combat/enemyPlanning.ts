import { Enemy, EnemyAttack } from "@/app/component/types/game";
import {
  initializeBossEnemy,
  prepareBossTurn,
} from "@/app/component/lib/bossMechanics";
import { applyStatusModifiersToStats } from "@/app/component/lib/statusEffects";
import {
  CombatEnemyState,
  CombatPlayerState,
  PlannedEnemyAction,
} from "./combatTypes";

export function makeEnemyId(index: number) {
  return `enemy-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export function enemyToCombatState(
  enemy: Enemy,
  index: number,
): CombatEnemyState {
  const safeEnemy = initializeBossEnemy({
    ...enemy,
    statuses: enemy.statuses ?? [],
  });

  return {
    enemyId: makeEnemyId(index),
    enemy: safeEnemy,
    stats: {
      hp: safeEnemy.hp,
      maxHp: safeEnemy.maxHp,
      mana: 0,
      maxMana: 0,
      strength: safeEnemy.strength,
      magic: safeEnemy.magic,
      defense: safeEnemy.defense,
      speed: safeEnemy.speed,
    },
    statuses: safeEnemy.statuses ?? [],
    isDead: safeEnemy.hp <= 0,
  };
}

export function syncEnemyState(enemyState: CombatEnemyState): Enemy {
  return {
    ...enemyState.enemy,
    hp: enemyState.stats.hp,
    maxHp: enemyState.stats.maxHp,
    strength: enemyState.stats.strength,
    magic: enemyState.stats.magic,
    defense: enemyState.stats.defense,
    speed: enemyState.stats.speed,
    statuses: enemyState.statuses,
  };
}

type ChooseEnemyTargetOptions = {
  preferredTargetPlayerId?: number | null;
  forcedTargetPlayerId?: number | null;
};

export function chooseEnemyTargets(
  attack: EnemyAttack,
  livingAllies: CombatPlayerState[],
  options: ChooseEnemyTargetOptions = {},
) {
  if (attack.targetScope === "all_players") return livingAllies;

  const preferredTargetPlayerId = options.preferredTargetPlayerId ?? null;
  const forcedTargetPlayerId = options.forcedTargetPlayerId ?? null;

  const forcedTarget =
    preferredTargetPlayerId !== null
      ? livingAllies.find(
          (ally) => ally.playerId === preferredTargetPlayerId && !ally.isDead,
        )
      : forcedTargetPlayerId !== null
        ? livingAllies.find(
            (ally) => ally.playerId === forcedTargetPlayerId && !ally.isDead,
          )
        : null;

  if (forcedTarget) return [forcedTarget];

  const lowestHpTarget = [...livingAllies].sort((a, b) => {
    const aRatio = a.stats.maxHp > 0 ? a.stats.hp / a.stats.maxHp : 1;
    const bRatio = b.stats.maxHp > 0 ? b.stats.hp / b.stats.maxHp : 1;
    return aRatio - bRatio;
  })[0];

  return lowestHpTarget ? [lowestHpTarget] : [];
}

type BuildPlannedEnemyActionOptions = {
  forcedTargetPlayerId?: number | null;
};

export function buildPlannedEnemyAction(
  enemyState: CombatEnemyState,
  livingAllies: CombatPlayerState[],
  options: BuildPlannedEnemyActionOptions = {},
): PlannedEnemyAction | null {
  if (!livingAllies.length || enemyState.isDead || enemyState.stats.hp <= 0) {
    return null;
  }

  const preparedEnemyBase: Enemy = {
    ...applyStatusModifiersToStats({
      ...syncEnemyState(enemyState),
      statuses: enemyState.statuses,
    }),
    statuses: enemyState.statuses,
  };

  const bossPrep = prepareBossTurn(
    preparedEnemyBase,
    enemyState.statuses ?? [],
    livingAllies.map((ally) => ({
      playerId: ally.playerId,
      isDead: ally.isDead,
    })),
  );

  const attack = bossPrep.attack ?? enemyState.enemy.attacks[0];
  const plannedTargets = chooseEnemyTargets(attack, livingAllies, {
    preferredTargetPlayerId: bossPrep.preferredTargetPlayerId,
    forcedTargetPlayerId: options.forcedTargetPlayerId ?? null,
  });

  const targetIds =
    attack.targetScope === "all_players"
      ? livingAllies.map((ally) => ally.playerId)
      : plannedTargets.map((ally) => ally.playerId);

  return {
    enemyId: enemyState.enemyId,
    enemy: bossPrep.enemy,
    enemyStatuses: [...bossPrep.enemyStatuses],
    attack,
    logs: bossPrep.logs,
    targetIds,
    preferredTargetPlayerId: bossPrep.preferredTargetPlayerId,
  };
}
