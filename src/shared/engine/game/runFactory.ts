import { EtherniaRunSave } from "./gameTypes";
import type { CoopRunSession } from "./coopParty";
import { prepareFloorState } from "./floorEngine";
import { gameReducer } from "./gameReducer";
import { Player } from "@/shared/types/game";
import { createScopedRandom } from "@/shared/platform/random";

export function createEmptyRunState(runSeed: string): EtherniaRunSave {
  return {
    runSeed,
    players: [],
    currentPlayerIndex: 0,
    currentFloor: 1,
    currentFloorBiome: "forest",
    nodes: [],
    mapWidth: 3600,
    mapHeight: 1800,
    previousNode: null,
    corruptionLevel: 0,
    corruptionCharge: 0,
    corruptedNodeIds: [],
    floorCorruptionTurn: 0,
    currentFloorStatues: 0,
    veilRelics: [],
  };
}

export function createRunFromPlayers(params: {
  players: Player[];
  runSeed: string;
  floor?: number;
  coopSession?: CoopRunSession;
}): EtherniaRunSave {
  const floor = params.floor ?? 1;
  const floorState = prepareFloorState(floor, createScopedRandom(params.runSeed, `floor:${floor}`));

  return gameReducer(
    {
      ...createEmptyRunState(params.runSeed),
      players: params.players,
      coopSession: params.coopSession,
    },
    {
      type: "START_RUN",
      runSeed: params.runSeed,
      floorState,
    }
  );
}
