import { CLASSES } from "@/app/component/data/classes";
import { PLAYER_PASSIVES } from "@/app/component/lib/passives";
import { ClassType, PassiveEffect, Player } from "@/app/component/types/game";

export function getStartingPassives(classType: ClassType): PassiveEffect[] {
  switch (classType) {
    case "Guerrier":
      return [PLAYER_PASSIVES.iron_skin()];
    case "Mage":
      return [PLAYER_PASSIVES.mana_surge()];
    case "Archer":
      return [PLAYER_PASSIVES.survivor_instinct()];
    case "Voleur":
      return [PLAYER_PASSIVES.toxic_blade()];
    case "Demoniste":
      return [PLAYER_PASSIVES.soul_feast()];
    case "Clerc":
      return [PLAYER_PASSIVES.divine_reserve()];
    default:
      return [];
  }
}

export function createPlayer(params: {
  id: number;
  name: string;
  classType: ClassType;
  currentNode?: number;
}): Player {
  const classData = CLASSES[params.classType];

  return {
    id: params.id,
    name: params.name.trim(),
    classType: params.classType,
    stats: { ...classData.stats },
    currentNode: params.currentNode ?? 0,
    image: classData.image,
    portrait: classData.portrait,
    isDead: false,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    statuses: [],
    mapEffects: [],
    passives: getStartingPassives(params.classType),
    traits: [],
    gold: 50,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      relic: null,
    },
  };
}
