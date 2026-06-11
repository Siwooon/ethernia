import { CombatEnemyState, CombatPlayerState, TurnEntry } from "./combatTypes";
import { GameRandom, mathRandom } from "@/shared/platform/random";

export function buildTurnOrder(
  currentAllies: CombatPlayerState[],
  currentEnemies: CombatEnemyState[],
  rng: GameRandom = mathRandom,
): TurnEntry[] {
  const allyTurns: TurnEntry[] = currentAllies
    .filter((ally) => !ally.isDead)
    .map((ally) => ({
      id: `player-${ally.playerId}`,
      kind: "player" as const,
      entityId: ally.playerId,
      speed: ally.stats.speed + rng.next() * 0.01,
    }));

  const enemyTurns: TurnEntry[] = currentEnemies
    .filter((enemyState) => !enemyState.isDead && enemyState.stats.hp > 0)
    .map((enemyState) => ({
      id: `enemy-${enemyState.enemyId}`,
      kind: "enemy" as const,
      entityId: enemyState.enemyId,
      speed: enemyState.stats.speed + rng.next() * 0.01,
    }));

  return [...allyTurns, ...enemyTurns].sort((a, b) => b.speed - a.speed);
}
