import { applyCombatStartMapEffects } from "@/shared/lib/mapEffects";
import { getDerivedPlayerStats } from "@/shared/lib/playerStats";
import { applyTerrainEffectsOnCombatStart } from "@/shared/lib/terrainEffects";
import { Player, TerrainEffect } from "@/shared/types/game";
import { CombatPlayerState } from "./combatTypes";

export function createInitialCombatAllies(
  players: Player[],
  terrainEffects: TerrainEffect[] = [],
): CombatPlayerState[] {
  return players.map((player) => {
    const baseStats = getDerivedPlayerStats(player);

    return {
      playerId: player.id,
      player,
      stats: baseStats,
      statuses: [
        ...(player.statuses || []),
        ...applyCombatStartMapEffects(player),
        ...applyTerrainEffectsOnCombatStart(terrainEffects),
      ],
      defending: false,
      isDead: player.isDead || baseStats.hp <= 0,
    };
  });
}

export function createInitialDisplayedPlayerHp(
  players: Player[],
): Record<number, number> {
  return Object.fromEntries(
    players.map((player) => {
      const stats = getDerivedPlayerStats(player);
      return [player.id, stats.hp];
    }),
  );
}
