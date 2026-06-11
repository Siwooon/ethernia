import { FLOORS, FloorBiome } from "@/app/component/data/floors";
import { generateGridMap } from "@/app/component/lib/generateGridMap";
import { createNewRunMapState } from "@/app/engine/game/gameState";
import { NewRunMapState } from "@/app/engine/game/gameTypes";

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

export function resolveFloorBiome(floor: number): FloorBiome {
  const floorData = FLOORS.find((f) => f.floor === floor);
  const biomes = floorData?.biomePool ?? ["forest"];

  return biomes[Math.floor(Math.random() * biomes.length)] as FloorBiome;
}

export function prepareFloorState(floor: number): PreparedFloorState {
  const biome = resolveFloorBiome(floor);
  const generated = generateGridMap({ biome });
  const mapState = createNewRunMapState({ biome, generated });

  return {
    ...mapState,
    currentFloor: floor,
  };
}

export function prepareNextFloorTransition(currentFloor: number): NextFloorTransition {
  const nextFloor = currentFloor + 1;

  if (nextFloor > FLOORS.length) {
    return { kind: "victory" };
  }

  return {
    kind: "next_floor",
    floorState: prepareFloorState(nextFloor),
  };
}
