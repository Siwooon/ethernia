import {
  CLASS_TALENT_TREES,
  isTalentNodeUnlocked,
  type TalentNode,
} from "@/shared/engine/game/classTalentTrees";
import type { Enemy, Player } from "@/shared/types/game";

type BalanceRole = "Dégâts" | "Défense" | "Soutien" | "Contrôle" | "Survie" | "Rythme" | "Risque";

type PartyTalentProfile = {
  totalTalents: number;
  tierOne: number;
  tierTwo: number;
  tierThree: number;
  roleCounts: Partial<Record<BalanceRole, number>>;
  pressure: number;
  dominantRole: BalanceRole | null;
};

export type TalentEnemyBalanceResult = {
  enemies: Enemy[];
  profile: PartyTalentProfile;
  logs: string[];
};

function getUnlockedTalentNodes(player: Player): TalentNode[] {
  const branches = CLASS_TALENT_TREES[player.classType] ?? [];
  return branches
    .flatMap((branch) => branch.nodes)
    .filter((node) => isTalentNodeUnlocked(node, player.buildChoices));
}

function buildPartyTalentProfile(players: Player[]): PartyTalentProfile {
  const roleCounts: Partial<Record<BalanceRole, number>> = {};
  let tierOne = 0;
  let tierTwo = 0;
  let tierThree = 0;

  for (const player of players) {
    for (const node of getUnlockedTalentNodes(player)) {
      const tier = node.tier ?? 1;
      if (tier >= 3) tierThree += 1;
      else if (tier === 2) tierTwo += 1;
      else tierOne += 1;

      const role = (node.role ?? "Dégâts") as BalanceRole;
      roleCounts[role] = (roleCounts[role] ?? 0) + 1;
    }
  }

  const dominantRole = (Object.entries(roleCounts) as [BalanceRole, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const pressure = tierOne * 1 + tierTwo * 1.35 + tierThree * 2.35;

  return {
    totalTalents: tierOne + tierTwo + tierThree,
    tierOne,
    tierTwo,
    tierThree,
    roleCounts,
    pressure,
    dominantRole,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scaleStat(value: number, multiplier: number, bonus = 0) {
  return Math.max(1, Math.round(value * multiplier + bonus));
}

function getRolePressureBonus(profile: PartyTalentProfile, role: BalanceRole) {
  return clamp((profile.roleCounts[role] ?? 0) * 0.01, 0, 0.05);
}

function adaptEnemyToTalents(enemy: Enemy, profile: PartyTalentProfile, params: { floor: number; isBossCombat: boolean; corruptionLevel: number }) {
  if (profile.totalTalents <= 0) return enemy;

  const floorPressure = clamp((params.floor - 1) * 0.035, 0, 0.12);
  const talentPressure = clamp(profile.pressure * 0.012, 0, 0.18);
  const corruptionPressure = clamp(params.corruptionLevel * 0.006, 0, 0.06);
  const bossPressure = enemy.isBoss || params.isBossCombat ? 0.08 + profile.tierThree * 0.018 : 0;
  const elitePressure = enemy.sourceTag === "elite" ? 0.035 : 0;

  const damageCounter = getRolePressureBonus(profile, "Dégâts") + getRolePressureBonus(profile, "Risque");
  const defenseCounter = getRolePressureBonus(profile, "Défense") + getRolePressureBonus(profile, "Survie") + getRolePressureBonus(profile, "Soutien");
  const controlCounter = getRolePressureBonus(profile, "Contrôle") + getRolePressureBonus(profile, "Rythme");

  const hpMultiplier = 1 + talentPressure + floorPressure + bossPressure + damageCounter;
  const offenseMultiplier = 1 + talentPressure * 0.48 + floorPressure * 0.55 + corruptionPressure + defenseCounter;
  const defenseMultiplier = 1 + talentPressure * 0.34 + bossPressure * 0.45 + controlCounter;
  const speedMultiplier = 1 + clamp(profile.tierThree * 0.012 + getRolePressureBonus(profile, "Rythme"), 0, 0.08);

  const maxHp = scaleStat(enemy.maxHp, hpMultiplier, profile.tierThree * (enemy.isBoss ? 4 : 2));
  const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;

  return {
    ...enemy,
    maxHp,
    hp: Math.max(1, Math.round(maxHp * clamp(hpRatio, 0.05, 1))),
    strength: scaleStat(enemy.strength, offenseMultiplier),
    magic: scaleStat(enemy.magic, offenseMultiplier),
    defense: scaleStat(enemy.defense, defenseMultiplier, profile.tierThree > 0 && enemy.isBoss ? 1 : 0),
    speed: scaleStat(enemy.speed, speedMultiplier),
    attacks: enemy.attacks.map((attack) => ({
      ...attack,
      powerMultiplier: attack.powerMultiplier
        ? Number((attack.powerMultiplier * (1 + clamp(profile.tierThree * 0.01, 0, 0.05))).toFixed(2))
        : attack.powerMultiplier,
    })),
  };
}

export function balanceEnemiesForPartyTalents(params: {
  enemies: Enemy[];
  players: Player[];
  floor: number;
  isBossCombat: boolean;
  corruptionLevel: number;
}): TalentEnemyBalanceResult {
  const profile = buildPartyTalentProfile(params.players);

  if (profile.totalTalents <= 0) {
    return { enemies: params.enemies, profile, logs: [] };
  }

  const enemies = params.enemies.map((enemy) =>
    adaptEnemyToTalents(enemy, profile, {
      floor: params.floor,
      isBossCombat: params.isBossCombat,
      corruptionLevel: params.corruptionLevel,
    }),
  );

  const focus = profile.dominantRole ? ` · pression ${profile.dominantRole.toLowerCase()}` : "";
  const logs = [
    `⚖️ Opposition ajustée : ${profile.totalTalents} talent(s), ${profile.tierThree} palier(s) majeur(s)${focus}.`,
  ];

  if (params.isBossCombat && profile.tierThree > 0) {
    logs.push("👁️ Le gardien répond aux maîtrises majeures.");
  }

  return { enemies, profile, logs };
}
