import { ClassType, Enemy, MapNode, Player, PlayerSkill, Stats } from "@/shared/types/game";
import { getUnlockedSkills } from "@/shared/data/abilities";
import { getDerivedPlayerStats } from "@/shared/lib/playerStats";

export function healPlayer(player: Player, hpGain: number, manaGain: number): Player {
  return {
    ...player,
    stats: {
      ...player.stats,
      hp: Math.min(player.stats.maxHp, player.stats.hp + hpGain),
      mana: Math.min(player.stats.maxMana, player.stats.mana + manaGain),
    },
  };
}

export function buffPlayerStats(
  player: Player,
  bonuses: Partial<Pick<Stats, "strength" | "magic" | "defense">>
): Player {
  return {
    ...player,
    stats: {
      ...player.stats,
      strength: player.stats.strength + (bonuses.strength || 0),
      magic: player.stats.magic + (bonuses.magic || 0),
      defense: player.stats.defense + (bonuses.defense || 0),
    },
  };
}


export function getBossStatuePenaltyTier(statuesCollected: number): 0 | 1 | 2 {
  if (statuesCollected >= 2) return 2;
  if (statuesCollected >= 1) return 1;
  return 0;
}

export function getBossModifiersFromStatues(statuesCollected: number) {
  const tier = getBossStatuePenaltyTier(statuesCollected);

  if (tier === 0) {
    return {
      hp: 1.45,
      strength: 1.18,
      magic: 1.16,
      defense: 1.12,
      title: "Boss déchaîné",
      prefix: "☠️☠️ ",
      description:
        "Le gardien conserve presque toute sa puissance. Les sceaux n'ont pas été brisés.",
    };
  }

  if (tier === 1) {
    return {
      hp: 1.18,
      strength: 1.07,
      magic: 1.06,
      defense: 1.04,
      title: "Boss instable",
      prefix: "☠️ ",
      description:
        "Une statuette a été récupérée. Le pouvoir du gardien a partiellement diminué.",
    };
  }

  return {
    hp: 1,
    strength: 1,
    magic: 1,
    defense: 1,
    title: "Boss affaibli",
    prefix: "",
    description:
      "Les statuettes ont brisé les sceaux. Le gardien combat à sa puissance normale.",
  };
}

export function getXpReward(enemy: Enemy, node: MapNode | undefined) {
  if (!node) return 25;
  if (node.type === "boss") return 120;
  if (node.eventType === "elite") return 90;
  if (node.eventType === "battle") return 60;
  if (node.type === "step") return 35;
  return 20;
}

  export function getLevelUpStats(classType: ClassType) {
    switch (classType) {
      case "Guerrier":
        return { hp: 12, mana: 4, strength: 2, magic: 1, defense: 2, speed: 1 };
      case "Mage":
        return { hp: 7, mana: 10, strength: 1, magic: 3, defense: 1, speed: 1 };
      case "Archer":
        return { hp: 9, mana: 7, strength: 2, magic: 1, defense: 1, speed: 1 };
      case "Voleur":
        return { hp: 8, mana: 6, strength: 2, magic: 1, defense: 1, speed: 2 };
      case "Demoniste":
        return { hp: 9, mana: 10, strength: 1, magic: 2, defense: 1, speed: 1 };
      case "Clerc":
        return { hp: 10, mana: 9, strength: 1, magic: 2, defense: 1, speed: 1 };
      case "Sentinelle":
        return { hp: 10, mana: 8, strength: 1, magic: 1, defense: 1, speed: 1 };
      default:
        return { hp: 9, mana: 6, strength: 1, magic: 1, defense: 1, speed: 1 };
    }
  }

