import { ImageSourcePropType } from "react-native";

import { FloorBiome } from "@/shared/data/floors";
import { Enemy, ClassType } from "@/shared/types/game";

declare const require: (path: string) => ImageSourcePropType;

// Expo/Metro est beaucoup plus fiable quand les assets natifs sont dans apps/mobile.
// Les fichiers ci-dessous sont des copies des assets web nécessaires au client mobile.
export const biomeBackgroundSources: Record<FloorBiome, ImageSourcePropType> = {
  forest: require("./game/backgrounds/forest.jpg"),
  ruins: require("./game/backgrounds/ruins.jpg"),
  swamp: require("./game/backgrounds/swamp.jpg"),
  crypt: require("./game/backgrounds/crypt.jpg"),
  mountain: require("./game/backgrounds/mountain.jpg"),
  cathedral: require("./game/backgrounds/cathedral.jpg"),
  cavern: require("./game/backgrounds/cavern.jpg"),
  ashlands: require("./game/backgrounds/ashland.jpg"),
};

const enemyImageSources: Record<string, ImageSourcePropType> = {
  "enemies/forest/forest_monster_01.jpg": require("./game/enemies/forest/forest_monster_01.jpg"),
  "enemies/forest/forest_monster_02.jpg": require("./game/enemies/forest/forest_monster_02.jpg"),
  "enemies/forest/forest_monster_03.jpg": require("./game/enemies/forest/forest_monster_03.jpg"),
  "enemies/forest/forest_monster_04.jpg": require("./game/enemies/forest/forest_monster_04.jpg"),
  "enemies/forest/forest_monster_05.jpg": require("./game/enemies/forest/forest_monster_05.jpg"),
  "enemies/forest/forest_monster_06.jpg": require("./game/enemies/forest/forest_monster_06.jpg"),
  "enemies/ruins/ruins_monster_01.jpg": require("./game/enemies/ruins/ruins_monster_01.jpg"),
  "enemies/ruins/ruins_monster_02.jpg": require("./game/enemies/ruins/ruins_monster_02.jpg"),
  "enemies/ruins/ruins_monster_03.jpg": require("./game/enemies/ruins/ruins_monster_03.jpg"),
  "enemies/ruins/ruins_monster_04.jpg": require("./game/enemies/ruins/ruins_monster_04.jpg"),
  "enemies/ruins/ruins_monster_05.jpg": require("./game/enemies/ruins/ruins_monster_05.jpg"),
  "enemies/ruins/ruins_monster_06.jpg": require("./game/enemies/ruins/ruins_monster_06.jpg"),
  "boss/forest_boss_01-1.jpg": require("./game/boss/forest_boss_01-1.jpg"),
  "boss/forest_boss_01-2.jpg": require("./game/boss/forest_boss_01-2.jpg"),
  "boss/ruins_boss_01.jpg": require("./game/boss/ruins_boss_01.jpg"),
  "boss/crypt_boss_01.jpg": require("./game/boss/crypt_boss_01.jpg"),
};

const classIconSources: Record<ClassType, ImageSourcePropType> = {
  Guerrier: require("./game/characters/warrior/warrior_icon.jpg"),
  Mage: require("./game/characters/wizard/wizard_icon.jpg"),
  Archer: require("./game/characters/ranger/ranger_icon.jpg"),
  Voleur: require("./game/characters/rogue/rogue_icon.jpg"),
  Demoniste: require("./game/characters/demonist/demonist_icon.jpg"),
  Clerc: require("./game/characters/cleric/cleric_icon.jpg"),
  Sentinelle: require("./game/characters/sentinel/sentinel_icon.jpg"),
};

const classPortraitSources: Record<ClassType, ImageSourcePropType> = {
  Guerrier: require("./game/characters/warrior/warrior_portrait.jpg"),
  Mage: require("./game/characters/wizard/wizard_portrait.jpg"),
  Archer: require("./game/characters/ranger/ranger_portrait.jpg"),
  Voleur: require("./game/characters/rogue/rogue_portrait.jpg"),
  Demoniste: require("./game/characters/demonist/demonist_portrait.jpg"),
  Clerc: require("./game/characters/cleric/cleric_portrait.jpg"),
  Sentinelle: require("./game/characters/sentinel/sentinel_portrait.jpg"),
};

const classFullbodySources: Record<ClassType, ImageSourcePropType> = {
  Guerrier: require("./game/characters/warrior/warrior_fullbody.jpg"),
  Mage: require("./game/characters/wizard/wizard_fullbody.jpg"),
  Archer: require("./game/characters/ranger/ranger_fullbody.jpg"),
  Voleur: require("./game/characters/rogue/rogue_fullbody.jpg"),
  Demoniste: require("./game/characters/demonist/demonist_fullbody.jpg"),
  Clerc: require("./game/characters/cleric/cleric_fullbody.jpg"),
  Sentinelle: require("./game/characters/sentinel/sentinel_fullbody.jpg"),
};

export function getBiomeBackgroundSource(biome: FloorBiome): ImageSourcePropType {
  return biomeBackgroundSources[biome];
}

export function getEnemyImageSource(enemy: Pick<Enemy, "image" | "phaseTwoImage">): ImageSourcePropType | null {
  const imagePath = enemy.phaseTwoImage ?? enemy.image;
  const normalized = imagePath.replace(/^\//, "");
  return enemyImageSources[normalized] ?? null;
}

export function getClassIconSource(classType: ClassType): ImageSourcePropType {
  return classIconSources[classType];
}

export function getClassPortraitSource(classType: ClassType): ImageSourcePropType {
  return classPortraitSources[classType];
}

export function getClassFullbodySource(classType: ClassType): ImageSourcePropType {
  return classFullbodySources[classType];
}
