import { CLASS_SKILLS } from "@/shared/data/abilities";
import { CLASSES } from "@/shared/data/classes";
import { formatCombatStatuses } from "@/shared/engine/combat/statusPresentation";
import { getClassFallbackIcon } from "@/shared/engine/game/playerPresentation";
import { getDerivedPlayerStats } from "@/shared/lib/playerStats";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { MapEffect, Player, PlayerSkill, Stats } from "@/shared/types/game";

export type MobileTeamHeroSummary = {
  player: Player;
  icon: string;
  role: string;
  description: string;
  synergyTags: string[];
  derivedStats: Stats;
  hpPercent: number;
  manaPercent: number;
  xpPercent: number;
  equipmentCount: number;
  inventoryCount: number;
  unlockedSkills: PlayerSkill[];
  lockedSkills: PlayerSkill[];
  statusBadges: ReturnType<typeof formatCombatStatuses>;
  mapEffectLines: string[];
  passiveLines: string[];
  traitLines: string[];
};

function percent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

function formatMapEffect(effect: MapEffect): string {
  const label: Record<MapEffect["type"], string> = {
    wound: "Blessure",
    infection: "Infection",
    blessing: "Bénédiction",
    protection: "Protection",
    corruption_mark: "Marque de corruption",
    fatigue: "Fatigue",
    hex: "Maléfice",
  };

  return `${label[effect.type] ?? effect.type} · ${effect.value} · ${effect.duration} tour(s)`;
}

export function getMobileTeamHeroSummaries(run: EtherniaRunSave): MobileTeamHeroSummary[] {
  return run.players.map((player) => {
    const classData = CLASSES[player.classType];
    const skills = CLASS_SKILLS[player.classType] ?? [];
    const unlockedSkills = skills.filter((skill) => skill.minLevel <= player.level);
    const lockedSkills = skills.filter((skill) => skill.minLevel > player.level);
    const derivedStats = getDerivedPlayerStats(player);
    const equipmentCount = Object.values(player.equipment ?? {}).filter(Boolean).length;

    return {
      player,
      icon: getClassFallbackIcon(player.classType),
      role: classData?.role ?? "Rôle inconnu",
      description: classData?.shortDescription ?? "Héros d'Ethernia.",
      synergyTags: classData?.synergyTags ?? [],
      derivedStats,
      hpPercent: percent(player.stats.hp, derivedStats.maxHp),
      manaPercent: percent(player.stats.mana, derivedStats.maxMana),
      xpPercent: percent(player.xp, player.xpToNextLevel),
      equipmentCount,
      inventoryCount: (player.inventory ?? []).reduce((total, item) => total + (item.quantity ?? 1), 0),
      unlockedSkills,
      lockedSkills,
      statusBadges: formatCombatStatuses(player.statuses ?? []),
      mapEffectLines: (player.mapEffects ?? []).map(formatMapEffect),
      passiveLines: (player.passives ?? []).map((passive) => `${passive.name} — ${passive.description}`),
      traitLines: (player.traits ?? []).map((trait) => `${trait.name} — ${trait.description}`),
    };
  });
}

export function getMobileTeamRunOverview(run: EtherniaRunSave) {
  const alive = run.players.filter((player) => !player.isDead && player.stats.hp > 0).length;
  const totalGold = run.players.reduce((total, player) => total + player.gold, 0);
  const totalInventory = run.players.reduce(
    (total, player) => total + (player.inventory ?? []).reduce((count, item) => count + (item.quantity ?? 1), 0),
    0
  );

  return {
    alive,
    total: run.players.length,
    totalGold,
    totalInventory,
    corruption: run.corruptionLevel,
    floor: run.currentFloor,
    biome: run.currentFloorBiome,
  };
}
