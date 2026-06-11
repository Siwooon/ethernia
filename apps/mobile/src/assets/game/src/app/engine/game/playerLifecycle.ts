import { Player } from "@/app/component/types/game";

export function reviveDeadPlayersAtNewFloor(roster: Player[]): Player[] {
  return roster.map((player) => {
    if (!player.isDead) return player;

    const revivedHp = Math.max(1, Math.floor(player.stats.maxHp * 0.5));

    return {
      ...player,
      isDead: false,
      stats: {
        ...player.stats,
        hp: revivedHp,
      },
    };
  });
}

export function reviveDeadAllyFromShrine(
  roster: Player[],
  sacrificerIndex: number,
  corrupted: boolean
): { nextPlayers: Player[]; revivedPlayerName: string | null } {
  const deadIndex = roster.findIndex((player, idx) => idx !== sacrificerIndex && player.isDead);

  if (deadIndex === -1) {
    return { nextPlayers: roster, revivedPlayerName: null };
  }

  const hpMaxCost = corrupted ? 20 : 12;

  const nextPlayers = roster.map((player, idx) => {
    if (idx === sacrificerIndex) {
      const nextMaxHp = Math.max(20, player.stats.maxHp - hpMaxCost);

      return {
        ...player,
        stats: {
          ...player.stats,
          maxHp: nextMaxHp,
          hp: Math.min(player.stats.hp, nextMaxHp),
        },
      };
    }

    if (idx === deadIndex) {
      const revivedHp = Math.max(1, Math.floor(player.stats.maxHp * 0.5));

      return {
        ...player,
        isDead: false,
        stats: {
          ...player.stats,
          hp: revivedHp,
        },
      };
    }

    return player;
  });

  return {
    nextPlayers,
    revivedPlayerName: roster[deadIndex]?.name ?? null,
  };
}

export function mergePlayerProgressSnapshot(current: Player, snapshot: Player): Player {
  return {
    ...current,
    stats: snapshot.stats,
    level: snapshot.level,
    xp: snapshot.xp,
    xpToNextLevel: snapshot.xpToNextLevel,
    isDead: snapshot.isDead,
    inventory: snapshot.inventory,
    equipment: snapshot.equipment,
    gold: snapshot.gold,
    statuses: snapshot.statuses,
    mapEffects: snapshot.mapEffects,
    traits: snapshot.traits ?? [],
    currentNode: current.currentNode,
  };
}
