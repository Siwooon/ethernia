import { FLOORS, FloorBiome } from "@/shared/data/floors";
import { generateGridMap } from "@/shared/lib/generateGridMap";
import { createNewRunMapState } from "@/shared/engine/game/gameState";
import { GameRandom, mathRandom, randomPick } from "@/shared/platform/random";
import { NewRunMapState } from "@/shared/engine/game/gameTypes";

export type PreparedFloorState = NewRunMapState & {
  currentFloor: number;
};

export type NextFloorTransition =
  | {
      kind: "victory";
    }
  | {
      kind: "next_floor";
      floorState: PreparedFloorState;
    };

export function resolveFloorBiome(floor: number, rng: GameRandom = mathRandom): FloorBiome {
  const floorData = FLOORS.find((f) => f.floor === floor);
  const biomes = floorData?.biomePool ?? ["forest"];

  return randomPick(rng, biomes) as FloorBiome;
}

export function prepareFloorState(floor: number, rng: GameRandom = mathRandom): PreparedFloorState {
  const biome = resolveFloorBiome(floor, rng);
  const generated = generateGridMap({ biome, rng });
  const mapState = createNewRunMapState({ biome, generated });

  return {
    ...mapState,
    currentFloor: floor,
  };
}

export function prepareNextFloorTransition(currentFloor: number, rng: GameRandom = mathRandom): NextFloorTransition {
  const nextFloor = currentFloor + 1;

  if (nextFloor > FLOORS.length) {
    return { kind: "victory" };
  }

  return {
    kind: "next_floor",
    floorState: prepareFloorState(nextFloor, rng),
  };
}
