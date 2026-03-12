export type FloorBiome =
  | "forest"
  | "ruins"
  | "crypt";

export interface FloorConfig {
  floor: number;
  biome: FloorBiome;
  corruptionRate: number;
  bossName: string;
}

export const FLOORS: FloorConfig[] = [
  {
    floor: 1,
    biome: "forest",
    corruptionRate: 2,
    bossName: "Chef bandit",
  },
  {
    floor: 2,
    biome: "ruins",
    corruptionRate: 1.6,
    bossName: "Golem ancien",
  },
  {
    floor: 3,
    biome: "crypt",
    corruptionRate: 1.3,
    bossName: "Liche",
  },
];