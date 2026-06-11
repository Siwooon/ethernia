import { consumeCombatMapEffects } from "@/shared/lib/mapEffects";
import { getDerivedPlayerStats, restorePersistentPlayerStatsFromCombat } from "@/shared/lib/playerStats";
import { finishMobileTurn } from "@/shared/engine/game/nodeEventEngine";
import { REQUIRED_STATUES } from "@/shared/engine/game/gameState";
import { advanceMobileRunAfterBossVictory } from "@/shared/engine/game/mobileBossProgression";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { isNodeCorrupted, markNodeResolved, markNodeRevisited } from "@/shared/engine/map/mapEngine";
import { CombatEnemyState, CombatPlayerState } from "./combatTypes";
import { ClassType, PlayerSkill } from "@/shared/types/game";
import { getLevelUpChoiceOptions, type LevelUpChoiceOption } from "@/shared/lib/levelUpChoices";
import { createScopedRandom } from "@/shared/platform/random";
import { applyRewardBundleToPlayer, buildAmbushRewardBundle, buildCombatRewardBundle, buildMimicRewardBundle, describeRewardBundle, RewardBundle } from "@/shared/engine/rewards/rewardEngine";

export type MobileLevelUpSummary = {
  playerId: number;
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
  choices: LevelUpChoiceOption[];
};

export type MobileCombatRewardSummary = {
  xpGained: number;
  goldGained: number;
  levelUps: MobileLevelUpSummary[];
  logs: string[];
  bundle?: RewardBundle;
};

export type MobilePostCombatFlow =
  | { kind: "map"; title: string; text: string }
  | { kind: "next_floor"; title: string; text: string }
  | { kind: "run_victory"; title: string; text: string }
  | { kind: "run_defeat"; title: string; text: string };

export type FinalizeMobileCombatParams = {
  run: EtherniaRunSave;
  nodeId: number;
  participantIndexes: number[];
  allies: CombatPlayerState[];
  enemies: CombatEnemyState[];
  outcome: "victory" | "defeat";
};

export type FinalizeMobileCombatResult = {
  state: EtherniaRunSave;
  rewards: MobileCombatRewardSummary;
  postCombat: MobilePostCombatFlow;
};


function applySmallTeamRecoveryAfterVictory(player: import("@/shared/types/game").Player, participantCount: number) {
  if (participantCount > 2 || player.isDead || player.stats.hp <= 0) return player;

  const derived = getDerivedPlayerStats(player);
  const hpRate = participantCount <= 1 ? 0.12 : 0.08;
  const manaRate = participantCount <= 1 ? 0.14 : 0.1;
  const hpGain = Math.max(1, Math.round(derived.maxHp * hpRate));
  const manaGain = Math.max(1, Math.round(derived.maxMana * manaRate));

  return {
    ...player,
    stats: {
      ...player.stats,
      hp: Math.min(player.stats.maxHp, player.stats.hp + hpGain),
      mana: Math.min(player.stats.maxMana, player.stats.mana + manaGain),
    },
  };
}

export function buildMobileCombatRewardPreview(params: {
  run: EtherniaRunSave;
  nodeId: number;
  enemies: CombatEnemyState[];
  outcome: "victory" | "defeat" | null;
}): MobileCombatRewardSummary {
  if (params.outcome !== "victory") {
    return { xpGained: 0, goldGained: 0, levelUps: [], logs: [] };
  }

  const node = params.run.nodes.find((candidate) => candidate.id === params.nodeId);
  const primaryEnemy = params.enemies[0]?.enemy ?? null;
  const bundle = buildCombatRewardBundle({
    primaryEnemy,
    node,
    isBoss: node?.type === "boss",
    currentFloor: params.run.currentFloor,
    corruptionLevel: params.run.corruptionLevel,
    isCorrupted: node ? isNodeCorrupted(node, params.run.corruptedNodeIds) : false,
    rng: createScopedRandom(params.run.runSeed ?? "mobile", `reward-preview:${params.nodeId}:${params.run.currentFloor}:${params.run.corruptionLevel}`),
  });

  return {
    xpGained: bundle.xp ?? 0,
    goldGained: bundle.gold ?? 0,
    levelUps: [],
    logs: [`${describeRewardBundle(bundle)} pour les participants.`],
    bundle,
  };
}

