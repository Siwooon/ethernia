export type FloorBiome = "forest" | "ruins" | "swamp" | "crypt" | "mountain" | "cathedral" | "cavern" | "ashlands";

export type FloorDefinition = {
  floor: number;
  label: string;
  biomePool: FloorBiome[];
  corruptionRate: number;
  scripted?: boolean;
};

export const FLOORS: FloorDefinition[] = [
  {
    floor: 1,
    label: "Les terres sauvages",
    biomePool: ["forest", "ruins", "cavern"],
    corruptionRate: 2,
  },
  {
    floor: 2,
    label: "Les terres perdues",
    biomePool: ["swamp", "mountain", "cavern"],
    corruptionRate: 2,
  },
  {
    floor: 3,
    label: "Les vestiges d’Eternia",
    biomePool: ["cathedral", "ruins", "ashlands"],
    corruptionRate: 1,
  },
  {
    floor: 4,
    label: "Le cœur d’Eternia",
    biomePool: ["cathedral"],
    corruptionRate: 1,
    scripted: true,
  },
];