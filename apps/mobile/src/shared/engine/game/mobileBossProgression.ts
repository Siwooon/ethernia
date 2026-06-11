import { createScopedRandom } from "@/shared/platform/random";
import { EtherniaRunSave } from "./gameTypes";
import { prepareNextFloorTransition } from "./floorEngine";
import { reviveDeadPlayersAtNewFloor } from "./playerLifecycle";
import { Player } from "@/shared/types/game";
import { getBossDefeatLore } from "@/shared/data/loreFragments";

export type MobileBossProgressionResult =
  | {
      kind: "next_floor";
      state: EtherniaRunSave;
      title: string;
      text: string;
    }
  | {
      kind: "run_victory";
      state: EtherniaRunSave;
      title: string;
      text: string;
    };


function stabilizePartyForNextFloor(players: Player[]): Player[] {
  return reviveDeadPlayersAtNewFloor(players).map((player) => {
    const restoredHp = Math.max(1, Math.floor(player.stats.maxHp * 0.35));
    const restoredMana = Math.max(0, Math.floor(player.stats.maxMana * 0.35));

    return {
      ...player,
      isDead: false,
      statuses: [],
      mapEffects: (player.mapEffects ?? []).filter((effect) =>
        effect.type === "blessing" || effect.type === "protection"
      ),
      stats: {
        ...player.stats,
        hp: Math.min(player.stats.maxHp, Math.max(player.stats.hp, restoredHp)),
        mana: Math.min(player.stats.maxMana, Math.max(player.stats.mana, restoredMana)),
      },
    };
  });
}

export function advanceMobileRunAfterBossVictory(run: EtherniaRunSave): MobileBossProgressionResult {
  const nextFloorNumber = run.currentFloor + 1;
  const transition = prepareNextFloorTransition(
    run.currentFloor,
    createScopedRandom(run.runSeed ?? "mobile-run", `floor:${nextFloorNumber}`),
  );

  if (transition.kind === "victory") {
    return {
      kind: "run_victory",
      state: run,
      title: "Second Voile accompli",
      text: `Le Cœur-Monde tombe au silence. ${getBossDefeatLore(run.currentFloor)} Les failles cessent d'être des sorties, au moins pour cette run.`,
    };
  }

  const { floorState } = transition;
  const revivedPlayers = stabilizePartyForNextFloor(run.players).map((player) => ({
    ...player,
    currentNode: floorState.startNodeId,
  }));

  return {
    kind: "next_floor",
    state: {
      ...run,
      players: revivedPlayers,
      currentPlayerIndex: 0,
      currentFloor: floorState.currentFloor,
      currentFloorBiome: floorState.currentFloorBiome,
      nodes: floorState.nodes,
      mapWidth: floorState.mapWidth,
      mapHeight: floorState.mapHeight,
      previousNode: null,
      corruptionLevel: floorState.corruptionLevel,
      corruptionCharge: floorState.corruptionCharge,
      corruptedNodeIds: floorState.corruptedNodeIds,
      floorCorruptionTurn: floorState.floorCorruptionTurn,
      currentFloorStatues: floorState.currentFloorStatues,
    },
    title: "Étage suivant",
    text: `Étage ${floorState.currentFloor}. ${getBossDefeatLore(run.currentFloor)} Le groupe reprend souffle : blessures stabilisées, mana partiellement restaurée.`,
  };
}
