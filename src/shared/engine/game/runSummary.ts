import { EtherniaRunSave } from "./gameTypes";
import { Player } from "@/shared/types/game";

export type RunHeroSummary = {
  id: number;
  name: string;
  classType: Player["classType"];
  level: number;
  xp: number;
  gold: number;
  isDead: boolean;
};

export type RunSummary = {
  runSeed?: string;
  currentFloor: number;
  biome: EtherniaRunSave["currentFloorBiome"];
  heroCount: number;
  aliveHeroCount: number;
  deadHeroCount: number;
  totalLevel: number;
  highestLevel: number;
  totalGold: number;
  resolvedNodeCount: number;
  visitedNodeCount: number;
  discoveredNodeCount: number;
  corruptionLevel: number;
  corruptionCharge: number;
  corruptedNodeCount: number;
  heroes: RunHeroSummary[];
  MVP?: RunHeroSummary;
};

export function buildRunSummary(run: EtherniaRunSave): RunSummary {
  const heroes = run.players.map((player) => ({
    id: player.id,
    name: player.name,
    classType: player.classType,
    level: player.level,
    xp: player.xp,
    gold: player.gold,
    isDead: player.isDead,
  }));

  const aliveHeroCount = heroes.filter((hero) => !hero.isDead).length;
  const totalLevel = heroes.reduce((sum, hero) => sum + hero.level, 0);
  const totalGold = heroes.reduce((sum, hero) => sum + hero.gold, 0);
  const highestLevel = heroes.reduce((highest, hero) => Math.max(highest, hero.level), 0);
  const resolvedNodeCount = run.nodes.filter((node) => node.isConsumed).length;
  const visitedNodeCount = run.nodes.filter((node) => node.visibility === "visited").length;
  const discoveredNodeCount = run.nodes.filter((node) => node.visibility !== "hidden").length;

  const MVP = [...heroes].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    if (b.xp !== a.xp) return b.xp - a.xp;
    return b.gold - a.gold;
  })[0];

  return {
    runSeed: run.runSeed,
    currentFloor: run.currentFloor,
    biome: run.currentFloorBiome,
    heroCount: heroes.length,
    aliveHeroCount,
    deadHeroCount: heroes.length - aliveHeroCount,
    totalLevel,
    highestLevel,
    totalGold,
    resolvedNodeCount,
    visitedNodeCount,
    discoveredNodeCount,
    corruptionLevel: run.corruptionLevel,
    corruptionCharge: run.corruptionCharge,
    corruptedNodeCount: run.corruptedNodeIds.length,
    heroes,
    MVP,
  };
}