export function finalizeMobileCombatRun(params: FinalizeMobileCombatParams): FinalizeMobileCombatResult {
  const node = params.run.nodes.find((candidate) => candidate.id === params.nodeId);
  const primaryEnemy = params.enemies[0]?.enemy ?? null;
  const baseRewardBundle = params.outcome === "victory"
    ? buildCombatRewardBundle({
        primaryEnemy,
        node,
        isBoss: node?.type === "boss",
        currentFloor: params.run.currentFloor,
        corruptionLevel: params.run.corruptionLevel,
        isCorrupted: node ? isNodeCorrupted(node, params.run.corruptedNodeIds) : false,
        rng: createScopedRandom(params.run.runSeed ?? "mobile", `reward:${params.nodeId}:${params.run.currentFloor}:${params.run.corruptionLevel}:${params.outcome}`),
      })
    : null;
  const xpGained = baseRewardBundle?.xp ?? 0;
  const goldGained = baseRewardBundle?.gold ?? 0;
  const participantSet = new Set(params.participantIndexes);
  const levelUps: MobileLevelUpSummary[] = [];

  let nextRun: EtherniaRunSave = {
    ...params.run,
    players: params.run.players.map((player, index) => {
      if (!participantSet.has(index)) return player;

      const ally = params.allies.find((candidate) => candidate.playerId === player.id);
      if (!ally) return player;

      const persistentStats = restorePersistentPlayerStatsFromCombat(player, ally.stats);
      const persistentPlayerState = {
        ...player,
        gold: ally.player.gold,
        inventory: ally.player.inventory,
        equipment: ally.player.equipment,
      };
      let nextPlayer = consumeCombatMapEffects({
        ...persistentPlayerState,
        stats: persistentStats,
        statuses: ally.statuses,
        isDead: ally.isDead || persistentStats.hp <= 0,
      });

      if (params.outcome === "victory" && baseRewardBundle) {
        const rewardApplication = applyRewardBundleToPlayer(nextPlayer, baseRewardBundle, {
          applyXp: true,
          onLevelUp: (payload) => {
            levelUps.push({
              playerId: player.id,
              playerName: payload.playerName,
              classType: payload.classType,
              level: payload.level,
              growth: payload.growth,
              newSkills: payload.newSkills,
              choices: getLevelUpChoiceOptions(payload.classType, payload.level),
            });
          },
        });
        nextPlayer = rewardApplication.player;
        nextPlayer = applySmallTeamRecoveryAfterVictory(nextPlayer, participantSet.size);
      }

      return nextPlayer;
    }),
  };

  const logs: string[] = [];

  let postCombat: MobilePostCombatFlow = {
    kind: "map",
    title: "Retour à la carte",
    text: "Le groupe reprend son exploration.",
  };

  if (params.outcome === "victory") {
    if (baseRewardBundle) {
      logs.push(`Combat remporté. ${describeRewardBundle(baseRewardBundle)}.`);
    } else {
      logs.push(`Combat remporté. +${xpGained} XP.`);
    }

    const wonStatue = params.enemies.some((enemy) => enemy.enemy.grantsStatueOnWin);
    const wonMimicReward = params.enemies.some((enemy) => enemy.enemy.sourceTag === "treasure_mimic");
    const wonAmbushReward = params.enemies.some((enemy) => enemy.enemy.sourceTag === "random_ambush");

    if (wonStatue) {
      nextRun = {
        ...nextRun,
        currentFloorStatues: Math.min(REQUIRED_STATUES, nextRun.currentFloorStatues + 1),
      };
      logs.push("⭐ Statuette récupérée.");
    }

    if (wonMimicReward) {
      const mimicReward = buildMimicRewardBundle();
      nextRun = {
        ...nextRun,
        players: nextRun.players.map((player, index) =>
          participantSet.has(index)
            ? applyRewardBundleToPlayer(player, mimicReward).player
            : player
        ),
      };
      logs.push(`Butin de mimique : ${describeRewardBundle(mimicReward)} pour les participants.`);
    }

    if (wonAmbushReward) {
      const ambushReward = buildAmbushRewardBundle();
      nextRun = {
        ...nextRun,
        players: nextRun.players.map((player, index) =>
          participantSet.has(index)
            ? applyRewardBundleToPlayer(player, ambushReward).player
            : player
        ),
      };
      logs.push(`Embuscade nettoyée : ${describeRewardBundle(ambushReward)} pour les participants.`);
    }

    if (node?.type === "boss") {
      const progression = advanceMobileRunAfterBossVictory(nextRun);
      nextRun = progression.state;
      postCombat = {
        kind: progression.kind,
        title: progression.title,
        text: progression.text,
      };
      logs.push(progression.text);
    } else {
      nextRun = {
        ...nextRun,
        nodes: node?.isConsumed
          ? markNodeRevisited(nextRun.nodes, params.nodeId, wonAmbushReward || wonMimicReward ? "Menace nettoyée" : "Lieu sécurisé")
          : markNodeResolved(nextRun.nodes, params.nodeId, wonStatue ? "Statuette récupérée" : "Combat remporté"),
      };

      const ended = finishMobileTurn(nextRun, params.nodeId);
      nextRun = ended.state;
      logs.push(...ended.logs);
    }
  } else {
    logs.push("Combat perdu. Les héros engagés conservent leur état critique.");
    if (nextRun.players.every((player) => player.isDead || player.stats.hp <= 0)) {
      postCombat = {
        kind: "run_defeat",
        title: "Défaite",
        text: "Tous les héros sont tombés. La run s’achève ici.",
      };
    }
  }

  if (levelUps.length > 0) {
    logs.push(...levelUps.map((entry) => `${entry.playerName} atteint le niveau ${entry.level}.`));
  }

  return {
    state: nextRun,
    rewards: {
      xpGained,
      goldGained,
      levelUps,
      logs,
      bundle: baseRewardBundle ?? undefined,
    },
    postCombat,
  };
}