export function applyXpAndLevelUp(
  player: Player,
  xpGained: number,
  onLevelUp: (payload: {
    playerName: string;
    classType: ClassType;
    level: number;
    growth: {
      hp: number;
      mana: number;
      strength: number;
      magic: number;
      defense: number;
      speed: number;
    };
    newSkills: PlayerSkill[];
  }) => void
): Player {
  let updatedPlayer: Player = {
    ...player,
    xp: player.xp + xpGained,
  };

  while (updatedPlayer.xp >= updatedPlayer.xpToNextLevel) {
    const oldLevel = updatedPlayer.level;
    const skillsBefore = getUnlockedSkills(updatedPlayer.classType, oldLevel);

    updatedPlayer.xp -= updatedPlayer.xpToNextLevel;

    const growth = getLevelUpStats(updatedPlayer.classType);
    const newMaxHp = updatedPlayer.stats.maxHp + growth.hp;
    const newMaxMana = updatedPlayer.stats.maxMana + growth.mana;

    updatedPlayer = {
      ...updatedPlayer,
      level: updatedPlayer.level + 1,
      xpToNextLevel: Math.floor(updatedPlayer.xpToNextLevel * 1.25),
      stats: {
        ...updatedPlayer.stats,
        maxHp: newMaxHp,
        hp: newMaxHp,
        maxMana: newMaxMana,
        mana: newMaxMana,
        strength: updatedPlayer.stats.strength + growth.strength,
        magic: updatedPlayer.stats.magic + growth.magic,
        defense: updatedPlayer.stats.defense + growth.defense,
        speed: updatedPlayer.stats.speed + growth.speed,
      },
    };

    const skillsAfter = getUnlockedSkills(updatedPlayer.classType, updatedPlayer.level);
    const newSkills = skillsAfter.filter(
      (afterSkill) => !skillsBefore.some((beforeSkill) => beforeSkill.id === afterSkill.id)
    );

    onLevelUp({
      playerName: updatedPlayer.name,
      classType: updatedPlayer.classType,
      level: updatedPlayer.level,
      growth,
      newSkills,
    });
  }

  return updatedPlayer;
}

export function healPlayerWithEquipment(player: Player, hpGain: number, manaGain: number): Player {
  const effective = getDerivedPlayerStats(player);
  const hpDelta = Math.min(effective.maxHp, effective.hp + hpGain) - effective.hp;
  const manaDelta = Math.min(effective.maxMana, effective.mana + manaGain) - effective.mana;

  return {
    ...player,
    stats: {
      ...player.stats,
      hp: Math.min(player.stats.maxHp, player.stats.hp + hpDelta),
      mana: Math.min(player.stats.maxMana, player.stats.mana + manaDelta),
    },
  };
}

export function getNextCorruptionDepth(
  nextTurn: number,
  corruptionEveryTurns: number
) {
  return Math.floor(nextTurn / corruptionEveryTurns);
}

export function isNodeCorrupted(node: MapNode, corruptionDepth: number) {
  if (corruptionDepth <= 0) return false;
  if (node.type === "start") return false;
  return node.depth <= corruptionDepth;
}

export function getCorruptionTier(corruptionDepth: number) {
  if (corruptionDepth >= 4) return 4;
  if (corruptionDepth >= 3) return 3;
  if (corruptionDepth >= 2) return 2;
  if (corruptionDepth >= 1) return 1;
  return 0;
}

export function getCorruptionMapDamage(corruptionDepth: number) {
  const tier = getCorruptionTier(corruptionDepth);

  if (tier >= 3) return 8;
  if (tier >= 1) return 5;
  return 0;
}

export function getRestHealMultiplier(corruptionDepth: number) {
  const tier = getCorruptionTier(corruptionDepth);

  if (tier >= 4) return 0.45;
  if (tier >= 3) return 0.55;
  if (tier >= 2) return 0.7;
  return 1;
}

export function getCorruptedEnemyMultiplier(corruptionDepth: number) {
  const tier = getCorruptionTier(corruptionDepth);

  if (tier >= 4) {
    return {
      hp: 1.45,
      strength: 1.22,
      magic: 1.2,
      defense: 1.14,
    };
  }

  if (tier >= 3) {
    return {
      hp: 1.34,
      strength: 1.16,
      magic: 1.14,
      defense: 1.1,
    };
  }

  if (tier >= 1) {
    return {
      hp: 1.2,
      strength: 1.1,
      magic: 1.09,
      defense: 1.06,
    };
  }

  return {
    hp: 1,
    strength: 1,
    magic: 1,
    defense: 1,
  };
}

export function getCorruptionTierLabel(corruptionDepth: number) {
  const tier = getCorruptionTier(corruptionDepth);

  switch (tier) {
    case 0:
      return "Faible";
    case 1:
      return "Instable";
    case 2:
      return "Pesante";
    case 3:
      return "Sévère";
    default:
      return "Critique";
  }
}