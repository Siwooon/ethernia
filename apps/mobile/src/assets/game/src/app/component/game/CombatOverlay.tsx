"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getUnlockedSkills } from "@/shared/data/abilities";
import {
  Enemy,
  Player,
  Stats,
  StatusEffect,
  TerrainEffect,
} from "@/shared/types/game";
import {
  addStatus,
  applyStatusModifiersToStats,
} from "@/shared/lib/statusEffects";
import { applyTerrainEffectsEachTurn } from "@/shared/lib/terrainEffects";
import { runPassives } from "@/shared/lib/passives";
import EnemyAttackBanner from "./combat/EnemyAttackBanner";
import BossPhaseTransition from "./combat/BossPhaseTransition";
import CombatActionsPanel from "./combat/CombatActionsPanel";
import CombatLogPanel from "./combat/CombatLogPanel";
import EnemyIntentionsPanel, {
  EnemyIntentionView,
} from "./combat/EnemyIntentionsPanel";
import StatusBadges from "./combat/StatusBadges";
import { useIsMobile } from "./mobile/useIsMobile";
import MobileActionSheet from "./mobile/MobileActionSheet";
import MobileCombatActionBar from "./mobile/MobileCombatActionBar";
import MobileCombatLayout from "./mobile/MobileCombatLayout";
import {
  CombatEnemyState,
  CombatPlayerState,
  CombatResultPlayer,
  PlannedEnemyAction,
  TurnEntry,
} from "@/shared/engine/combat/combatTypes";
export type { CombatResultPlayer } from "@/shared/engine/combat/combatTypes";
import {
  buildPlannedEnemyAction,
  enemyToCombatState,
  syncEnemyState,
} from "@/shared/engine/combat/enemyPlanning";
import { buildEnemyIntentions } from "@/shared/engine/combat/enemyIntentions";
import {
  applyFeralHeartPhaseTransition,
  applyHealingToStats,
  applyIncomingDamageToStats,
  pickEnemyTargetIds,
  resolveEnemyAttackAgainstPlayer,
  resolvePlayerBasicAttack,
  resolvePlayerSkill,
  shouldApplyChance,
} from "@/shared/engine/combat/combatEngine";
import { buildTurnOrder } from "@/shared/engine/combat/turnOrder";
import { applyEndOfRoundEffects } from "@/shared/engine/combat/roundEffects";
import {
  createInitialCombatAllies,
  createInitialDisplayedPlayerHp,
} from "@/shared/engine/combat/combatSetup";
import { STATUS_LABELS } from "@/shared/engine/combat/statusPresentation";
import { CombatAction } from "@/shared/engine/combat/combatActions";
import { createCombatStateSnapshot } from "@/shared/engine/combat/combatState";
import { applyCombatAction } from "@/shared/engine/combat/combatReducer";
import { getClassFallbackIcon } from "@/shared/engine/game/playerPresentation";
import {
  buildCombatResultsFromAllies,
  evaluateCombatEnd,
} from "@/shared/engine/combat/combatResults";
import { getCombatShieldValue } from "@/shared/engine/combat/statuses";

type Props = {
  players: Player[];
  enemies: Enemy[];
  terrainEffects?: TerrainEffect[];
  onWin: (results: CombatResultPlayer[]) => void;
  onDefeat: (results: CombatResultPlayer[]) => void;
  onFlee: (results: CombatResultPlayer[]) => void;
};

type FloatingText = {
  id: number;
  target: string | number;
  text: string;
  tone: "damage" | "heal" | "shield" | "mana";
};

