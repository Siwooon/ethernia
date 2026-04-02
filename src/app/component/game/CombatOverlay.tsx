"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getUnlockedSkills } from "@/app/component/data/abilities";
import { Enemy, EnemyAttack, Player, PlayerSkill, Stats, StatusEffect, TerrainEffect } from "@/app/component/types/game";
import { getDerivedPlayerStats } from "@/app/component/lib/playerStats";
import { addStatus, applyTurnStatusEffectsToStats, applyStatusModifiersToStats, getDebuffMultiplier, consumeShield, getShieldValue, consumeMarked,} from "@/app/component/lib/statusEffects";
import { initializeBossEnemy, prepareBossTurn } from "@/app/component/lib/bossMechanics";
import { applyCombatStartMapEffects } from "@/app/component/lib/mapEffects";
import { applyTerrainEffectsEachTurn, applyTerrainEffectsOnCombatStart } from "@/app/component/lib/terrainEffects";
import { runPassives } from "@/app/component/lib/passives";

type CombatPlayerState = {
  playerId: number;
  player: Player;
  stats: Stats;
  statuses: StatusEffect[];
  defending: boolean;
  isDead: boolean;
};

type CombatEnemyState = {
  enemyId: string;
  enemy: Enemy;
  stats: Stats;
  statuses: StatusEffect[];
  isDead: boolean;
};

export type CombatResultPlayer = {
  playerId: number;
  stats: Stats;
  statuses: StatusEffect[];
  isDead: boolean;
};

type TurnEntry = {
  id: string;
  kind: "player" | "enemy";
  entityId: number | string;
  speed: number;
};

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

