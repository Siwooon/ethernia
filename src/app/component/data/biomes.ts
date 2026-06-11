import { FloorBiome } from "@/app/component/data/floors";

export type BiomeVisuals = {
  mapBgClass: string;
  mapOverlayImage: string;
  startImage: string;
  bossImage: string;
  battleImage: string;
  restImage: string;
  randomImage: string;
  treasureImage: string;
  merchantImage: string;
  shrineImage: string;
};

const makeBiomeVisual = (
  biome: FloorBiome,
  fallbackBgClass: string
): BiomeVisuals => ({
  mapBgClass: fallbackBgClass,
  mapOverlayImage: `/backgrounds/${biome}.jpg`,
  startImage: `/biomes/${biome}/start.jpg`,
  bossImage: `/biomes/${biome}/boss.jpg`,
  battleImage: `/biomes/${biome}/battle.jpg`,
  restImage: `/biomes/${biome}/rest.jpg`,
  randomImage: `/biomes/${biome}/random.jpg`,
  treasureImage: `/biomes/${biome}/treasure.jpg`,
  merchantImage: `/biomes/${biome}/merchant.jpg`,
  shrineImage: `/biomes/${biome}/shrine.jpg`,
});

export const BIOME_VISUALS: Record<FloorBiome, BiomeVisuals> = {
  forest: makeBiomeVisual("forest", "bg-green-900"),
  ruins: makeBiomeVisual("ruins", "bg-stone-800"),
  swamp: makeBiomeVisual("swamp", "bg-lime-900"),
  crypt: makeBiomeVisual("crypt", "bg-purple-900"),
  mountain: makeBiomeVisual("mountain", "bg-zinc-700"),
  cathedral: makeBiomeVisual("cathedral", "bg-indigo-900"),
  cavern: makeBiomeVisual("cavern", "bg-slate-900"),
  ashlands: makeBiomeVisual("ashlands", "bg-red-900"),
};