export default function CombatOverlay({
  players,
  enemies,
  terrainEffects = [],
  onWin,
  onDefeat,
  onFlee,
}: Props) {
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState<string[]>(["⚔️ Le combat commence !"]);

  const [allies, setAllies] = useState<CombatPlayerState[]>(
    createInitialCombatAllies(players, terrainEffects),
  );

  const initialEnemyStates = enemies.map((enemy, index) =>
    enemyToCombatState(enemy, index),
  );

  const [enemyStates, setEnemyStates] =
    useState<CombatEnemyState[]>(initialEnemyStates);

  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(
    initialEnemyStates.length > 0 ? initialEnemyStates[0].enemyId : null,
  );

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [turnOrder, setTurnOrder] = useState<TurnEntry[]>([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);
  const [roundCount, setRoundCount] = useState(1);
  const displayRound = roundCount;
  const [turnState, setTurnState] = useState<"waiting" | "animating">(
    "waiting",
  );
  const [shake, setShake] = useState<"player" | "enemy" | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const [displayedEnemyHp, setDisplayedEnemyHp] = useState<
    Record<string, number>
  >(
    Object.fromEntries(
      initialEnemyStates.map((enemyState) => [
        enemyState.enemyId,
        enemyState.stats.hp,
      ]),
    ),
  );

  const [displayedAlliesHp, setDisplayedAlliesHp] = useState<
    Record<number, number>
  >(createInitialDisplayedPlayerHp(players));

  const [displayedEnemyShield, setDisplayedEnemyShield] = useState<
    Record<string, number>
  >(
    Object.fromEntries(
      initialEnemyStates.map((enemyState) => [
        enemyState.enemyId,
        getCombatShieldValue(enemyState.statuses),
      ]),
    ),
  );

  const [displayedAlliesShield, setDisplayedAlliesShield] = useState<
    Record<number, number>
  >(
    Object.fromEntries(
      players.map((p) => [p.id, getCombatShieldValue(p.statuses || [])]),
    ),
  );

  const [forcedTargetPlayerId, setForcedTargetPlayerId] = useState<
    number | null
  >(null);
  const [forcedTargetTurns, setForcedTargetTurns] = useState(0);
  const floatingTextIdRef = useRef(0);
  const alliesRef = useRef(allies);
  const enemiesRef = useRef(enemyStates);
  const roundProcessingRef = useRef(false);
  const previousBossPhasesRef = useRef<Record<string, number>>({});
  const [plannedEnemyActions, setPlannedEnemyActions] = useState<
    Record<string, PlannedEnemyAction>
  >({});
  const [mobileIntentionsOpen, setMobileIntentionsOpen] = useState(false);
  const [mobileLogOpen, setMobileLogOpen] = useState(false);
  const plannedEnemyActionsRef = useRef<Record<string, PlannedEnemyAction>>({});
  const combatActionTraceRef = useRef<string[]>([]);

  const [enemyAttackBanner, setEnemyAttackBanner] = useState<{
    name: string;
    description?: string;
    kind: "physical" | "magical" | "hybrid";
    enemyName?: string;
  } | null>(null);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const consumeForcedTargetTurn = () => {
    if (forcedTargetTurns <= 0) return;
    const nextTurns = forcedTargetTurns - 1;
    setForcedTargetTurns(nextTurns);
    if (nextTurns <= 0) setForcedTargetPlayerId(null);
  };

  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev]);

  const dispatchCombatAction = (action: CombatAction) => {
    const result = applyCombatAction(
      createCombatStateSnapshot({
        allies: alliesRef.current,
        enemies: enemiesRef.current,
        selectedEnemyId,
        selectedSkillId,
        turnOrder,
        activeTurnIndex,
        roundCount,
        phase: turnState,
        plannedEnemyActions: plannedEnemyActionsRef.current,
        logs,
      }),
      action,
    );

    combatActionTraceRef.current = [
      result.trace,
      ...combatActionTraceRef.current,
    ].slice(0, 80);

    if (action.type === "SELECT_TARGET") {
      setSelectedEnemyId(result.state.selectedEnemyId);
    }

    if (action.type === "SELECT_SKILL") {
      setSelectedSkillId(result.state.selectedSkillId);
    }

    return result;
  };

  const selectEnemyTarget = (enemyId: string | null) => {
    dispatchCombatAction({ type: "SELECT_TARGET", enemyId });
  };

  const selectPlayerSkill = (skillId: string) => {
    dispatchCombatAction({ type: "SELECT_SKILL", skillId });
  };

  const triggerShake = (target: "player" | "enemy") => {
    setShake(target);
    setTimeout(() => setShake(null), 350);
  };

  const spawnFloatingText = (
    target: string | number,
    text: string,
    tone: "damage" | "heal" | "shield" | "mana",
  ) => {
    const id = ++floatingTextIdRef.current;
    setFloatingTexts((prev) => [...prev, { id, target, text, tone }]);

    window.setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((entry) => entry.id !== id));
    }, 900);
  };

  const getEnemyById = (enemyId: string) =>
    enemiesRef.current.find((enemyState) => enemyState.enemyId === enemyId);

  const selectedEnemy =
    (selectedEnemyId ? getEnemyById(selectedEnemyId) : null) ??
    enemiesRef.current.find((enemyState) => !enemyState.isDead) ??
    null;

  useEffect(() => {
    alliesRef.current = allies;
  }, [allies]);

  useEffect(() => {
    enemiesRef.current = enemyStates;
  }, [enemyStates]);

  useEffect(() => {
    plannedEnemyActionsRef.current = plannedEnemyActions;
  }, [plannedEnemyActions]);

  useEffect(() => {
    if (
      !selectedEnemyId ||
      !getEnemyById(selectedEnemyId) ||
      getEnemyById(selectedEnemyId)?.isDead
    ) {
      const firstAlive = enemiesRef.current.find(
        (enemyState) => !enemyState.isDead,
      );
      selectEnemyTarget(firstAlive?.enemyId ?? null);
    }
  }, [enemyStates, selectedEnemyId]);

  useEffect(() => {
    setDisplayedAlliesHp(
      Object.fromEntries(allies.map((ally) => [ally.playerId, ally.stats.hp])),
    );
    setDisplayedAlliesShield(
      Object.fromEntries(
        allies.map((ally) => [ally.playerId, getCombatShieldValue(ally.statuses)]),
      ),
    );
  }, [allies]);

  useEffect(() => {
    setDisplayedEnemyHp(
      Object.fromEntries(
        enemyStates.map((enemyState) => [
          enemyState.enemyId,
          enemyState.stats.hp,
        ]),
      ),
    );
    setDisplayedEnemyShield(
      Object.fromEntries(
        enemyStates.map((enemyState) => [
          enemyState.enemyId,
          getCombatShieldValue(enemyState.statuses),
        ]),
      ),
    );
  }, [enemyStates]);

  useEffect(() => {
    enemyStates.forEach((enemyState) => {
      const enemy = enemyState.enemy;
      const currentPhase = enemy.bossState?.phase ?? 1;
      const previousPhase =
        previousBossPhasesRef.current[enemyState.enemyId] ?? 1;

      if (
        enemy.isBoss &&
        enemy.bossMechanic === "feral_heart" &&
        previousPhase === 1 &&
        currentPhase === 2
      ) {
        setBossPhaseTransition({
          enemyId: enemyState.enemyId,
          label: "FURIE",
        });

        window.setTimeout(() => {
          setBossPhaseTransition(null);
        }, 1800);
      }

      previousBossPhasesRef.current[enemyState.enemyId] = currentPhase;
    });
  }, [enemyStates]);

  const buildCombatResults = (): CombatResultPlayer[] =>
    buildCombatResultsFromAllies(alliesRef.current);

  const checkCombatEnd = (
    nextAllies: CombatPlayerState[] = alliesRef.current,
    nextEnemies: CombatEnemyState[] = enemiesRef.current,
  ) => {
    const evaluation = evaluateCombatEnd({
      allies: nextAllies,
      enemies: nextEnemies,
    });

    if (!evaluation.ended) return false;

    if (evaluation.result === "victory") {
      onWin(buildCombatResultsFromAllies(nextAllies));
      return true;
    }

    if (evaluation.result === "defeat") {
      onDefeat(buildCombatResultsFromAllies(nextAllies));
      return true;
    }

    return false;
  };

  const processEndOfRound = () => {
    if (roundProcessingRef.current) return;
    roundProcessingRef.current = true;

    const roundResult = applyEndOfRoundEffects(
      alliesRef.current,
      enemiesRef.current,
    );
    roundResult.logs.forEach(addLog);

    const nextAllies = roundResult.allies;
    const nextEnemies = roundResult.enemies;

    setAllies(nextAllies);
    setEnemyStates(nextEnemies);

    alliesRef.current = nextAllies;
    enemiesRef.current = nextEnemies;

    const ended = checkCombatEnd(nextAllies, nextEnemies);

    if (!ended) {
      setRoundCount((prev) => prev + 1);
      const rebuilt = buildTurnOrder(nextAllies, nextEnemies);
      setTurnOrder(rebuilt);
      setActiveTurnIndex(0);
      setTurnState("waiting");
    }

    roundProcessingRef.current = false;
  };

  const goToNextTurn = () => {
    if (roundProcessingRef.current) return;
    const nextIndex = activeTurnIndex + 1;

    if (nextIndex >= turnOrder.length) {
      processEndOfRound();
      return;
    }

    setActiveTurnIndex(nextIndex);
    setTurnState("waiting");
  };

  const animateNumberChange = async (
    from: number,
    to: number,
    setter: (value: number) => void,
    duration = 450,
  ) => {
    if (from === to) return;

    const start = performance.now();

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const value = Math.round(from + (to - from) * progress);
        setter(value);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setter(to);
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  };

  const animateEnemyHpLoss = async (enemyId: string, nextHp: number) => {
    const from = displayedEnemyHp[enemyId] ?? nextHp;
    await animateNumberChange(
      from,
      nextHp,
      (value) =>
        setDisplayedEnemyHp((prev) => ({
          ...prev,
          [enemyId]: value,
        })),
      500,
    );
  };

  const animateEnemyShieldLoss = async (
    enemyId: string,
    nextShield: number,
  ) => {
    const from = displayedEnemyShield[enemyId] ?? nextShield;
    await animateNumberChange(
      from,
      nextShield,
      (value) =>
        setDisplayedEnemyShield((prev) => ({
          ...prev,
          [enemyId]: value,
        })),
      350,
    );
  };

  const animateAllyHpLoss = async (playerId: number, nextHp: number) => {
    const from = displayedAlliesHp[playerId] ?? nextHp;
    await animateNumberChange(
      from,
      nextHp,
      (value) =>
        setDisplayedAlliesHp((prev) => ({
          ...prev,
          [playerId]: value,
        })),
      500,
    );
  };

  const animateAllyShieldLoss = async (
    playerId: number,
    nextShield: number,
  ) => {
    const from = displayedAlliesShield[playerId] ?? nextShield;
    await animateNumberChange(
      from,
      nextShield,
      (value) =>
        setDisplayedAlliesShield((prev) => ({
          ...prev,
          [playerId]: value,
        })),
      350,
    );
  };

  const applyPassiveTriggerForAlly = (
    ally: CombatPlayerState,
    trigger:
      | "combat_start"
      | "turn_start"
      | "after_attack"
      | "after_take_damage",
    nextPlayerStats: Stats,
    nextEnemyStats: Enemy,
    currentPlayerStatuses: StatusEffect[],
    currentEnemyStatuses: StatusEffect[],
  ) => {
    const playerPassiveResult = runPassives(ally.player.passives ?? [], {
      player: ally.player,
      enemy: nextEnemyStats,
      playerStats: nextPlayerStats,
      enemyStats: nextEnemyStats,
      playerStatuses: currentPlayerStatuses,
      enemyStatuses: currentEnemyStatuses,
      trigger,
    });

    const enemyPassiveResult = runPassives(nextEnemyStats.passives ?? [], {
      player: ally.player,
      enemy: playerPassiveResult.enemyStats as Enemy,
      playerStats: playerPassiveResult.playerStats,
      enemyStats: playerPassiveResult.enemyStats as Enemy,
      playerStatuses:
        (playerPassiveResult.playerStatuses as StatusEffect[]) ??
        currentPlayerStatuses,
      enemyStatuses:
        (playerPassiveResult.enemyStatuses as StatusEffect[]) ??
        currentEnemyStatuses,
      trigger,
    });

    enemyPassiveResult.logs.forEach(addLog);

    return {
      playerStats: enemyPassiveResult.playerStats,
      enemyStats: enemyPassiveResult.enemyStats as Enemy,
      playerStatuses:
        (enemyPassiveResult.playerStatuses as StatusEffect[]) ??
        currentPlayerStatuses,
      enemyStatuses:
        (enemyPassiveResult.enemyStatuses as StatusEffect[]) ??
        currentEnemyStatuses,
    };
  };

  useEffect(() => {
    const initializedAllies = alliesRef.current.map((ally) => {
      const firstEnemy = enemiesRef.current.find(
        (enemyState) => !enemyState.isDead,
      );
      if (!firstEnemy) return ally;

      const result = applyPassiveTriggerForAlly(
        ally,
        "combat_start",
        ally.stats,
        syncEnemyState(firstEnemy),
        ally.statuses,
        firstEnemy.statuses,
      );

      return {
        ...ally,
        stats: result.playerStats,
        statuses: result.playerStatuses,
        isDead: result.playerStats.hp <= 0,
      };
    });

    setAllies(initializedAllies);
    alliesRef.current = initializedAllies;

    const initialTurnOrder = buildTurnOrder(
      initializedAllies,
      enemiesRef.current,
    );
    setTurnOrder(initialTurnOrder);
    setActiveTurnIndex(0);
    setRoundCount(1);
    setTurnState("waiting");
  }, []);

  const activeTurn = turnOrder[activeTurnIndex];
  const activePlayer =
    activeTurn?.kind === "player"
      ? allies.find((a) => a.playerId === activeTurn.entityId)
      : null;

  const activeEnemy =
    activeTurn?.kind === "enemy"
      ? enemyStates.find(
          (enemyState) => enemyState.enemyId === activeTurn.entityId,
        )
      : null;

  useEffect(() => {
    if (!activeTurn) return;
    if (turnState === "animating") return;

    if (activeTurn.kind === "player") {
      const ally = allies.find((a) => a.playerId === activeTurn.entityId);
      if (!ally || ally.isDead || ally.stats.hp <= 0) {
        const timer = setTimeout(() => {
          goToNextTurn();
        }, 150);
        return () => clearTimeout(timer);
      }
    }

    if (activeTurn.kind === "enemy") {
      const enemyState = enemyStates.find(
        (enemyState) => enemyState.enemyId === activeTurn.entityId,
      );
      if (!enemyState || enemyState.isDead || enemyState.stats.hp <= 0) {
        const timer = setTimeout(() => {
          goToNextTurn();
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTurn, allies, enemyStates, turnState]);

  const [bossPhaseTransition, setBossPhaseTransition] = useState<{
    enemyId: string;
    label: string;
  } | null>(null);

  const unlockedSkills = useMemo(() => {
    if (!activePlayer) return [];
    return getUnlockedSkills(
      activePlayer.player.classType,
      activePlayer.player.level,
    );
  }, [activePlayer]);

  const selectedSkill =
    unlockedSkills.find((skill) => skill.id === selectedSkillId) ||
    unlockedSkills[0];

  const ensureEnemyPlans = () => {
    const livingAllies = alliesRef.current.filter(
      (ally) => !ally.isDead && ally.stats.hp > 0,
    );
    if (!livingAllies.length) return;

    setPlannedEnemyActions((prev) => {
      const next: Record<string, PlannedEnemyAction> = {};
      let changed = false;

      enemiesRef.current.forEach((enemyState) => {
        if (enemyState.isDead || enemyState.stats.hp <= 0) return;

        const existingPlan = prev[enemyState.enemyId];
        if (existingPlan) {
          next[enemyState.enemyId] = existingPlan;
          return;
        }

        const plannedAction = buildPlannedEnemyAction(
          enemyState,
          livingAllies,
          {
            forcedTargetPlayerId:
              forcedTargetTurns > 0 ? forcedTargetPlayerId : null,
          },
        );
        if (plannedAction) {
          next[enemyState.enemyId] = plannedAction;
          changed = true;
        }
      });

      if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
      return changed ? next : prev;
    });
  };

  useEffect(() => {
    if (!activeTurn || activeTurn.kind !== "player" || turnState !== "waiting")
      return;
    ensureEnemyPlans();
  }, [
    activeTurn,
    turnState,
    allies,
    enemyStates,
    forcedTargetPlayerId,
    forcedTargetTurns,
  ]);

  const enemyIntentions = useMemo<EnemyIntentionView[]>(
    () =>
      buildEnemyIntentions({
        allies,
        enemyStates,
        plannedEnemyActions,
        statusLabelMap: STATUS_LABELS,
      }),
    [allies, enemyStates, plannedEnemyActions],
  );

  const getEnemyIntention = (enemyId: string) =>
    enemyIntentions.find((intention) => intention.enemyId === enemyId);

  const doEnemyTurn = async () => {
    if (!activeEnemy || turnState === "animating") return;
    setTurnState("animating");

    const livingAllies = alliesRef.current.filter((a) => !a.isDead);
    if (livingAllies.length === 0) {
      onDefeat(buildCombatResults());
      return;
    }

    const actingEnemyState = enemiesRef.current.find(
      (enemyState) => enemyState.enemyId === activeEnemy.enemyId,
    );
    if (!actingEnemyState || actingEnemyState.isDead) {
      goToNextTurn();
      return;
    }

    const plannedAction =
      plannedEnemyActionsRef.current[actingEnemyState.enemyId] ??
      buildPlannedEnemyAction(actingEnemyState, livingAllies, {
        forcedTargetPlayerId:
          forcedTargetTurns > 0 ? forcedTargetPlayerId : null,
      });

    if (!plannedAction) {
      goToNextTurn();
      return;
    }

    dispatchCombatAction({
      type: "EXECUTE_ENEMY_TURN",
      enemyId: actingEnemyState.enemyId,
      plan: plannedAction,
    });

    let actingEnemy: Enemy = {
      ...plannedAction.enemy,
      hp: actingEnemyState.stats.hp,
      maxHp: actingEnemyState.stats.maxHp,
    };
    let actingEnemyStatuses = [...plannedAction.enemyStatuses];

    setEnemyStates((prev) =>
      prev.map((enemyState) =>
        enemyState.enemyId === actingEnemyState.enemyId
          ? {
              ...enemyState,
              enemy: actingEnemy,
              stats: {
                ...enemyState.stats,
                hp: actingEnemy.hp,
                maxHp: actingEnemy.maxHp,
                strength: actingEnemy.strength,
                magic: actingEnemy.magic,
                defense: actingEnemy.defense,
                speed: actingEnemy.speed,
              },
              statuses: actingEnemyStatuses,
            }
          : enemyState,
      ),
    );

    enemiesRef.current = enemiesRef.current.map((enemyState) =>
      enemyState.enemyId === actingEnemyState.enemyId
        ? {
            ...enemyState,
            enemy: actingEnemy,
            stats: {
              ...enemyState.stats,
              hp: actingEnemy.hp,
              maxHp: actingEnemy.maxHp,
              strength: actingEnemy.strength,
              magic: actingEnemy.magic,
              defense: actingEnemy.defense,
              speed: actingEnemy.speed,
            },
            statuses: actingEnemyStatuses,
          }
        : enemyState,
    );

    plannedAction.logs.forEach(addLog);

    const attack = plannedAction.attack;

    const targetSelection = pickEnemyTargetIds({
      targetScope: attack.targetScope,
      plannedTargetIds: plannedAction.targetIds,
      livingAllies,
    });
    const targetIds = targetSelection.targetIds;

    if (targetSelection.usedFallback && targetSelection.fallbackTargetName) {
      addLog(
        `🎯 La cible prévue n'est plus disponible : ${actingEnemy.name} se rabat sur ${targetSelection.fallbackTargetName}.`,
      );
    }

    setEnemyAttackBanner({
      name: attack.name,
      description: attack.description,
      kind: attack.kind,
      enemyName: actingEnemy.name,
    });

    triggerShake("enemy");
    await sleep(450);

    if (attack.skipDamage) {
      addLog(`👹 ${actingEnemy.name} utilise ${attack.name}.`);
      setEnemyAttackBanner(null);
      setPlannedEnemyActions((prev) => {
        const next = { ...prev };
        delete next[actingEnemyState.enemyId];
        plannedEnemyActionsRef.current = next;
        return next;
      });
      await sleep(250);
      goToNextTurn();
      return;
    }

    const workingAllies = alliesRef.current.map((ally) => ({
      ...ally,
      stats: { ...ally.stats },
      statuses: [...ally.statuses],
    }));

    let totalHealForEnemy = 0;

    for (const targetId of targetIds) {
      const allyIndex = workingAllies.findIndex(
        (ally) => ally.playerId === targetId,
      );
      if (allyIndex === -1) continue;

      let ally = workingAllies[allyIndex];
      if (ally.isDead) continue;

      const hitCount = Math.max(1, attack.hitCount ?? 1);
      let accumulatedDamageTaken = 0;
      let localStatuses = [...ally.statuses];
      let localStats = { ...ally.stats };
      let wasCrit = false;

      for (let hit = 0; hit < hitCount; hit++) {
        if (localStats.hp <= 0) break;

        const attackResult = resolveEnemyAttackAgainstPlayer({
          attack,
          enemy: actingEnemy,
          targetStats: localStats,
          targetStatuses: localStatuses,
          targetDefending: ally.defending,
        });

        wasCrit = wasCrit || attackResult.crit;
        accumulatedDamageTaken += attackResult.hpLost;
        localStats = attackResult.stats;
        localStatuses = attackResult.statuses;

        if (attackResult.markedConsumed) {
          addLog(`🎯 ${ally.player.name} était marqué : dégâts subis x2.`);
          spawnFloatingText(ally.playerId, "MARQUÉ x2", "damage");
        }

        if (attackResult.absorbed > 0) {
          spawnFloatingText(
            ally.playerId,
            `-${attackResult.absorbed}`,
            "shield",
          );
          addLog(
            `🛡️ Le bouclier de ${ally.player.name} absorbe ${attackResult.absorbed} dégâts.`,
          );
          await animateAllyShieldLoss(ally.playerId, attackResult.shieldAfter);
          await sleep(120);
        }

        if (attackResult.remainingDamage > 0) {
          spawnFloatingText(
            ally.playerId,
            attackResult.crit
              ? `-${attackResult.remainingDamage} CRIT`
              : `-${attackResult.remainingDamage}`,
            "damage",
          );

          triggerShake("player");
          await animateAllyHpLoss(ally.playerId, localStats.hp);
          await sleep(150);
        }
      }

      if (
        attack.statusEffect &&
        (attack.statusEffect.target === "player" ||
          attack.statusEffect.target === "all_players")
      ) {
        localStatuses = addStatus(localStatuses, {
          type: attack.statusEffect.type,
          value: attack.statusEffect.value,
          duration: attack.statusEffect.duration,
          source: attack.name,
        });
      }

      localStats = {
        ...localStats,
        mana: attack.manaBurn
          ? Math.max(0, localStats.mana - attack.manaBurn)
          : localStats.mana,
      };

      const terrainTurnResult = applyTerrainEffectsEachTurn(
        localStats,
        terrainEffects,
      );
      localStats = terrainTurnResult.stats;
      terrainTurnResult.logs.forEach((log) =>
        addLog(`🌫️ ${ally.player.name} — ${log}`),
      );

      const passiveResult = applyPassiveTriggerForAlly(
        ally,
        "after_take_damage",
        localStats,
        actingEnemy,
        localStatuses,
        actingEnemyStatuses,
      );

      localStats = passiveResult.playerStats;
      localStatuses =
        (passiveResult.playerStatuses as StatusEffect[]) ?? localStatuses;
      actingEnemy = passiveResult.enemyStats as Enemy;
      actingEnemyStatuses =
        (passiveResult.enemyStatuses as StatusEffect[]) ?? actingEnemyStatuses;

      if (attack.selfHealPercent && accumulatedDamageTaken > 0) {
        totalHealForEnemy += Math.max(
          1,
          Math.floor(accumulatedDamageTaken * attack.selfHealPercent),
        );
      }

      const targetScopeText =
        attack.targetScope === "all_players" ? " (attaque de zone)" : "";

      addLog(
        `👹 ${actingEnemy.name} utilise ${attack.name} sur ${ally.player.name} : -${accumulatedDamageTaken} PV${targetScopeText}${
          wasCrit ? " 💥 CRITIQUE !" : ""
        }${attack.manaBurn ? ` -${attack.manaBurn} Mana` : ""}`,
      );

      workingAllies[allyIndex] = {
        ...ally,
        stats: localStats,
        statuses: localStatuses,
        isDead: localStats.hp <= 0,
      };
    }

    if (totalHealForEnemy > 0) {
      actingEnemy = {
        ...actingEnemy,
        hp: Math.min(actingEnemy.maxHp, actingEnemy.hp + totalHealForEnemy),
      };
      spawnFloatingText(
        actingEnemyState.enemyId,
        `+${totalHealForEnemy}`,
        "heal",
      );
      addLog(`🩸 ${actingEnemy.name} récupère ${totalHealForEnemy} PV.`);
    }

    if (attack.statusEffect && attack.statusEffect.target === "enemy") {
      actingEnemyStatuses = addStatus(actingEnemyStatuses, {
        type: attack.statusEffect.type,
        value: attack.statusEffect.value,
        duration: attack.statusEffect.duration,
        source: attack.name,
      });
    }

    const updatedEnemies = enemiesRef.current.map((enemyState) =>
      enemyState.enemyId === actingEnemyState.enemyId
        ? {
            ...enemyState,
            enemy: actingEnemy,
            stats: {
              ...enemyState.stats,
              hp: actingEnemy.hp,
              maxHp: actingEnemy.maxHp,
              strength: actingEnemy.strength,
              magic: actingEnemy.magic,
              defense: actingEnemy.defense,
              speed: actingEnemy.speed,
            },
            statuses: actingEnemyStatuses,
            isDead: actingEnemy.hp <= 0,
          }
        : enemyState,
    );

    setAllies(workingAllies);
    alliesRef.current = workingAllies;

    setEnemyStates(updatedEnemies);
    enemiesRef.current = updatedEnemies;

    setEnemyAttackBanner(null);

    setPlannedEnemyActions((prev) => {
      const next = { ...prev };
      delete next[actingEnemyState.enemyId];
      plannedEnemyActionsRef.current = next;
      return next;
    });

    if (checkCombatEnd(workingAllies, updatedEnemies)) return;

    consumeForcedTargetTurn();
    await sleep(250);
    dispatchCombatAction({ type: "END_ENEMY_TURN", enemyId: actingEnemyState.enemyId });
    goToNextTurn();
  };

  const handleAction = async (
    action: "attack" | "special" | "defend" | "flee",
  ) => {
    let didCrit = false;

    if (
      !activeTurn ||
      activeTurn.kind !== "player" ||
      turnState === "animating"
    )
      return;

    const actingAlly = alliesRef.current.find(
      (a) => a.playerId === activeTurn.entityId,
    );
    if (!actingAlly || actingAlly.isDead) return;

    const currentTarget = selectedEnemy;
    if (!currentTarget || currentTarget.isDead) {
      addLog("❌ Aucune cible ennemie disponible.");
      return;
    }

    if (action === "attack") {
      dispatchCombatAction({
        type: "PLAYER_BASIC_ATTACK",
        playerId: actingAlly.playerId,
        targetEnemyId: currentTarget.enemyId,
      });
    }

    if (action === "special") {
      dispatchCombatAction({
        type: "PLAYER_USE_SKILL",
        playerId: actingAlly.playerId,
        targetEnemyId: currentTarget.enemyId,
        skillId: selectedSkillId,
        skill: selectedSkill
          ? { name: selectedSkill.name, manaCost: selectedSkill.manaCost }
          : undefined,
      });
    }

    if (action === "defend") {
      dispatchCombatAction({ type: "PLAYER_DEFEND", playerId: actingAlly.playerId });
    }

    if (action === "flee") {
      dispatchCombatAction({ type: "PLAYER_FLEE", playerId: actingAlly.playerId });
    }

    let currentStatuses = actingAlly.statuses;

    const modifiedPlayerStats = applyStatusModifiersToStats({
      ...actingAlly.stats,
      hp: actingAlly.stats.hp,
      statuses: currentStatuses,
    });

    let currentStats: Stats = {
      hp: modifiedPlayerStats.hp,
      maxHp: modifiedPlayerStats.maxHp,
      mana: modifiedPlayerStats.mana,
      maxMana: modifiedPlayerStats.maxMana,
      strength: modifiedPlayerStats.strength,
      magic: modifiedPlayerStats.magic,
      defense: modifiedPlayerStats.defense,
      speed: modifiedPlayerStats.speed,
    };

    const nextAlliesAfterSelfUpdate = alliesRef.current.map((ally) =>
      ally.playerId === actingAlly.playerId
        ? {
            ...ally,
            stats: currentStats,
            statuses: currentStatuses,
            isDead: currentStats.hp <= 0,
          }
        : ally,
    );

    setAllies(nextAlliesAfterSelfUpdate);
    alliesRef.current = nextAlliesAfterSelfUpdate;

    if (currentStats.hp <= 0) {
      if (checkCombatEnd(nextAlliesAfterSelfUpdate, enemiesRef.current)) return;
      goToNextTurn();
      return;
    }

    const currentEnemyBase = applyStatusModifiersToStats({
      ...syncEnemyState(currentTarget),
      statuses: currentTarget.statuses,
    });

    const startTurnResult = applyPassiveTriggerForAlly(
      actingAlly,
      "turn_start",
      currentStats,
      currentEnemyBase,
      currentStatuses,
      currentTarget.statuses,
    );

    currentStats = startTurnResult.playerStats;
    currentStatuses = startTurnResult.playerStatuses;
    let currentEnemyStats = startTurnResult.enemyStats;
    let currentEnemyStatuses = startTurnResult.enemyStatuses;

    setEnemyStates((prev) =>
      prev.map((enemyState) =>
        enemyState.enemyId === currentTarget.enemyId
          ? {
              ...enemyState,
              enemy: currentEnemyStats,
              stats: {
                ...enemyState.stats,
                hp: currentEnemyStats.hp,
                maxHp: currentEnemyStats.maxHp,
                strength: currentEnemyStats.strength,
                magic: currentEnemyStats.magic,
                defense: currentEnemyStats.defense,
                speed: currentEnemyStats.speed,
              },
              statuses: currentEnemyStatuses,
              isDead: currentEnemyStats.hp <= 0,
            }
          : enemyState,
      ),
    );

    enemiesRef.current = enemiesRef.current.map((enemyState) =>
      enemyState.enemyId === currentTarget.enemyId
        ? {
            ...enemyState,
            enemy: currentEnemyStats,
            stats: {
              ...enemyState.stats,
              hp: currentEnemyStats.hp,
              maxHp: currentEnemyStats.maxHp,
              strength: currentEnemyStats.strength,
              magic: currentEnemyStats.magic,
              defense: currentEnemyStats.defense,
              speed: currentEnemyStats.speed,
            },
            statuses: currentEnemyStatuses,
            isDead: currentEnemyStats.hp <= 0,
          }
        : enemyState,
    );

    if (action === "defend") {
      const defendedStats: Stats = {
        ...currentStats,
        mana: Math.min(currentStats.maxMana, currentStats.mana + 6),
      };

      addLog(
        `🛡️ ${actingAlly.player.name} se met en garde : +6 mana, dégâts directs réduits`,
      );
      spawnFloatingText(actingAlly.playerId, "+6 mana", "mana");

      const updatedAllies = alliesRef.current.map((ally) =>
        ally.playerId === actingAlly.playerId
          ? {
              ...ally,
              stats: defendedStats,
              statuses: currentStatuses,
              defending: true,
            }
          : ally,
      );

      setAllies(updatedAllies);
      alliesRef.current = updatedAllies;

      await sleep(250);

      if (!checkCombatEnd(updatedAllies, enemiesRef.current)) goToNextTurn();
      return;
    }

    if (action === "flee") {
      addLog(`🏃 ${actingAlly.player.name} fuit le combat !`);
      onFlee(buildCombatResults());
      return;
    }

    setTurnState("animating");

    let dmg = 0;
    let logMsg = "";
    let manaCost = 0;

    if (action === "attack") {
      const result = resolvePlayerBasicAttack({
        playerName: actingAlly.player.name,
        stats: currentStats,
        enemy: currentEnemyStats,
        enemyStatuses: currentEnemyStatuses,
      });

      didCrit = result.crit;
      dmg = result.damage;
      logMsg = result.logMessage;
    }

    if (action === "special") {
      if (!selectedSkill) {
        addLog("❌ Aucun sort disponible.");
        setTurnState("waiting");
        return;
      }

      manaCost = selectedSkill.manaCost;

      if (currentStats.mana < manaCost) {
        addLog(`❌ ${actingAlly.player.name} n'a pas assez de mana !`);
        setTurnState("waiting");
        return;
      }

      const result = resolvePlayerSkill({
        skill: selectedSkill,
        playerName: actingAlly.player.name,
        stats: currentStats,
        enemy: currentEnemyStats,
        playerStatuses: currentStatuses,
        enemyStatuses: currentEnemyStatuses,
      });

      didCrit = result.crit;
      dmg = result.damage;

      if (result.triggeredConditions.length > 0) {
        addLog(
          `✨ ${actingAlly.player.name} renforce ${selectedSkill.name} : ${result.triggeredConditions.join(", ")}`,
        );
      }

      logMsg = result.logMessage;
    }

    let nextPlayerStats: Stats =
      manaCost > 0
        ? { ...currentStats, mana: currentStats.mana - manaCost }
        : currentStats;

    let updatedPlayerStatuses = [...currentStatuses];
    let updatedEnemyStatuses = [...currentEnemyStatuses];

    if (action === "special" && selectedSkill?.extraEffects) {
      for (const effect of selectedSkill.extraEffects) {
        if (effect.type === "taunt") {
          setForcedTargetPlayerId(actingAlly.playerId);
          setForcedTargetTurns(effect.duration);
          addLog(
            `📣 ${actingAlly.player.name} provoque l'ennemi - ${effect.duration} tours`,
          );
        }

        if (effect.type === "grant_shield_self") {
          updatedPlayerStatuses = addStatus(updatedPlayerStatuses, {
            type: "shield",
            value: effect.value,
            duration: effect.duration ?? 2,
            source: selectedSkill.name,
          });

          addLog(
            `🛡️ ${actingAlly.player.name} gagne ${effect.value} de bouclier.`,
          );
          spawnFloatingText(actingAlly.playerId, `+${effect.value}`, "shield");
        }

        if (effect.type === "grant_shield_team") {
          const updatedAllies = alliesRef.current.map((ally) => ({
            ...ally,
            statuses: addStatus(ally.statuses, {
              type: "shield",
              value: effect.value,
              duration: effect.duration ?? 2,
              source: selectedSkill.name,
            }),
          }));

          setAllies(updatedAllies);
          alliesRef.current = updatedAllies;

          updatedPlayerStatuses = addStatus(updatedPlayerStatuses, {
            type: "shield",
            value: effect.value,
            duration: effect.duration ?? 2,
            source: selectedSkill.name,
          });

          updatedAllies.forEach((ally) => {
            spawnFloatingText(ally.playerId, `+${effect.value}`, "shield");
          });

          addLog(
            `🛡️ ${actingAlly.player.name} accorde ${effect.value} de bouclier à toute l'équipe.`,
          );
        }

        if (effect.type === "apply_status") {
          const chanceOk = shouldApplyChance(effect.chance);

          if (chanceOk && effect.target === "enemy") {
            updatedEnemyStatuses = addStatus(updatedEnemyStatuses, {
              type: effect.status,
              value: effect.value,
              duration: effect.duration,
              source: selectedSkill.name,
            });
            addLog(
              `☠️ ${selectedSkill.name} applique ${effect.status} à ${currentEnemyStats.name}`,
            );
          }

          if (chanceOk && effect.target === "player") {
            updatedPlayerStatuses = addStatus(updatedPlayerStatuses, {
              type: effect.status,
              value: effect.value,
              duration: effect.duration,
              source: selectedSkill.name,
            });
            addLog(
              `✨ ${selectedSkill.name} applique ${effect.status} à ${actingAlly.player.name}`,
            );
          }
        }

        if (effect.type === "heal_self") {
          let heal = 0;
          if (effect.percentDamageDealt)
            heal += Math.floor(dmg * effect.percentDamageDealt);
          if (effect.flat) heal += effect.flat;

          if (heal > 0) {
            const healing = applyHealingToStats({
              stats: nextPlayerStats,
              amount: heal,
            });
            nextPlayerStats = healing.stats;
            addLog(`💚 ${actingAlly.player.name} récupère ${healing.healed} PV`);
            spawnFloatingText(actingAlly.playerId, `+${healing.healed}`, "heal");
            await sleep(250);
          }
        }
      }
    }

    const enemyDamageResult = applyIncomingDamageToStats({
      stats: currentEnemyStats,
      statuses: updatedEnemyStatuses,
      damage: dmg,
    });

    updatedEnemyStatuses = enemyDamageResult.statuses;

    if (enemyDamageResult.markedConsumed) {
      addLog(`🎯 ${currentEnemyStats.name} était marqué : dégâts subis x2.`);
      spawnFloatingText(currentTarget.enemyId, "MARQUÉ x2", "damage");
    }

    const nextEnemyStats: Enemy = {
      ...currentEnemyStats,
      hp: enemyDamageResult.stats.hp,
      statuses: updatedEnemyStatuses,
    };

    const phaseTransition = applyFeralHeartPhaseTransition(nextEnemyStats);
    const transformedEnemyStats = phaseTransition.enemy;

    if (phaseTransition.transitioned) {
      setBossPhaseTransition({
        enemyId: currentTarget.enemyId,
        label: "FURIE",
      });

      window.setTimeout(() => {
        setBossPhaseTransition(null);
      }, 1800);

      addLog("🔥 Le Cœur sauvage passe en Furie !");
    }

    if (enemyDamageResult.absorbed > 0) {
      spawnFloatingText(
        currentTarget.enemyId,
        `-${enemyDamageResult.absorbed}`,
        "shield",
      );
      addLog(
        `🛡️ Le bouclier de ${currentEnemyStats.name} absorbe ${enemyDamageResult.absorbed} dégâts.`,
      );
      await animateEnemyShieldLoss(currentTarget.enemyId, enemyDamageResult.shieldAfter);
      await sleep(180);
    }

    if (enemyDamageResult.remainingDamage > 0) {
      spawnFloatingText(
        currentTarget.enemyId,
        didCrit
          ? `-${enemyDamageResult.remainingDamage} CRIT`
          : `-${enemyDamageResult.remainingDamage}`,
        "damage",
      );

      triggerShake("enemy");
      await animateEnemyHpLoss(currentTarget.enemyId, nextEnemyStats.hp);
      await sleep(250);
    }

    if (action === "attack") {
      logMsg = `⚔️ ${actingAlly.player.name} attaque ${currentEnemyStats.name} : -${enemyDamageResult.remainingDamage} PV${
        enemyDamageResult.absorbed > 0
          ? ` (${enemyDamageResult.absorbed} absorbés)`
          : ""
      }${didCrit ? " 💥 CRITIQUE !" : ""}`;
    }

    if (action === "special" && selectedSkill) {
      logMsg = `${selectedSkill.icon} ${actingAlly.player.name} — ${selectedSkill.name} sur ${currentEnemyStats.name} : -${enemyDamageResult.remainingDamage} PV${
        enemyDamageResult.absorbed > 0
          ? ` (${enemyDamageResult.absorbed} absorbés)`
          : ""
      }${didCrit ? " 💥 CRITIQUE !" : ""}`;
    }

    const afterAttackResult = applyPassiveTriggerForAlly(
      actingAlly,
      "after_attack",
      nextPlayerStats,
      nextEnemyStats,
      updatedPlayerStatuses,
      updatedEnemyStatuses,
    );

    const updatedAllies = alliesRef.current.map((ally) =>
      ally.playerId === actingAlly.playerId
        ? {
            ...ally,
            stats: afterAttackResult.playerStats,
            statuses: afterAttackResult.playerStatuses,
            isDead: afterAttackResult.playerStats.hp <= 0,
            defending: false,
          }
        : ally,
    );

    const updatedEnemies = enemiesRef.current.map((enemyState) =>
      enemyState.enemyId === currentTarget.enemyId
        ? {
            ...enemyState,
            enemy: afterAttackResult.enemyStats,
            stats: {
              ...enemyState.stats,
              hp: afterAttackResult.enemyStats.hp,
              maxHp: afterAttackResult.enemyStats.maxHp,
              strength: afterAttackResult.enemyStats.strength,
              magic: afterAttackResult.enemyStats.magic,
              defense: afterAttackResult.enemyStats.defense,
              speed: afterAttackResult.enemyStats.speed,
            },
            statuses: afterAttackResult.enemyStatuses,
            isDead: afterAttackResult.enemyStats.hp <= 0,
          }
        : enemyState,
    );

    setAllies(updatedAllies);
    alliesRef.current = updatedAllies;

    setEnemyStates(updatedEnemies);
    enemiesRef.current = updatedEnemies;

    addLog(logMsg);

    if (checkCombatEnd(updatedAllies, updatedEnemies)) return;

    await sleep(250);
    dispatchCombatAction({ type: "END_PLAYER_TURN", playerId: actingAlly.playerId });
    goToNextTurn();
  };

  useEffect(() => {
    if (!activeTurn) return;
    if (activeTurn.kind !== "enemy") return;
    if (turnState === "animating") return;

    const timer = setTimeout(() => {
      doEnemyTurn();
    }, 700);

    return () => clearTimeout(timer);
  }, [activeTurn, turnState]);

  const renderStatusBadges = (statuses: StatusEffect[]) => (
    <StatusBadges statuses={statuses} />
  );

  const renderPlayerCard = (ally: CombatPlayerState) => {
    const isActive =
      activeTurn?.kind === "player" && activeTurn.entityId === ally.playerId;
    const shieldValue =
      displayedAlliesShield[ally.playerId] ?? getCombatShieldValue(ally.statuses);
    const isForcedTarget =
      forcedTargetPlayerId === ally.playerId && forcedTargetTurns > 0;

    return (
      <div
        key={ally.playerId}
        className={`rounded-2xl border p-3 xl:p-4 transition-all ${
          ally.isDead
            ? "bg-red-950/20 border-red-900 opacity-60"
            : isActive
              ? "bg-violet-950/40 border-violet-400 shadow-[0_0_22px_rgba(168,85,247,0.35)] scale-[1.01]"
              : "bg-[#1b0a3d]/75 border-violet-900"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-xl overflow-hidden border border-violet-700 bg-black/30 shrink-0 flex items-center justify-center">
              {ally.player.portrait || ally.player.image ? (
                <img
                  src={ally.player.portrait || ally.player.image}
                  alt={ally.player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xl">
                  {getClassFallbackIcon(ally.player.classType)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs xl:text-sm font-bold text-violet-100 truncate">
                {ally.player.name}
              </div>
              <div className="text-[11px] xl:text-xs text-violet-300">
                {ally.player.classType}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isActive && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-violet-400 bg-violet-500/20 text-violet-100">
                À jouer
              </span>
            )}
            {ally.defending && !ally.isDead && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-sky-500 bg-sky-500/20 text-sky-100">
                Garde
              </span>
            )}
            {isForcedTarget && !ally.isDead && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-rose-500 bg-rose-500/20 text-rose-100">
                Ciblé
              </span>
            )}
            {ally.isDead && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-red-500 bg-red-500/20 text-red-100">
                Mort
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div>
            {shieldValue > 0 && (
              <div>
                <div className="flex justify-between text-[11px] text-sky-200 mb-1">
                  <span>Bouclier</span>
                  <span>{shieldValue}</span>
                </div>
                <div className="h-2 rounded bg-black/40 overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: "100%",
                      background:
                        "linear-gradient(90deg, rgba(56,189,248,0.95) 0%, rgba(125,211,252,1) 100%)",
                    }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-red-200 mb-1">
              <span>PV</span>
              <span>
                {displayedAlliesHp[ally.playerId] ?? ally.stats.hp}/
                {ally.stats.maxHp}
              </span>
            </div>
            <div className="h-2 rounded bg-black/40 overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${
                    ally.stats.maxHp > 0
                      ? ((displayedAlliesHp[ally.playerId] ?? ally.stats.hp) /
                          ally.stats.maxHp) *
                        100
                      : 0
                  }%`,
                  background:
                    "linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(248,113,113,1) 100%)",
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-blue-200 mb-1">
              <span>Mana</span>
              <span>
                {ally.stats.mana}/{ally.stats.maxMana}
              </span>
            </div>
            <div className="h-2 rounded bg-black/40 overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${ally.stats.maxMana > 0 ? (ally.stats.mana / ally.stats.maxMana) * 100 : 0}%`,
                  background:
                    "linear-gradient(90deg, rgba(37,99,235,0.95) 0%, rgba(96,165,250,1) 100%)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-gray-300">
          <div>FOR {ally.stats.strength}</div>
          <div>MAG {ally.stats.magic}</div>
          <div>DEF {ally.stats.defense}</div>
          <div>VIT {ally.stats.speed}</div>
        </div>

        {renderStatusBadges(ally.statuses)}
      </div>
    );
  };

  const renderEnemyMiniCard = (enemyState: CombatEnemyState) => {
    const selected = selectedEnemyId === enemyState.enemyId;
    const active =
      activeTurn?.kind === "enemy" &&
      activeTurn.entityId === enemyState.enemyId;
    const shieldValue =
      displayedEnemyShield[enemyState.enemyId] ??
      getCombatShieldValue(enemyState.statuses);
    const intention = getEnemyIntention(enemyState.enemyId);

    return (
      <button
        key={enemyState.enemyId}
        onClick={() =>
          !enemyState.isDead && selectEnemyTarget(enemyState.enemyId)
        }
        disabled={enemyState.isDead}
        className={`min-w-[220px] rounded-xl border p-2 text-left transition-all md:min-w-0 ${
          enemyState.isDead
            ? "opacity-40 border-red-950 bg-red-950/10"
            : selected
              ? "border-red-400 bg-red-950/20 shadow-[0_0_18px_rgba(248,113,113,0.25)]"
              : "border-violet-800 bg-[#160a28]/80 hover:border-violet-500"
        } ${active ? "ring-2 ring-amber-400/70" : ""}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-violet-700 bg-black/30 shrink-0 flex items-center justify-center">
            {enemyState.enemy.image ? (
              <img
                src={getDisplayedEnemyImage(enemyState)}
                alt={enemyState.enemy.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-lg">👹</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-violet-100 truncate">
              {enemyState.enemy.name}
            </div>
            <div className="text-[10px] text-violet-300">
              {enemyState.enemy.archetype}
            </div>

            {intention && !enemyState.isDead && (
              <div
                className="mt-1 text-[10px] text-amber-200 truncate"
                title={intention.description}
              >
                {intention.icon} {intention.actionName}
              </div>
            )}

            <div className="mt-1 h-1.5 rounded bg-black/40 overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${
                    enemyState.stats.maxHp > 0
                      ? ((displayedEnemyHp[enemyState.enemyId] ??
                          enemyState.stats.hp) /
                          enemyState.stats.maxHp) *
                        100
                      : 0
                  }%`,
                  background:
                    "linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(248,113,113,1) 100%)",
                }}
              />
            </div>

            {shieldValue > 0 && (
              <div className="text-[10px] text-sky-300 mt-1">
                Bouclier {shieldValue}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderFloatingTexts = () => {
    return floatingTexts.map((entry) => {
      const toneClass =
        entry.tone === "damage"
          ? "text-red-300"
          : entry.tone === "heal"
            ? "text-emerald-300"
            : entry.tone === "shield"
              ? "text-sky-300"
              : "text-blue-300";

      const targetEnemyState =
        typeof entry.target === "string"
          ? enemiesRef.current.find(
              (enemyState) => enemyState.enemyId === entry.target,
            )
          : null;

      return (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: -24, scale: 1 }}
          exit={{ opacity: 0, y: -38, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`absolute z-[130] pointer-events-none font-bold text-lg drop-shadow ${toneClass}`}
          style={
            typeof entry.target === "string"
              ? {
                  top: "185px",
                  left: "36%",
                }
              : {
                  left: "120px",
                  bottom: "140px",
                }
          }
        >
          {entry.text}
        </motion.div>
      );
    });
  };

  const isSelectedEnemyEnraged =
    !!selectedEnemy &&
    selectedEnemy.enemy.isBoss &&
    selectedEnemy.enemy.bossMechanic === "feral_heart" &&
    selectedEnemy.enemy.bossState?.phase === 2;

  const selectedEnemyShield = selectedEnemy
    ? (displayedEnemyShield[selectedEnemy.enemyId] ??
      getCombatShieldValue(selectedEnemy.statuses))
    : 0;
  const selectedEnemyIntention = selectedEnemy
    ? getEnemyIntention(selectedEnemy.enemyId)
    : null;
  const getDisplayedEnemyImage = (enemyState: CombatEnemyState) => {
    const enemy = enemyState.enemy;
    const isPhaseTwo =
      enemy.isBoss &&
      enemy.bossMechanic === "feral_heart" &&
      enemy.bossState?.phase === 2;

    if (isPhaseTwo && enemy.phaseTwoImage) {
      return enemy.phaseTwoImage;
    }

    return enemy.image;
  };

  const activeTurnLabel =
    activeTurn?.kind === "player"
      ? (allies.find((a) => a.playerId === activeTurn.entityId)?.player.name ??
        "Allié")
      : (enemyStates.find(
          (enemyState) => enemyState.enemyId === activeTurn?.entityId,
        )?.enemy.name ?? "Ennemi");

  const actionsPanel = (
    <CombatActionsPanel
      canAct={Boolean(
        activePlayer &&
          !activePlayer.isDead &&
          activeTurn?.kind === "player",
      )}
      selectedEnemyName={selectedEnemy?.enemy.name}
      selectedEnemyIsDead={selectedEnemy?.isDead}
      turnState={turnState}
      selectedSkill={selectedSkill}
      unlockedSkills={unlockedSkills}
      activeMana={activePlayer?.stats.mana ?? 0}
      onAction={handleAction}
      onSelectSkill={selectPlayerSkill}
    />
  );

  const logPanel = <CombatLogPanel logs={logs} />;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center px-0 py-0 md:px-3 md:py-3 xl:px-4 xl:py-6 overflow-hidden">
      <AnimatePresence>{renderFloatingTexts()}</AnimatePresence>

      <EnemyAttackBanner banner={enemyAttackBanner} />
      <BossPhaseTransition transition={bossPhaseTransition} />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={isMobile
          ? "flex h-full w-full flex-col overflow-hidden border-0 bg-[#12081d] pb-24 shadow-[0_0_35px_rgba(88,28,135,0.35)]"
          : "w-[min(96vw,1350px)] h-[min(92vh,860px)] rounded-3xl border border-violet-700 bg-[#12081d] shadow-[0_0_35px_rgba(88,28,135,0.35)] overflow-hidden flex flex-col"
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-0 flex-1 min-h-0">
          <div className="min-h-0 overflow-y-auto border-b border-violet-900/60 p-3 pb-4 md:p-4 xl:border-b-0 xl:border-r xl:p-5">
            <div className="mb-3 flex items-start justify-between gap-3 md:mb-5 md:gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-violet-400">
                  Combat
                </div>
                <div className="mt-1 font-fantasy text-2xl text-violet-100 md:text-3xl">
                  Round {displayRound}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-400">Tour actuel</div>
                <div className="text-sm font-bold text-violet-100">
                  {activeTurnLabel}
                </div>
              </div>
            </div>

            {isMobile && (
              <MobileCombatLayout
                round={displayRound}
                activeTurnLabel={activeTurnLabel}
                selectedTargetLabel={selectedEnemy?.enemy.name}
                onOpenIntentions={() => setMobileIntentionsOpen(true)}
                onOpenLog={() => setMobileLogOpen(true)}
              />
            )}

            {enemyStates.length > 1 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-[0.18em] text-violet-400 mb-2">
                  Ennemis présents
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-2 xl:grid-cols-3">
                  {enemyStates.map(renderEnemyMiniCard)}
                </div>
              </div>
            )}

            <div className="mb-4 hidden md:block">
              <EnemyIntentionsPanel
                intentions={enemyIntentions}
                selectedEnemyId={selectedEnemyId}
                onSelectEnemy={selectEnemyTarget}
              />
            </div>

            {selectedEnemy && (
              <div
                className={`rounded-2xl border p-5 mb-5 transition-all duration-500 ${
                  shake === "enemy"
                    ? "border-red-500 bg-red-950/20"
                    : isSelectedEnemyEnraged
                      ? "border-orange-400 bg-orange-950/20 shadow-[0_0_28px_rgba(251,146,60,0.30)]"
                      : "border-violet-800 bg-[#1b0a3d]/70"
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-20 shrink-0 md:w-24 xl:w-28">
                    <div className="rounded-2xl border border-violet-700 bg-black/30 p-2 shadow-inner">
                      <div className="aspect-square overflow-hidden rounded-xl bg-black/40 flex items-center justify-center">
                        {getDisplayedEnemyImage(selectedEnemy) ? (
                          <AnimatePresence mode="wait">
                            <motion.img
                              key={getDisplayedEnemyImage(selectedEnemy)}
                              src={getDisplayedEnemyImage(selectedEnemy)}
                              alt={selectedEnemy.enemy.name}
                              initial={{
                                opacity: 0.35,
                                scale: 0.9,
                                rotate: -2,
                              }}
                              animate={
                                isSelectedEnemyEnraged
                                  ? {
                                      opacity: 1,
                                      scale: [1, 1.04, 1],
                                      rotate: [0, -1, 1, 0],
                                      filter: [
                                        "saturate(1.05) contrast(1.05) drop-shadow(0 0 0px rgba(255,80,80,0))",
                                        "saturate(1.35) contrast(1.2) drop-shadow(0 0 18px rgba(255,80,80,0.55))",
                                        "saturate(1.2) contrast(1.1) drop-shadow(0 0 8px rgba(255,80,80,0.3))",
                                      ],
                                    }
                                  : {
                                      opacity: 1,
                                      scale: 1,
                                      rotate: 0,
                                      filter:
                                        "saturate(1) contrast(1) drop-shadow(0 0 0px rgba(0,0,0,0))",
                                    }
                              }
                              exit={{ opacity: 0.2, scale: 1.08, rotate: 2 }}
                              transition={
                                isSelectedEnemyEnraged
                                  ? {
                                      duration: 1.1,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }
                                  : { duration: 0.35 }
                              }
                              className="w-full h-full object-cover"
                            />
                          </AnimatePresence>
                        ) : (
                          <div className="text-4xl">👹</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xs uppercase tracking-[0.2em] text-red-300">
                        Ennemi ciblé
                      </div>

                      {activeTurn?.kind === "enemy" &&
                        activeTurn.entityId === selectedEnemy.enemyId && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-amber-400 bg-amber-500/20 text-amber-100">
                            Action
                          </span>
                        )}

                      {selectedEnemy.isDead && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-red-500 bg-red-500/20 text-red-100">
                          Mort
                        </span>
                      )}
                    </div>

                    <div className="text-xl xl:text-2xl font-bold text-violet-100 mt-1">
                      {selectedEnemy.enemy.name}
                    </div>
                    <div className="text-xs xl:text-sm text-violet-300 mt-1">
                      {selectedEnemy.enemy.archetype}
                    </div>
                    {isSelectedEnemyEnraged && (
                      <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full border border-orange-500 bg-orange-500/20 text-orange-100 text-xs uppercase tracking-wider">
                        Rage
                      </div>
                    )}

                    {selectedEnemyIntention && !selectedEnemy.isDead && (
                      <div className="mt-3 rounded-xl border border-amber-500/50 bg-amber-950/20 p-3">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300">
                          Intention
                        </div>
                        <div className="mt-1 text-sm font-bold text-amber-100">
                          {selectedEnemyIntention.icon}{" "}
                          {selectedEnemyIntention.actionName}
                        </div>
                        <div className="mt-1 text-xs text-gray-300">
                          Cible : {selectedEnemyIntention.targetLabel}
                          {selectedEnemyIntention.isArea
                            ? " · attaque de zone"
                            : ""}
                        </div>
                        <div className="text-xs text-gray-300">
                          Dégâts estimés : {selectedEnemyIntention.damageLabel}
                        </div>
                        {selectedEnemyIntention.effectLabel && (
                          <div className="text-xs text-gray-300">
                            Effet : {selectedEnemyIntention.effectLabel}
                          </div>
                        )}
                        {selectedEnemyIntention.description && (
                          <div className="mt-1 text-[11px] text-gray-400 italic">
                            {selectedEnemyIntention.description}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      {selectedEnemyShield > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] text-sky-200 mb-1">
                            <span>Bouclier</span>
                            <span>{selectedEnemyShield}</span>
                          </div>
                          <div className="h-2 rounded bg-black/40 overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: "100%",
                                background:
                                  "linear-gradient(90deg, rgba(56,189,248,0.95) 0%, rgba(125,211,252,1) 100%)",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between text-[11px] text-red-200 mb-1">
                        <span>PV</span>
                        <span>
                          {displayedEnemyHp[selectedEnemy.enemyId] ??
                            selectedEnemy.stats.hp}
                          /{selectedEnemy.stats.maxHp}
                        </span>
                      </div>
                      <div className="h-3 rounded bg-black/40 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${
                              selectedEnemy.stats.maxHp > 0
                                ? ((displayedEnemyHp[selectedEnemy.enemyId] ??
                                    selectedEnemy.stats.hp) /
                                    selectedEnemy.stats.maxHp) *
                                  100
                                : 0
                            }%`,
                            background:
                              "linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(248,113,113,1) 100%)",
                          }}
                        />
                      </div>
                    </div>

                    {renderStatusBadges(selectedEnemy.statuses)}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {allies.map(renderPlayerCard)}
            </div>
          </div>

          <div className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-t border-violet-900/60 p-3 md:flex md:gap-4 md:p-4 xl:border-t-0 xl:p-5">
            {actionsPanel}

            {logPanel}
          </div>
        </div>
      </motion.div>

      {isMobile && (
        <>
          <MobileCombatActionBar
            canAct={Boolean(
              activePlayer &&
                !activePlayer.isDead &&
                activeTurn?.kind === "player",
            )}
            selectedEnemyName={selectedEnemy?.enemy.name}
            selectedEnemyIsDead={selectedEnemy?.isDead}
            turnState={turnState}
            selectedSkill={selectedSkill}
            unlockedSkills={unlockedSkills}
            activeMana={activePlayer?.stats.mana ?? 0}
            onAction={handleAction}
            onSelectSkill={selectPlayerSkill}
          />

          <MobileActionSheet
            open={mobileIntentionsOpen}
            title="Intentions ennemies"
            onClose={() => setMobileIntentionsOpen(false)}
          >
            <EnemyIntentionsPanel
              intentions={enemyIntentions}
              selectedEnemyId={selectedEnemyId}
              onSelectEnemy={(enemyId) => {
                selectEnemyTarget(enemyId);
                setMobileIntentionsOpen(false);
              }}
            />
          </MobileActionSheet>

          <MobileActionSheet
            open={mobileLogOpen}
            title="Journal de combat"
            onClose={() => setMobileLogOpen(false)}
          >
            {logPanel}
          </MobileActionSheet>
        </>
      )}
    </div>
  );
}