function makeEnemyId(index: number) {
  return `enemy-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function enemyToCombatState(enemy: Enemy, index: number): CombatEnemyState {
  const safeEnemy = initializeBossEnemy({
    ...enemy,
    statuses: enemy.statuses ?? [],
  });

  return {
    enemyId: makeEnemyId(index),
    enemy: safeEnemy,
    stats: {
      hp: safeEnemy.hp,
      maxHp: safeEnemy.maxHp,
      mana: 0,
      maxMana: 0,
      strength: safeEnemy.strength,
      magic: safeEnemy.magic,
      defense: safeEnemy.defense,
      speed: safeEnemy.speed,
    },
    statuses: safeEnemy.statuses ?? [],
    isDead: safeEnemy.hp <= 0,
  };
}

function syncEnemyState(enemyState: CombatEnemyState): Enemy {
  return {
    ...enemyState.enemy,
    hp: enemyState.stats.hp,
    maxHp: enemyState.stats.maxHp,
    strength: enemyState.stats.strength,
    magic: enemyState.stats.magic,
    defense: enemyState.stats.defense,
    speed: enemyState.stats.speed,
    statuses: enemyState.statuses,
  };
}

export default function CombatOverlay({
  players,
  enemies,
  terrainEffects = [],
  onWin,
  onDefeat,
  onFlee,
}: Props) {
  const [logs, setLogs] = useState<string[]>(["⚔️ Le combat commence !"]);

  const [allies, setAllies] = useState<CombatPlayerState[]>(
    players.map((p) => {
      const baseStats = getDerivedPlayerStats(p);

      return {
        playerId: p.id,
        player: p,
        stats: baseStats,
        statuses: [
          ...(p.statuses || []),
          ...applyCombatStartMapEffects(p),
          ...applyTerrainEffectsOnCombatStart(terrainEffects),
        ],
        defending: false,
        isDead: p.isDead || baseStats.hp <= 0,
      };
    })
  );

const initialEnemyStates = enemies.map((enemy, index) => enemyToCombatState(enemy, index));

const [enemyStates, setEnemyStates] = useState<CombatEnemyState[]>(initialEnemyStates);

const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(
  initialEnemyStates.length > 0 ? initialEnemyStates[0].enemyId : null
);

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [turnOrder, setTurnOrder] = useState<TurnEntry[]>([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);
  const [roundCount, setRoundCount] = useState(1);
  const displayRound = roundCount;
  const [turnState, setTurnState] = useState<"waiting" | "animating">("waiting");
  const [shake, setShake] = useState<"player" | "enemy" | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const [displayedEnemyHp, setDisplayedEnemyHp] = useState<Record<string, number>>(
    Object.fromEntries(initialEnemyStates.map((enemyState) => [enemyState.enemyId, enemyState.stats.hp]))
  );

  const [displayedAlliesHp, setDisplayedAlliesHp] = useState<Record<number, number>>(
    Object.fromEntries(
      players.map((p) => {
        const stats = getDerivedPlayerStats(p);
        return [p.id, stats.hp];
      })
    )
  );

  const [displayedEnemyShield, setDisplayedEnemyShield] = useState<Record<string, number>>(
    Object.fromEntries(
      initialEnemyStates.map((enemyState) => [enemyState.enemyId, getShieldValue(enemyState.statuses)])
    )
  );

  const [displayedAlliesShield, setDisplayedAlliesShield] = useState<Record<number, number>>(
    Object.fromEntries(players.map((p) => [p.id, getShieldValue(p.statuses || [])]))
  );

  const [forcedTargetPlayerId, setForcedTargetPlayerId] = useState<number | null>(null);
  const [forcedTargetTurns, setForcedTargetTurns] = useState(0);
  const floatingTextIdRef = useRef(0);
  const alliesRef = useRef(allies);
  const enemiesRef = useRef(enemyStates);
  const roundProcessingRef = useRef(false);

  const [enemyAttackBanner, setEnemyAttackBanner] = useState<{
    name: string;
    description?: string;
    kind: "physical" | "magical" | "hybrid";
    enemyName?: string;
  } | null>(null);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const consumeForcedTargetTurn = () => {
    if (forcedTargetTurns <= 0) return;
    const nextTurns = forcedTargetTurns - 1;
    setForcedTargetTurns(nextTurns);
    if (nextTurns <= 0) setForcedTargetPlayerId(null);
  };

  const getClassFallbackIcon = (classType: Player["classType"]) => {
    switch (classType) {
      case "Guerrier":
        return "🛡️";
      case "Mage":
        return "✨";
      case "Archer":
        return "🏹";
      case "Voleur":
        return "🗡️";
      case "Demoniste":
        return "🔮";
      case "Clerc":
        return "✝️";
      default:
        return "🧙";
    }
  };

  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev]);

  const triggerShake = (target: "player" | "enemy") => {
    setShake(target);
    setTimeout(() => setShake(null), 350);
  };

  const spawnFloatingText = (
    target: string | number,
    text: string,
    tone: "damage" | "heal" | "shield" | "mana"
  ) => {
    const id = ++floatingTextIdRef.current;
    setFloatingTexts((prev) => [...prev, { id, target, text, tone }]);

    window.setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((entry) => entry.id !== id));
    }, 900);
  };

  const statusLabelMap: Record<StatusEffect["type"], string> = {
    poison: "☠️ Poison",
    burn: "🔥 Brûlure",
    shield: "🛡️ Bouclier",
    regen: "✨ Régénération",
    weakness: "🪓 Faiblesse",
    frailty: "🩹 Fragilité",
    silence: "🔇 Silence",
    vulnerability: "🎯 Vulnérable",
    marked: "🎯 Marqué",
  };

  const statusToneMap: Record<
    StatusEffect["type"],
    { bg: string; border: string; text: string }
  > = {
    poison: {
      bg: "bg-lime-950/40",
      border: "border-lime-700",
      text: "text-lime-200",
    },
    burn: {
      bg: "bg-red-950/40",
      border: "border-red-700",
      text: "text-red-200",
    },
    shield: {
      bg: "bg-sky-950/40",
      border: "border-sky-700",
      text: "text-sky-200",
    },
    regen: {
      bg: "bg-emerald-950/40",
      border: "border-emerald-700",
      text: "text-emerald-200",
    },
    weakness: {
      bg: "bg-orange-950/40",
      border: "border-orange-700",
      text: "text-orange-200",
    },
    frailty: {
      bg: "bg-amber-950/40",
      border: "border-amber-700",
      text: "text-amber-200",
    },
    silence: {
      bg: "bg-violet-950/40",
      border: "border-violet-700",
      text: "text-violet-200",
    },
    vulnerability: {
      bg: "bg-fuchsia-950/40",
      border: "border-fuchsia-700",
      text: "text-fuchsia-200",
    },
    marked: {
      bg: "bg-rose-950/40",
      border: "border-rose-700",
      text: "text-rose-200",
    },
  };

  const formatStatuses = (statuses: StatusEffect[]) => {
    return statuses.map((status, index) => ({
      key: `${status.type}-${status.source ?? "unknown"}-${index}`,
      label: statusLabelMap[status.type] ?? status.type,
      value: status.value,
      duration: status.type === "shield" ? 0 : status.duration,
      tone:
        statusToneMap[status.type] ?? {
          bg: "bg-slate-950/40",
          border: "border-slate-700",
          text: "text-slate-200",
        },
    }));
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
    if (!selectedEnemyId || !getEnemyById(selectedEnemyId) || getEnemyById(selectedEnemyId)?.isDead) {
      const firstAlive = enemiesRef.current.find((enemyState) => !enemyState.isDead);
      setSelectedEnemyId(firstAlive?.enemyId ?? null);
    }
  }, [enemyStates, selectedEnemyId]);

  useEffect(() => {
    setDisplayedAlliesHp(
      Object.fromEntries(allies.map((ally) => [ally.playerId, ally.stats.hp]))
    );
    setDisplayedAlliesShield(
      Object.fromEntries(allies.map((ally) => [ally.playerId, getShieldValue(ally.statuses)]))
    );
  }, [allies]);

  useEffect(() => {
    setDisplayedEnemyHp(
      Object.fromEntries(enemyStates.map((enemyState) => [enemyState.enemyId, enemyState.stats.hp]))
    );
    setDisplayedEnemyShield(
      Object.fromEntries(
        enemyStates.map((enemyState) => [enemyState.enemyId, getShieldValue(enemyState.statuses)])
      )
    );
  }, [enemyStates]);

  const buildCombatResults = (): CombatResultPlayer[] => {
    return alliesRef.current.map((ally) => ({
      playerId: ally.playerId,
      stats: ally.stats,
      statuses: ally.statuses,
      isDead: ally.isDead,
    }));
  };

  const buildTurnOrder = (
    currentAllies: CombatPlayerState[],
    currentEnemies: CombatEnemyState[]
  ) => {
    const allyTurns: TurnEntry[] = currentAllies
      .filter((a) => !a.isDead)
      .map((a) => ({
        id: `player-${a.playerId}`,
        kind: "player" as const,
        entityId: a.playerId,
        speed: a.stats.speed + Math.random() * 0.01,
      }));

    const enemyTurns: TurnEntry[] = currentEnemies
      .filter((e) => !e.isDead && e.stats.hp > 0)
      .map((e) => ({
        id: `enemy-${e.enemyId}`,
        kind: "enemy" as const,
        entityId: e.enemyId,
        speed: e.stats.speed + Math.random() * 0.01,
      }));

    return [...allyTurns, ...enemyTurns].sort((a, b) => b.speed - a.speed);
  };

  const checkCombatEnd = (
    nextAllies: CombatPlayerState[] = alliesRef.current,
    nextEnemies: CombatEnemyState[] = enemiesRef.current
  ) => {
    const livingAllies = nextAllies.filter((a) => !a.isDead);
    const livingEnemies = nextEnemies.filter((e) => !e.isDead && e.stats.hp > 0);

    if (livingEnemies.length === 0) {
      onWin(buildCombatResults());
      return true;
    }

    if (livingAllies.length === 0) {
      onDefeat(buildCombatResults());
      return true;
    }

    return false;
  };

  const processEndOfRound = () => {
    if (roundProcessingRef.current) return;
    roundProcessingRef.current = true;

    const nextAllies = alliesRef.current.map((ally) => {
      if (ally.isDead) {
        return { ...ally, defending: false };
      }

      const turnResult = applyTurnStatusEffectsToStats({
        hp: ally.stats.hp,
        maxHp: ally.stats.maxHp,
        statuses: ally.statuses,
      });

      turnResult.logs.forEach((log) => {
        addLog(`🧙 ${ally.player.name} — ${log}`);
      });

      return {
        ...ally,
        stats: {
          ...ally.stats,
          hp: turnResult.hp,
        },
        statuses: turnResult.statuses,
        defending: false,
        isDead: turnResult.hp <= 0,
      };
    });

    const nextEnemies = enemiesRef.current.map((enemyState) => {
      if (enemyState.isDead) return enemyState;

      const turnResult = applyTurnStatusEffectsToStats({
        hp: enemyState.stats.hp,
        maxHp: enemyState.stats.maxHp,
        statuses: enemyState.statuses,
      });

      turnResult.logs.forEach((log) => {
        addLog(`👹 ${enemyState.enemy.name} — ${log}`);
      });

      return {
        ...enemyState,
        stats: {
          ...enemyState.stats,
          hp: turnResult.hp,
        },
        enemy: {
          ...enemyState.enemy,
          hp: turnResult.hp,
          statuses: turnResult.statuses,
        },
        statuses: turnResult.statuses,
        isDead: turnResult.hp <= 0,
      };
    });

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
    duration = 450
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
      500
    );
  };

  const animateEnemyShieldLoss = async (enemyId: string, nextShield: number) => {
    const from = displayedEnemyShield[enemyId] ?? nextShield;
    await animateNumberChange(
      from,
      nextShield,
      (value) =>
        setDisplayedEnemyShield((prev) => ({
          ...prev,
          [enemyId]: value,
        })),
      350
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
      500
    );
  };

  const animateAllyShieldLoss = async (playerId: number, nextShield: number) => {
    const from = displayedAlliesShield[playerId] ?? nextShield;
    await animateNumberChange(
      from,
      nextShield,
      (value) =>
        setDisplayedAlliesShield((prev) => ({
          ...prev,
          [playerId]: value,
        })),
      350
    );
  };

  const applyPassiveTriggerForAlly = (
    ally: CombatPlayerState,
    trigger: "combat_start" | "turn_start" | "after_attack" | "after_take_damage",
    nextPlayerStats: Stats,
    nextEnemyStats: Enemy,
    currentPlayerStatuses: StatusEffect[],
    currentEnemyStatuses: StatusEffect[]
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
        (playerPassiveResult.playerStatuses as StatusEffect[]) ?? currentPlayerStatuses,
      enemyStatuses:
        (playerPassiveResult.enemyStatuses as StatusEffect[]) ?? currentEnemyStatuses,
      trigger,
    });

    enemyPassiveResult.logs.forEach(addLog);

    return {
      playerStats: enemyPassiveResult.playerStats,
      enemyStats: enemyPassiveResult.enemyStats as Enemy,
      playerStatuses:
        (enemyPassiveResult.playerStatuses as StatusEffect[]) ?? currentPlayerStatuses,
      enemyStatuses:
        (enemyPassiveResult.enemyStatuses as StatusEffect[]) ?? currentEnemyStatuses,
    };
  };

  useEffect(() => {
    const initializedAllies = alliesRef.current.map((ally) => {
      const firstEnemy = enemiesRef.current.find((enemyState) => !enemyState.isDead);
      if (!firstEnemy) return ally;

      const result = applyPassiveTriggerForAlly(
        ally,
        "combat_start",
        ally.stats,
        syncEnemyState(firstEnemy),
        ally.statuses,
        firstEnemy.statuses
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

    const initialTurnOrder = buildTurnOrder(initializedAllies, enemiesRef.current);
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
      ? enemyStates.find((enemyState) => enemyState.enemyId === activeTurn.entityId)
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
      const enemyState = enemyStates.find((enemyState) => enemyState.enemyId === activeTurn.entityId);
      if (!enemyState || enemyState.isDead || enemyState.stats.hp <= 0) {
        const timer = setTimeout(() => {
          goToNextTurn();
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTurn, allies, enemyStates, turnState]);

  const unlockedSkills = useMemo(() => {
    if (!activePlayer) return [];
    return getUnlockedSkills(activePlayer.player.classType, activePlayer.player.level);
  }, [activePlayer]);

  const selectedSkill =
    unlockedSkills.find((skill) => skill.id === selectedSkillId) || unlockedSkills[0];

  const computeEnemyDamage = (
    attack: EnemyAttack,
    enemyData: Enemy,
    playerData: Stats,
    targetStatuses: StatusEffect[],
    targetDefending: boolean
  ) => {
    let raw = 0;

    if (attack.kind === "physical") {
      raw = enemyData.strength * attack.powerMultiplier;
    } else if (attack.kind === "magical") {
      raw = enemyData.magic * attack.powerMultiplier;
    } else {
      raw = (enemyData.strength + enemyData.magic) * 0.5 * attack.powerMultiplier;
    }

    raw = Math.floor(raw * (0.9 + Math.random() * 0.25));
    const reducedByDefense = Math.max(1, raw - Math.floor(playerData.defense / 3));
    const vulnerabilityMultiplier = getDebuffMultiplier(targetStatuses, "vulnerability");

    let final = Math.max(1, Math.floor(reducedByDefense * vulnerabilityMultiplier));

    if (targetDefending) {
      final = Math.max(1, Math.floor(final * 0.3));
    }

    const critChance =
      attack.critChance ?? (enemyData.archetype === "assassin" ? 0.18 : 0.08);
    const crit = Math.random() < critChance;

    if (crit) final *= 2;

    return { damage: final, crit };
  };

  const computePlayerSkillDamage = (
    skill: PlayerSkill,
    stats: Stats,
    enemyData: Enemy,
    playerStatuses: StatusEffect[],
    enemyStatusesArg: StatusEffect[]
  ) => {
    let base = 0;

    if (skill.scaling === "strength") base = stats.strength * skill.multiplier;
    else if (skill.scaling === "magic") base = stats.magic * skill.multiplier;
    else base = (stats.strength + stats.magic) * 0.5 * skill.multiplier;

    let bonusFlat = 0;
    let bonusMultiplier = 0;
    const triggeredConditions: string[] = [];

    for (const condition of skill.conditions ?? []) {
      if (condition.type === "target_status") {
        const ok = enemyStatusesArg.some((s) => s.type === condition.status);
        if (ok) {
          bonusFlat += condition.bonusFlat ?? 0;
          bonusMultiplier += condition.bonusMultiplier ?? 0;
          triggeredConditions.push(`cible ${condition.status}`);
        }
      }

      if (
        condition.type === "self_hp_below" &&
        condition.threshold !== undefined &&
        stats.hp / stats.maxHp <= condition.threshold
      ) {
        bonusFlat += condition.bonusFlat ?? 0;
        bonusMultiplier += condition.bonusMultiplier ?? 0;
        triggeredConditions.push("PV bas");
      }

      if (
        condition.type === "self_mana_above" &&
        condition.threshold !== undefined &&
        stats.mana / stats.maxMana >= condition.threshold
      ) {
        bonusFlat += condition.bonusFlat ?? 0;
        bonusMultiplier += condition.bonusMultiplier ?? 0;
        triggeredConditions.push("mana élevé");
      }

      if (
        condition.type === "target_hp_below" &&
        condition.threshold !== undefined &&
        enemyData.hp / enemyData.maxHp <= condition.threshold
      ) {
        bonusFlat += condition.bonusFlat ?? 0;
        bonusMultiplier += condition.bonusMultiplier ?? 0;
        triggeredConditions.push("cible affaiblie");
      }

      if (condition.type === "self_has_status") {
        const ok = playerStatuses.some((s) => s.type === condition.status);
        if (ok) {
          bonusFlat += condition.bonusFlat ?? 0;
          bonusMultiplier += condition.bonusMultiplier ?? 0;
          triggeredConditions.push(`self ${condition.status}`);
        }
      }
    }

    let dmg = Math.floor(base * (1 + bonusMultiplier) + bonusFlat);

    if (!skill.ignoreDefense) {
      dmg = Math.max(1, dmg - Math.floor(enemyData.defense / 2));
    }

    const crit = !!skill.guaranteedCrit;
    if (crit) dmg *= 2;

    const vulnerabilityMultiplier = getDebuffMultiplier(enemyStatusesArg, "vulnerability");
    dmg = Math.max(1, Math.floor(dmg * vulnerabilityMultiplier));

    return { dmg, crit, triggeredConditions };
  };

  const doEnemyTurn = async () => {
    if (!activeEnemy || turnState === "animating") return;
    setTurnState("animating");

    const livingAllies = alliesRef.current.filter((a) => !a.isDead);
    if (livingAllies.length === 0) {
      onDefeat(buildCombatResults());
      return;
    }

    const actingEnemyState = enemiesRef.current.find((enemyState) => enemyState.enemyId === activeEnemy.enemyId);
    if (!actingEnemyState || actingEnemyState.isDead) {
      goToNextTurn();
      return;
    }

    let preparedEnemyBase: Enemy = {
      ...applyStatusModifiersToStats({
        ...syncEnemyState(actingEnemyState),
        statuses: actingEnemyState.statuses,
      }),
      statuses: actingEnemyState.statuses,
    };

    const bossPrep = prepareBossTurn(
      preparedEnemyBase,
      actingEnemyState.statuses ?? [],
      livingAllies.map((ally) => ({
        playerId: ally.playerId,
        isDead: ally.isDead,
      }))
    );

    let actingEnemy = bossPrep.enemy;
    let actingEnemyStatuses = [...bossPrep.enemyStatuses];

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
          : enemyState
      )
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
        : enemyState
    );

    bossPrep.logs.forEach(addLog);

    const attack = bossPrep.attack;

    const forcedTarget =
      bossPrep.preferredTargetPlayerId !== null
        ? livingAllies.find(
            (ally) =>
              ally.playerId === bossPrep.preferredTargetPlayerId && !ally.isDead
          )
        : forcedTargetPlayerId !== null
        ? livingAllies.find(
            (ally) => ally.playerId === forcedTargetPlayerId && !ally.isDead
          )
        : null;

    const fallbackTarget =
      forcedTarget ?? livingAllies[Math.floor(Math.random() * livingAllies.length)];

    const targetIds =
      attack.targetScope === "all_players"
        ? livingAllies.map((ally) => ally.playerId)
        : fallbackTarget
        ? [fallbackTarget.playerId]
        : [];

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
      const allyIndex = workingAllies.findIndex((ally) => ally.playerId === targetId);
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

        const { damage, crit } = computeEnemyDamage(
          attack,
          actingEnemy,
          localStats,
          localStatuses,
          ally.defending
        );

        let finalDamage = damage;
        wasCrit = wasCrit || crit;

        const markedResult = consumeMarked(localStatuses);
        if (markedResult.consumed) {
          localStatuses = markedResult.updatedStatuses;
          finalDamage *= 2;
          addLog(`🎯 ${ally.player.name} était marqué : dégâts subis x2.`);
          spawnFloatingText(ally.playerId, "MARQUÉ x2", "damage");
        }

        const shieldResult = consumeShield(localStatuses, finalDamage);
        localStatuses = shieldResult.updatedStatuses;
        const nextShield = getShieldValue(localStatuses);

        if (shieldResult.absorbed > 0) {
          spawnFloatingText(ally.playerId, `-${shieldResult.absorbed}`, "shield");
          addLog(
            `🛡️ Le bouclier de ${ally.player.name} absorbe ${shieldResult.absorbed} dégâts.`
          );
          await animateAllyShieldLoss(ally.playerId, nextShield);
          await sleep(120);
        }

        const hpBefore = localStats.hp;
        const finalHp = Math.max(0, localStats.hp - shieldResult.remainingDamage);
        const hpLost = Math.max(0, hpBefore - finalHp);
        accumulatedDamageTaken += hpLost;

        if (shieldResult.remainingDamage > 0) {
          spawnFloatingText(
            ally.playerId,
            crit ? `-${shieldResult.remainingDamage} CRIT` : `-${shieldResult.remainingDamage}`,
            "damage"
          );

          triggerShake("player");
          await animateAllyHpLoss(ally.playerId, finalHp);
          await sleep(150);
        }

        localStats = {
          ...localStats,
          hp: finalHp,
        };
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

      const terrainTurnResult = applyTerrainEffectsEachTurn(localStats, terrainEffects);
      localStats = terrainTurnResult.stats;
      terrainTurnResult.logs.forEach((log) =>
        addLog(`🌫️ ${ally.player.name} — ${log}`)
      );

      const passiveResult = applyPassiveTriggerForAlly(
        ally,
        "after_take_damage",
        localStats,
        actingEnemy,
        localStatuses,
        actingEnemyStatuses
      );

      localStats = passiveResult.playerStats;
      localStatuses = (passiveResult.playerStatuses as StatusEffect[]) ?? localStatuses;
      actingEnemy = passiveResult.enemyStats as Enemy;
      actingEnemyStatuses =
        (passiveResult.enemyStatuses as StatusEffect[]) ?? actingEnemyStatuses;

      if (attack.selfHealPercent && accumulatedDamageTaken > 0) {
        totalHealForEnemy += Math.max(
          1,
          Math.floor(accumulatedDamageTaken * attack.selfHealPercent)
        );
      }

      const targetScopeText =
        attack.targetScope === "all_players" ? " (attaque de zone)" : "";

      addLog(
        `👹 ${actingEnemy.name} utilise ${attack.name} sur ${ally.player.name} : -${accumulatedDamageTaken} PV${targetScopeText}${
          wasCrit ? " 💥 CRITIQUE !" : ""
        }${attack.manaBurn ? ` -${attack.manaBurn} Mana` : ""}`
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
      spawnFloatingText(actingEnemyState.enemyId, `+${totalHealForEnemy}`, "heal");
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
        : enemyState
    );

    setAllies(workingAllies);
    alliesRef.current = workingAllies;

    setEnemyStates(updatedEnemies);
    enemiesRef.current = updatedEnemies;

    setEnemyAttackBanner(null);

    if (checkCombatEnd(workingAllies, updatedEnemies)) return;

    consumeForcedTargetTurn();
    await sleep(250);
    goToNextTurn();
  };


  const handleAction = async (action: "attack" | "special" | "defend" | "flee") => {
    let didCrit = false;

    if (!activeTurn || activeTurn.kind !== "player" || turnState === "animating") return;

    const actingAlly = alliesRef.current.find((a) => a.playerId === activeTurn.entityId);
    if (!actingAlly || actingAlly.isDead) return;

    const currentTarget = selectedEnemy;
    if (!currentTarget || currentTarget.isDead) {
      addLog("❌ Aucune cible ennemie disponible.");
      return;
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
        : ally
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
      currentTarget.statuses
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
          : enemyState
      )
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
        : enemyState
    );

    if (action === "defend") {
      const defendedStats: Stats = {
        ...currentStats,
        mana: Math.min(currentStats.maxMana, currentStats.mana + 6),
      };

      addLog(`🛡️ ${actingAlly.player.name} se met en garde : +6 mana, dégâts directs réduits`);
      spawnFloatingText(actingAlly.playerId, "+6 mana", "mana");

      const updatedAllies = alliesRef.current.map((ally) =>
        ally.playerId === actingAlly.playerId
          ? {
              ...ally,
              stats: defendedStats,
              statuses: currentStatuses,
              defending: true,
            }
          : ally
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
      const raw = Math.max(
        1,
        Math.floor(currentStats.strength * (0.8 + Math.random() * 0.4))
      );

      const reduced = Math.max(1, raw - Math.floor(currentEnemyStats.defense / 2));
      const vulnerabilityMultiplier = getDebuffMultiplier(currentEnemyStatuses, "vulnerability");
      const baseDamage = Math.max(1, Math.floor(reduced * vulnerabilityMultiplier));
      const isCrit = Math.random() < 0.1;
      didCrit = isCrit;
      dmg = isCrit ? baseDamage * 2 : baseDamage;

      logMsg = isCrit
        ? `⚔️ ${actingAlly.player.name} — Attaque critique sur ${currentEnemyStats.name} ! -${dmg} PV`
        : `⚔️ ${actingAlly.player.name} attaque ${currentEnemyStats.name} : -${dmg} PV`;
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

      const result = computePlayerSkillDamage(
        selectedSkill,
        currentStats,
        currentEnemyStats,
        currentStatuses,
        currentEnemyStatuses
      );

      didCrit = result.crit;
      dmg = result.dmg;

      if (result.triggeredConditions.length > 0) {
        addLog(
          `✨ ${actingAlly.player.name} renforce ${selectedSkill.name} : ${result.triggeredConditions.join(", ")}`
        );
      }

      logMsg = `${selectedSkill.icon} ${actingAlly.player.name} — ${selectedSkill.name} sur ${currentEnemyStats.name} : -${dmg} PV${
        result.crit ? " 💥 CRITIQUE !" : ""
      }`;
    }

    let nextPlayerStats: Stats =
      manaCost > 0 ? { ...currentStats, mana: currentStats.mana - manaCost } : currentStats;

    let updatedPlayerStatuses = [...currentStatuses];
    let updatedEnemyStatuses = [...currentEnemyStatuses];

    if (action === "special" && selectedSkill?.extraEffects) {
      for (const effect of selectedSkill.extraEffects) {
        if (effect.type === "taunt") {
          setForcedTargetPlayerId(actingAlly.playerId);
          setForcedTargetTurns(effect.duration);
          addLog(`📣 ${actingAlly.player.name} provoque l'ennemi - ${effect.duration} tours`);
        }

        if (effect.type === "grant_shield_self") {
          updatedPlayerStatuses = addStatus(updatedPlayerStatuses, {
            type: "shield",
            value: effect.value,
            duration: effect.duration ?? 2,
            source: selectedSkill.name,
          });

          addLog(`🛡️ ${actingAlly.player.name} gagne ${effect.value} de bouclier.`);
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

          addLog(`🛡️ ${actingAlly.player.name} accorde ${effect.value} de bouclier à toute l'équipe.`);
        }

        if (effect.type === "apply_status") {
          const chanceOk = effect.chance === undefined || Math.random() < effect.chance;

          if (chanceOk && effect.target === "enemy") {
            updatedEnemyStatuses = addStatus(updatedEnemyStatuses, {
              type: effect.status,
              value: effect.value,
              duration: effect.duration,
              source: selectedSkill.name,
            });
            addLog(`☠️ ${selectedSkill.name} applique ${effect.status} à ${currentEnemyStats.name}`);
          }

          if (chanceOk && effect.target === "player") {
            updatedPlayerStatuses = addStatus(updatedPlayerStatuses, {
              type: effect.status,
              value: effect.value,
              duration: effect.duration,
              source: selectedSkill.name,
            });
            addLog(`✨ ${selectedSkill.name} applique ${effect.status} à ${actingAlly.player.name}`);
          }
        }

        if (effect.type === "heal_self") {
          let heal = 0;
          if (effect.percentDamageDealt) heal += Math.floor(dmg * effect.percentDamageDealt);
          if (effect.flat) heal += effect.flat;

          if (heal > 0) {
            nextPlayerStats = {
              ...nextPlayerStats,
              hp: Math.min(nextPlayerStats.maxHp, nextPlayerStats.hp + heal),
            };
            addLog(`💚 ${actingAlly.player.name} récupère ${heal} PV`);
            spawnFloatingText(actingAlly.playerId, `+${heal}`, "heal");
            await sleep(250);
          }
        }
      }
    }

    const markedEnemyResult = consumeMarked(updatedEnemyStatuses);

    if (markedEnemyResult.consumed) {
      updatedEnemyStatuses = markedEnemyResult.updatedStatuses;
      dmg *= 2;
      addLog(`🎯 ${currentEnemyStats.name} était marqué : dégâts subis x2.`);
      spawnFloatingText(currentTarget.enemyId, "MARQUÉ x2", "damage");
    }

    const enemyShieldResult = consumeShield(updatedEnemyStatuses, dmg);
    updatedEnemyStatuses = enemyShieldResult.updatedStatuses;
    const enemyShieldAfter = getShieldValue(updatedEnemyStatuses);

    const nextEnemyStats: Enemy = {
      ...currentEnemyStats,
      hp: Math.max(0, currentEnemyStats.hp - enemyShieldResult.remainingDamage),
      statuses: updatedEnemyStatuses,
    };

    if (enemyShieldResult.absorbed > 0) {
      spawnFloatingText(currentTarget.enemyId, `-${enemyShieldResult.absorbed}`, "shield");
      addLog(`🛡️ Le bouclier de ${currentEnemyStats.name} absorbe ${enemyShieldResult.absorbed} dégâts.`);
      await animateEnemyShieldLoss(currentTarget.enemyId, enemyShieldAfter);
      await sleep(180);
    }

    if (enemyShieldResult.remainingDamage > 0) {
      spawnFloatingText(
        currentTarget.enemyId,
        didCrit
          ? `-${enemyShieldResult.remainingDamage} CRIT`
          : `-${enemyShieldResult.remainingDamage}`,
        "damage"
      );

      triggerShake("enemy");
      await animateEnemyHpLoss(currentTarget.enemyId, nextEnemyStats.hp);
      await sleep(250);
    }

    if (action === "attack") {
      logMsg = `⚔️ ${actingAlly.player.name} attaque ${currentEnemyStats.name} : -${enemyShieldResult.remainingDamage} PV${
        enemyShieldResult.absorbed > 0 ? ` (${enemyShieldResult.absorbed} absorbés)` : ""
      }${didCrit ? " 💥 CRITIQUE !" : ""}`;
    }

    if (action === "special" && selectedSkill) {
      logMsg = `${selectedSkill.icon} ${actingAlly.player.name} — ${selectedSkill.name} sur ${currentEnemyStats.name} : -${enemyShieldResult.remainingDamage} PV${
        enemyShieldResult.absorbed > 0 ? ` (${enemyShieldResult.absorbed} absorbés)` : ""
      }${didCrit ? " 💥 CRITIQUE !" : ""}`;
    }

    const afterAttackResult = applyPassiveTriggerForAlly(
      actingAlly,
      "after_attack",
      nextPlayerStats,
      nextEnemyStats,
      updatedPlayerStatuses,
      updatedEnemyStatuses
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
        : ally
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
        : enemyState
    );

    setAllies(updatedAllies);
    alliesRef.current = updatedAllies;

    setEnemyStates(updatedEnemies);
    enemiesRef.current = updatedEnemies;

    addLog(logMsg);

    if (checkCombatEnd(updatedAllies, updatedEnemies)) return;

    await sleep(250);
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

  const renderStatusBadges = (statuses: StatusEffect[]) => {
    if (!statuses.length) {
      return <div className="text-[11px] text-gray-500 italic">Aucun effet</div>;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {formatStatuses(statuses).map((status) => (
          <div
            key={status.key}
            className={`px-2 py-1 rounded-full border text-[11px] ${status.tone.bg} ${status.tone.border} ${status.tone.text}`}
            title={
              status.label === "🛡️ Bouclier"
                ? `${status.label} • valeur ${status.value}`
                : `${status.label} • valeur ${status.value} • ${status.duration} tour(s)`
            }
          >
            {status.label === "🛡️ Bouclier"
              ? `${status.label} · ${status.value}`
              : `${status.label} · ${status.value} · ${status.duration}t`}
          </div>
        ))}
      </div>
    );
  };

  const renderPlayerCard = (ally: CombatPlayerState) => {
    const isActive = activeTurn?.kind === "player" && activeTurn.entityId === ally.playerId;
    const shieldValue = displayedAlliesShield[ally.playerId] ?? getShieldValue(ally.statuses);
    const isForcedTarget = forcedTargetPlayerId === ally.playerId && forcedTargetTurns > 0;

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
                <div className="text-xl">{getClassFallbackIcon(ally.player.classType)}</div>
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
                {displayedAlliesHp[ally.playerId] ?? ally.stats.hp}/{ally.stats.maxHp}
              </span>
            </div>
            <div className="h-2 rounded bg-black/40 overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${
                    ally.stats.maxHp > 0
                      ? ((displayedAlliesHp[ally.playerId] ?? ally.stats.hp) / ally.stats.maxHp) * 100
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
    const active = activeTurn?.kind === "enemy" && activeTurn.entityId === enemyState.enemyId;
    const shieldValue =
      displayedEnemyShield[enemyState.enemyId] ?? getShieldValue(enemyState.statuses);

    return (
      <button
        key={enemyState.enemyId}
        onClick={() => !enemyState.isDead && setSelectedEnemyId(enemyState.enemyId)}
        disabled={enemyState.isDead}
        className={`rounded-xl border p-2 text-left transition-all ${
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
                src={enemyState.enemy.image}
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

            <div className="mt-1 h-1.5 rounded bg-black/40 overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${
                    enemyState.stats.maxHp > 0
                      ? ((displayedEnemyHp[enemyState.enemyId] ?? enemyState.stats.hp) /
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
          ? enemiesRef.current.find((enemyState) => enemyState.enemyId === entry.target)
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

  const getEnemyAttackBannerIcon = (kind: "physical" | "magical" | "hybrid") => {
    switch (kind) {
      case "physical":
        return "⚔️";
      case "magical":
        return "✨";
      case "hybrid":
        return "☄️";
      default:
        return "👹";
    }
  };
  const isSelectedEnemyEnraged = 
  !!selectedEnemy && selectedEnemy.enemy.isBoss && selectedEnemy.enemy.bossMechanic === "feral_heart" && selectedEnemy.enemy.bossState?.phase === 2;


  const selectedEnemyShield =
    selectedEnemy ? displayedEnemyShield[selectedEnemy.enemyId] ?? getShieldValue(selectedEnemy.statuses) : 0;
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
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center px-3 xl:px-4 py-3 xl:py-6 overflow-hidden">
      <AnimatePresence>{renderFloatingTexts()}</AnimatePresence>

      <AnimatePresence>
        {enemyAttackBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="absolute top-4 xl:top-8 left-1/2 -translate-x-1/2 z-[120] pointer-events-none px-4 w-full flex justify-center"
          >
            <div className="rounded-2xl border border-red-500/70 bg-black/85 px-4 xl:px-6 py-3 xl:py-4 shadow-[0_0_25px_rgba(239,68,68,0.35)] w-full max-w-[460px] text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-red-300 mb-1">
                Attaque ennemie
              </div>
              <div className="text-sm text-red-200/80 mb-1">
                {enemyAttackBanner.enemyName ?? "Ennemi"}
              </div>
              <div className="text-2xl font-fantasy text-red-100">
                {getEnemyAttackBannerIcon(enemyAttackBanner.kind)} {enemyAttackBanner.name}
              </div>
              {enemyAttackBanner.description && (
                <div className="text-sm text-red-200/85 mt-2">
                  {enemyAttackBanner.description}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[min(96vw,1350px)] h-[min(92vh,860px)] rounded-3xl border border-violet-700 bg-[#12081d] shadow-[0_0_35px_rgba(88,28,135,0.35)] overflow-hidden flex flex-col"
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-0 flex-1 min-h-0">
          <div className="p-4 xl:p-5 border-b xl:border-b-0 xl:border-r border-violet-900/60 overflow-y-auto min-h-0">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-violet-400">
                  Combat
                </div>
                <div className="text-3xl font-fantasy text-violet-100 mt-1">
                  Round {displayRound}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-400">Tour actuel</div>
                <div className="text-sm font-bold text-violet-100">
                  {activeTurn?.kind === "player"
                    ? allies.find((a) => a.playerId === activeTurn.entityId)?.player.name ?? "Allié"
                    : enemyStates.find((enemyState) => enemyState.enemyId === activeTurn?.entityId)?.enemy.name ??
                      "Ennemi"}
                </div>
              </div>
            </div>

            {enemyStates.length > 1 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-[0.18em] text-violet-400 mb-2">
                  Ennemis présents
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {enemyStates.map(renderEnemyMiniCard)}
                </div>
              </div>
            )}

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
                <div className="flex items-start gap-4">
                  <div className="w-24 xl:w-28 shrink-0">
                    <div className="rounded-2xl border border-violet-700 bg-black/30 p-2 shadow-inner">
                      <div className="aspect-square overflow-hidden rounded-xl bg-black/40 flex items-center justify-center">
                        {getDisplayedEnemyImage(selectedEnemy) ? (
                          <AnimatePresence mode="wait">
                            <motion.img
                              key={getDisplayedEnemyImage(selectedEnemy)}
                              src={getDisplayedEnemyImage(selectedEnemy)}
                              alt={selectedEnemy.enemy.name}
                              initial={{ opacity: 0.45, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0.35, scale: 1.05 }}
                              transition={{ duration: 0.35 }}
                              className={`w-full h-full object-cover ${
                                isSelectedEnemyEnraged ? "scale-105 saturate-150 contrast-125" : ""
                              }`}
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
                          {displayedEnemyHp[selectedEnemy.enemyId] ?? selectedEnemy.stats.hp}/
                          {selectedEnemy.stats.maxHp}
                        </span>
                      </div>
                      <div className="h-3 rounded bg-black/40 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${
                              selectedEnemy.stats.maxHp > 0
                                ? ((displayedEnemyHp[selectedEnemy.enemyId] ?? selectedEnemy.stats.hp) /
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

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
              {allies.map(renderPlayerCard)}
            </div>
          </div>

          <div className="p-4 xl:p-5 flex flex-col gap-4 overflow-y-auto min-h-0">
            <div className="rounded-2xl border border-violet-900 bg-[#1b0a3d]/70 p-4">
              <div className="text-sm font-bold text-violet-200 mb-3">
                Actions
              </div>

              {!activePlayer || activePlayer.isDead || activeTurn?.kind !== "player" ? (
                <div className="text-sm text-gray-400 italic">
                  En attente du tour d’un allié...
                </div>
              ) : (
                <>
                  {selectedEnemy && !selectedEnemy.isDead && (
                    <div className="mb-3 text-xs text-violet-300">
                      Cible actuelle :{" "}
                      <span className="font-bold text-red-300">{selectedEnemy.enemy.name}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAction("attack")}
                      disabled={turnState === "animating" || !selectedEnemy || selectedEnemy.isDead}
                      className="rounded-xl border border-violet-700 bg-violet-900/30 hover:bg-violet-800/40 px-3 py-2.5 text-left transition disabled:opacity-40"
                    >
                      <div className="font-bold text-violet-100">⚔️ Attaquer</div>

                    </button>

                    <button
                      onClick={() => handleAction("special")}
                      disabled={
                        turnState === "animating" || !selectedSkill || !selectedEnemy || selectedEnemy.isDead
                      }
                      className="rounded-xl border border-fuchsia-700 bg-fuchsia-900/20 hover:bg-fuchsia-800/30 px-3 py-2.5 text-left transition disabled:opacity-40"
                    >
                      <div className="font-bold text-fuchsia-100">✨ Compétence</div>
                      <div className="text-xs text-fuchsia-300 mt-1">
                        {selectedSkill
                          ? `${selectedSkill.name} • ${selectedSkill.manaCost} mana`
                          : "Aucune compétence"}
                      </div>
                    </button>

                    <button
                      onClick={() => handleAction("defend")}
                      disabled={turnState === "animating"}
                      className="rounded-xl border border-sky-700 bg-sky-900/20 hover:bg-sky-800/30 px-3 py-2.5 text-left transition disabled:opacity-40"
                    >
                      <div className="font-bold text-sky-100">🛡️ Défendre</div>
                    </button>

                    <button
                      onClick={() => handleAction("flee")}
                      disabled={turnState === "animating"}
                      className="rounded-xl border border-amber-700 bg-amber-900/20 hover:bg-amber-800/30 px-3 py-2.5 text-left transition disabled:opacity-40"
                    >
                      <div className="font-bold text-amber-100">🏃 Fuir</div>
                      <div className="text-xs text-amber-300 mt-1">
                        Quitte immédiatement le combat.
                      </div>
                    </button>
                  </div>

                  {unlockedSkills.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-violet-400 mb-2">
                        Compétences disponibles
                      </div>
                      <div className="space-y-2 max-h-[220px] xl:max-h-[260px] overflow-auto pr-1">
                        {unlockedSkills.map((skill) => {
                          const selected = selectedSkill?.id === skill.id;
                          const affordable = activePlayer.stats.mana >= skill.manaCost;

                          return (
                            <button
                              key={skill.id}
                              onClick={() => setSelectedSkillId(skill.id)}
                              className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                                selected
                                  ? "border-fuchsia-400 bg-fuchsia-500/10"
                                  : "border-violet-900 bg-black/20 hover:bg-violet-900/20"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-bold text-sm text-violet-100">
                                  {skill.icon} {skill.name}
                                </div>
                                <div
                                  className={`text-xs font-bold ${
                                    affordable ? "text-blue-300" : "text-red-300"
                                  }`}
                                >
                                  {skill.manaCost} mana
                                </div>
                              </div>
                              <div className="text-xs text-gray-300 mt-1">
                                {skill.description}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-2xl border border-violet-900 bg-[#1b0a3d]/70 p-4 flex-1 min-h-[180px] xl:min-h-[220px]">
              <div className="text-sm font-bold text-violet-200 mb-3">
                Journal du combat
              </div>
              <div className="space-y-2 max-h-[220px] xl:max-h-[340px] overflow-auto pr-1 text-sm">
                {logs.slice(0, 12).map((log, index) => (
                  <div
                    key={`${log}-${index}`}
                    className="rounded-lg border border-violet-900/60 bg-black/20 px-3 py-2 text-violet-100"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}