import { Player } from "@/app/component/types/game";
import { CombatResultPlayer } from "./combatTypes";

export type CombatResultKind = "victory" | "defeat" | "flee";

export type CombatPlayerRecap = {
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  isDead: boolean;
};

export type CombatXpState = {
  playerId: number;
  playerName: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  gainedXp: number;
};

export function getCombatParticipants(
  roster: Player[],
  participantIndexes: number[],
): Player[] {
  return participantIndexes
    .map((idx) => roster[idx])
    .filter((player): player is Player => Boolean(player));
}

export function buildCombatRecapPlayers(params: {
  roster: Player[];
  participantIndexes: number[];
  results: CombatResultPlayer[];
}): CombatPlayerRecap[] {
  return getCombatParticipants(params.roster, params.participantIndexes).map(
    (player) => {
      const result = params.results.find(
        (entry) => entry.playerId === player.id,
      );
      const stats = result?.stats ?? player.stats;

      return {
        name: player.name,
        hp: stats.hp,
        maxHp: stats.maxHp,
        mana: stats.mana,
        maxMana: stats.maxMana,
        isDead: result?.isDead ?? player.isDead,
      };
    },
  );
}

export function buildCombatXpStates(params: {
  roster: Player[];
  participantIndexes: number[];
  xpGained: number;
}): CombatXpState[] {
  return getCombatParticipants(params.roster, params.participantIndexes).map(
    (player) => ({
      playerId: player.id,
      playerName: player.name,
      level: player.level,
      currentXp: player.xp,
      xpToNextLevel: player.xpToNextLevel,
      gainedXp: params.xpGained,
    }),
  );
}
