import { Player } from "@/shared/types/game";

export const CORRUPTED_NODE_HP_DAMAGE = 5;

export function getNextActivePlayerIndex(
  players: Player[],
  currentPlayerIndex: number
): number | null {
  if (players.length === 0) return null;

  let nextIndex = (currentPlayerIndex + 1) % players.length;
  let checked = 0;

  while (checked < players.length) {
    if (!players[nextIndex]?.isDead) {
      return nextIndex;
    }

    nextIndex = (nextIndex + 1) % players.length;
    checked += 1;
  }

  return null;
}

export function applyCorruptedNodeStepDamage(
  player: Player,
  damage = CORRUPTED_NODE_HP_DAMAGE
): Player {
  return {
    ...player,
    stats: {
      ...player.stats,
      hp: Math.max(1, player.stats.hp - damage),
    },
  };
}
