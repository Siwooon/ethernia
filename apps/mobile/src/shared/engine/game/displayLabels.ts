import type { FloorBiome } from "@/shared/data/floors";
import type { ClassType } from "@/shared/types/game";

const CLASS_DISPLAY_LABELS: Record<ClassType, string> = {
  Guerrier: "Guerrier",
  Mage: "Mage",
  Archer: "Archer",
  Voleur: "Voleur",
  Demoniste: "Démoniste",
  Clerc: "Clerc",
  Sentinelle: "Sentinelle",
};

const BIOME_DISPLAY_LABELS: Record<FloorBiome, string> = {
  forest: "Forêt",
  ruins: "Ruines",
  swamp: "Marais",
  crypt: "Crypte",
  mountain: "Montagne",
  cathedral: "Cathédrale",
  cavern: "Caverne",
  ashlands: "Terres cendrées",
};

export function getClassDisplayName(classType: ClassType) {
  return CLASS_DISPLAY_LABELS[classType] ?? classType;
}

export function getBiomeDisplayName(biome: FloorBiome) {
  return BIOME_DISPLAY_LABELS[biome] ?? biome;
}
