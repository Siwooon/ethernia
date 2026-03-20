"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getUnlockedSkills } from "@/app/component/data/abilities";
import {
  Enemy,
  EnemyAttack,
  Player,
  PlayerSkill,
  Stats,
  StatusEffect,
  TerrainEffect,
} from "@/app/component/types/game";
import { getDerivedPlayerStats } from "@/app/component/lib/playerStats";
import {
  addStatus,
  applyTurnStatusEffectsToStats,
  getStatusValue,
  hasStatus,
  applyStatusModifiersToStats,
} from "@/app/component/lib/statusEffects";
import { applyCombatStartMapEffects } from "@/app/component/lib/mapEffects";
import {
  applyTerrainEffectsEachTurn,
  applyTerrainEffectsOnCombatStart,
} from "@/app/component/lib/terrainEffects";
import { runPassives } from "@/app/component/lib/passives";

type CombatPlayerState = {
  playerId: number;
  player: Player;
  stats: Stats;
  statuses: StatusEffect[];
  defending: boolean;
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
  entityId: number | "enemy-main";
  speed: number;
};

type Props = {
  players: Player[];
  enemy: Enemy;
  terrainEffects?: TerrainEffect[];
  onWin: (results: CombatResultPlayer[]) => void;
  onDefeat: (results: CombatResultPlayer[]) => void;
  onFlee: (results: CombatResultPlayer[]) => void;
};

type SynergyWindow = {
  sourcePlayerId: number;
  statusType: StatusEffect["type"];
  sourceLabel: string;
};

const SYNERGY_STATUS_TYPES: StatusEffect["type"][] = [
  "burn",
  "poison",
  "frailty",
  "vulnerability",
  "silence",
  "weakness",
];

export default function CombatOverlay({
  players,
  enemy,
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

  const [eStats, setEStats] = useState<Enemy>({ ...enemy });
  const [enemyStatuses, setEnemyStatuses] = useState<StatusEffect[]>(
    enemy.statuses || []
  );

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [turnOrder, setTurnOrder] = useState<TurnEntry[]>([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const displayRound = actionCount + 1;
  const [turnState, setTurnState] = useState<"waiting" | "animating">("waiting");
  const [shake, setShake] = useState<"player" | "enemy" | null>(null);
  const [synergyWindow, setSynergyWindow] = useState<SynergyWindow | null>(null);

  const alliesRef = useRef(allies);
  const eStatsRef = useRef(eStats);
  const enemyStatusesRef = useRef(enemyStatuses);

  const [enemyAttackBanner, setEnemyAttackBanner] = useState<{
    name: string;
    description?: string;
    kind: "physical" | "magical" | "hybrid";
  } | null>(null);

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

  const statusLabelMap: Record<StatusEffect["type"], string> = {
    poison: "☠️ Poison",
    burn: "🔥 Brûlure",
    shield: "🛡️ Bouclier",
    regen: "✨ Régénération",
    weakness: "🪓 Faiblesse",
    frailty: "🩹 Fragilité",
    silence: "🔇 Silence",
    vulnerability: "🎯 Vulnérable",
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
  };

  const formatStatuses = (statuses: StatusEffect[]) => {
    return statuses.map((status, index) => ({
      key: `${status.type}-${status.source ?? "unknown"}-${index}`,
      label: statusLabelMap[status.type] ?? status.type,
      value: status.value,
      duration: status.duration,
      tone:
        statusToneMap[status.type] ?? {
          bg: "bg-slate-950/40",
          border: "border-slate-700",
          text: "text-slate-200",
        },
    }));
  };


  useEffect(() => {
    alliesRef.current = allies;
  }, [allies]);

  useEffect(() => {
    eStatsRef.current = eStats;
  }, [eStats]);

  useEffect(() => {
    enemyStatusesRef.current = enemyStatuses;
  }, [enemyStatuses]);

  useEffect(() => {
    if (!combatStillActive()) return;

    if (allies.every((a) => a.isDead)) {
      onDefeat(
        allies.map((ally) => ({
          playerId: ally.playerId,
          stats: ally.stats,
          statuses: ally.statuses,
          isDead: ally.isDead,
        }))
      );
    }
  }, [allies, eStats]);

  function combatStillActive() {
    return eStats.hp > 0;
  }

  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev]);

  const triggerShake = (target: "player" | "enemy") => {
    setShake(target);
    setTimeout(() => setShake(null), 350);
  };

  const updateAlly = (
    playerId: number,
    updater: (ally: CombatPlayerState) => CombatPlayerState
  ) => {
    setAllies((prev) =>
      prev.map((ally) => (ally.playerId === playerId ? updater(ally) : ally))
    );
  };

  const getAllyById = (playerId: number) =>
    alliesRef.current.find((a) => a.playerId === playerId);

  const buildCombatResults = (): CombatResultPlayer[] => {
    return alliesRef.current.map((ally) => ({
      playerId: ally.playerId,
      stats: ally.stats,
      statuses: ally.statuses,
      isDead: ally.isDead,
    }));
  };

  const buildTurnOrder = (currentAllies: CombatPlayerState[], currentEnemy: Enemy) => {
    const allyTurns: TurnEntry[] = currentAllies
      .filter((a) => !a.isDead)
      .map((a) => ({
        id: `player-${a.playerId}`,
        kind: "player",
        entityId: a.playerId,
        speed: a.stats.speed + Math.random() * 0.01,
      }));

    const enemyTurn: TurnEntry[] =
      currentEnemy.hp > 0
        ? [
            {
              id: "enemy-main",
              kind: "enemy",
              entityId: "enemy-main",
              speed: currentEnemy.speed + Math.random() * 0.01,
            },
          ]
        : [];

    return [...allyTurns, ...enemyTurn].sort((a, b) => b.speed - a.speed);
  };

  const rebuildTurnOrder = () => {
    const next = buildTurnOrder(alliesRef.current, eStatsRef.current);
    setTurnOrder(next);
    setActiveTurnIndex(0);
  };

  const goToNextTurn = () => {
    setActionCount((prev) => prev + 1);

    setActiveTurnIndex((prev) => {
      const nextIndex = prev + 1;

      if (nextIndex >= turnOrder.length) {
        const rebuilt = buildTurnOrder(alliesRef.current, eStatsRef.current);
        setTurnOrder(rebuilt);
        return 0;
      }

      return nextIndex;
    });

    setTurnState("waiting");
  };

  const checkCombatEnd = (
    nextAllies: CombatPlayerState[] = alliesRef.current,
    nextEnemy: Enemy = eStatsRef.current
  ) => {
    const livingAllies = nextAllies.filter((a) => !a.isDead);

    if (nextEnemy.hp <= 0) {
      onWin(
        nextAllies.map((ally) => ({
          playerId: ally.playerId,
          stats: ally.stats,
          statuses: ally.statuses,
          isDead: ally.isDead,
        }))
      );
      return true;
    }

    if (livingAllies.length === 0) {
      onDefeat(
        nextAllies.map((ally) => ({
          playerId: ally.playerId,
          stats: ally.stats,
          statuses: ally.statuses,
          isDead: ally.isDead,
        }))
      );
      return true;
  }

  return false;
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

    const enemyPassiveResult = runPassives(enemy.passives ?? [], {
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
      const result = applyPassiveTriggerForAlly(
        ally,
        "combat_start",
        ally.stats,
        eStatsRef.current,
        ally.statuses,
        enemyStatusesRef.current
      );

      return {
        ...ally,
        stats: result.playerStats,
        statuses: result.playerStatuses,
        isDead: result.playerStats.hp <= 0,
      };
    });

    setAllies(initializedAllies);
    setTurnOrder(buildTurnOrder(initializedAllies, eStatsRef.current));
  }, []);

  const activeTurn = turnOrder[activeTurnIndex];
  const activePlayer =
    activeTurn?.kind === "player"
      ? allies.find((a) => a.playerId === activeTurn.entityId)
      : null;

  const unlockedSkills = useMemo(() => {
    if (!activePlayer) return [];
    return getUnlockedSkills(activePlayer.player.classType, activePlayer.player.level);
  }, [activePlayer]);

  const selectedSkill =
    unlockedSkills.find((skill) => skill.id === selectedSkillId) || unlockedSkills[0];

  const consumeStatusForSynergy = (
    statuses: StatusEffect[],
    type: StatusEffect["type"]
  ) => {
    let consumed = false;

    const next = statuses
      .map((status, idx) => {
        if (!consumed && idx >= 0 && status.type === type) {
          consumed = true;
          return {
            ...status,
            duration: status.duration - 1,
          };
        }

        return status;
      })
      .filter((status) => status.duration > 0);

    return { statuses: next, consumed };
  };

  const resolveTeamSynergy = (
    actingPlayerId: number,
    currentEnemyStatuses: StatusEffect[],
    currentDamage: number,
    actingStats: Stats
  ) => {
    if (!synergyWindow || synergyWindow.sourcePlayerId === actingPlayerId) {
      return {
        damage: currentDamage,
        enemyStatuses: currentEnemyStatuses,
        manaGain: 0,
        log: null as string | null,
      };
    }

    const matchingStatus = currentEnemyStatuses.find(
      (status) => status.type === synergyWindow.statusType
    );

    if (!matchingStatus) {
      return {
        damage: currentDamage,
        enemyStatuses: currentEnemyStatuses,
        manaGain: 0,
        log: null as string | null,
      };
    }

    const bonusDamage = Math.max(
      6,
      Math.floor((actingStats.strength + actingStats.magic) * 0.2)
    );
    const consumedStatus = consumeStatusForSynergy(
      currentEnemyStatuses,
      synergyWindow.statusType
    );

    if (!consumedStatus.consumed) {
      return {
        damage: currentDamage,
        enemyStatuses: currentEnemyStatuses,
        manaGain: 0,
        log: null as string | null,
      };
    }

    return {
      damage: currentDamage + bonusDamage,
      enemyStatuses: consumedStatus.statuses,
      manaGain: 4,
      log: `🤝 Synergie d'équipe : ${statusLabelMap[synergyWindow.statusType]} est consommé, +${bonusDamage} dégâts et +4 mana.`,
    };
  };

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

    const shieldStatus = hasStatus(targetStatuses, "shield");
    const shieldMultiplier = targetDefending ? 0.4 : shieldStatus ? 0.65 : 1;
    const shielded = Math.floor(raw * shieldMultiplier);
    const reduced = Math.max(1, shielded - Math.floor(playerData.defense / 3));

    let final = reduced;
    final += getStatusValue(targetStatuses, "vulnerability");

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

      if (condition.type === "self_hp_below" && stats.hp / stats.maxHp <= condition.threshold) {
        bonusFlat += condition.bonusFlat ?? 0;
        bonusMultiplier += condition.bonusMultiplier ?? 0;
        triggeredConditions.push("PV bas");
      }

      if (condition.type === "self_mana_above" && stats.mana / stats.maxMana >= condition.threshold) {
        bonusFlat += condition.bonusFlat ?? 0;
        bonusMultiplier += condition.bonusMultiplier ?? 0;
        triggeredConditions.push("mana élevé");
      }

      if (condition.type === "target_hp_below" && enemyData.hp / enemyData.maxHp <= condition.threshold) {
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

    dmg += enemyStatusesArg
      .filter((s) => s.type === "vulnerability")
      .reduce((sum, s) => sum + s.value, 0);

    return { dmg, crit, triggeredConditions };
  };

  const doEnemyTurn = () => {
    if (turnState === "animating") return;
    setTurnState("animating");
    setSynergyWindow(null);

    const enemyStatusResult = applyTurnStatusEffectsToStats({
      hp: eStatsRef.current.hp,
      maxHp: eStatsRef.current.maxHp,
      statuses: enemyStatusesRef.current,
    });

    enemyStatusResult.logs.forEach((log) =>
      addLog(`👹 ${eStatsRef.current.name} — ${log}`)
    );

    setEnemyStatuses(enemyStatusResult.statuses);
    setEStats((prev) => ({ ...prev, hp: enemyStatusResult.hp }));

    if (enemyStatusResult.hp <= 0) {
      onWin(buildCombatResults());
      return;
    }

    const livingAllies = alliesRef.current.filter((a) => !a.isDead);
    if (livingAllies.length === 0) {
      onDefeat(buildCombatResults());
      return;
    }

    const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];

    const es = applyStatusModifiersToStats({
      ...eStatsRef.current,
      hp: enemyStatusResult.hp,
      statuses: enemyStatusesRef.current,
    });

    const attack = es.attacks[Math.floor(Math.random() * es.attacks.length)] || es.attacks[0];

    setEnemyAttackBanner({
      name: attack.name,
      description: attack.description,
      kind: attack.kind,
    });
    triggerShake("enemy");

    const { damage, crit } = computeEnemyDamage(
      attack,
      es,
      target.stats,
      target.statuses,
      target.defending
    );

    const finalHp = Math.max(0, target.stats.hp - damage);
    let nextStatuses = [...target.statuses];

    if (attack.statusEffect?.target === "player") {
      nextStatuses = addStatus(nextStatuses, {
        type: attack.statusEffect.type,
        value: attack.statusEffect.value,
        duration: attack.statusEffect.duration,
        source: attack.name,
      });
    }

    let nextStats: Stats = {
      ...target.stats,
      hp: finalHp,
      mana: attack.manaBurn
        ? Math.max(0, target.stats.mana - attack.manaBurn)
        : target.stats.mana,
    };

    const terrainTurnResult = applyTerrainEffectsEachTurn(nextStats, terrainEffects);
    nextStats = terrainTurnResult.stats;
    terrainTurnResult.logs.forEach((log) =>
      addLog(`🌫️ ${target.player.name} — ${log}`)
    
    );

    const passiveResult = applyPassiveTriggerForAlly(
      target,
      "after_take_damage",
      nextStats,
      es,
      nextStatuses,
      enemyStatusesRef.current
    );

    updateAlly(target.playerId, (prev) => ({
      ...prev,
      stats: passiveResult.playerStats,
      statuses: passiveResult.playerStatuses,
      defending: false,
      isDead: passiveResult.playerStats.hp <= 0,
    }));

    setEStats(passiveResult.enemyStats);
    setEnemyStatuses(passiveResult.enemyStatuses);

    if (attack.statusEffect?.target === "enemy") {
      setEnemyStatuses((prev) =>
        addStatus(prev, {
          type: attack.statusEffect!.type,
          value: attack.statusEffect!.value,
          duration: attack.statusEffect!.duration,
          source: attack.name,
        })
      );
    }

    if (attack.selfHealPercent) {
      const heal = Math.max(1, Math.floor(damage * attack.selfHealPercent));
      setEStats((prev) => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + heal),
      }));
    }

    triggerShake("player");

    addLog(
      `👹 ${es.name} utilise ${attack.name} sur ${target.player.name} : -${damage} PV${
        crit ? " 💥 CRITIQUE !" : ""
      }${attack.manaBurn ? ` -${attack.manaBurn} Mana` : ""}`
    );
    setTimeout(() => {
      setEnemyAttackBanner(null);
    }, 900);

    if (checkCombatEnd()) return;

    setTimeout(() => {
      goToNextTurn();
    }, 900);
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

  const handleAction = (action: "attack" | "special" | "defend" | "flee") => {
    if (!activeTurn || activeTurn.kind !== "player" || turnState === "animating") return;

    const actingAlly = getAllyById(activeTurn.entityId as number);
    if (!actingAlly || actingAlly.isDead) return;

    const playerStatusResult = applyTurnStatusEffectsToStats({
      hp: actingAlly.stats.hp,
      maxHp: actingAlly.stats.maxHp,
      statuses: actingAlly.statuses,
    });

    playerStatusResult.logs.forEach((log) =>
      addLog(`🧙 ${actingAlly.player.name} — ${log}`)
    );

    let currentStatuses = playerStatusResult.statuses;

    const modifiedPlayerStats = applyStatusModifiersToStats({
      ...actingAlly.stats,
      hp: playerStatusResult.hp,
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

    updateAlly(actingAlly.playerId, (prev) => ({
      ...prev,
      stats: currentStats,
      statuses: currentStatuses,
      isDead: currentStats.hp <= 0,
    }));

    if (currentStats.hp <= 0) {
      if (checkCombatEnd(nextAlliesAfterSelfUpdate, eStatsRef.current)) return;
      goToNextTurn();
      return;
    }

    const es = applyStatusModifiersToStats({
      ...eStatsRef.current,
      statuses: enemyStatusesRef.current,
    });

    const startTurnResult = applyPassiveTriggerForAlly(
      actingAlly,
      "turn_start",
      currentStats,
      es,
      currentStatuses,
      enemyStatusesRef.current
    );

    currentStats = startTurnResult.playerStats;
    currentStatuses = startTurnResult.playerStatuses;
    const currentEnemyStats = startTurnResult.enemyStats;

    setEStats(startTurnResult.enemyStats);
    setEnemyStatuses(startTurnResult.enemyStatuses);

if (action === "defend") {
  const defendedStats: Stats = {
    ...currentStats,
    mana: Math.min(currentStats.maxMana, currentStats.mana + 6),
    hp: Math.min(currentStats.maxHp, currentStats.hp + 3),
  };

  const defendedStatuses = addStatus(currentStatuses, {
    type: "shield",
    value: 2,
    duration: 1,
    source: "defend",
  });
  addLog(
    `🛡️ ${actingAlly.player.name} se met en garde : +6 mana +3 PV +Bouclier.`
  );

  updateAlly(actingAlly.playerId, (prev) => ({
    ...prev,
    stats: defendedStats,
    statuses: defendedStatuses,
    defending: true,
  }));

  setTimeout(() => {
    if (!checkCombatEnd()) goToNextTurn();
  }, 300);
  return;
}

    if (action === "flee") {
      addLog(`🏃 ${actingAlly.player.name} fuit le combat !`);
      updateAlly(actingAlly.playerId, (prev) => ({
        ...prev,
        isDead: false,
      }));
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

      const enemyShieldedRaw = hasStatus(enemyStatusesRef.current, "shield")
        ? Math.floor(raw * 0.65)
        : raw;

      const reduced = Math.max(1, enemyShieldedRaw - Math.floor(currentEnemyStats.defense / 2));
      const baseDamage = reduced + getStatusValue(enemyStatusesRef.current, "vulnerability");
      const isCrit = Math.random() < 0.1;
      dmg = isCrit ? baseDamage * 2 : baseDamage;

      logMsg = isCrit
        ? `⚔️ ${actingAlly.player.name} — Attaque critique ! -${dmg} PV`
        : `⚔️ ${actingAlly.player.name} attaque : -${dmg} PV`;
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
        enemyStatusesRef.current
      );

      dmg = result.dmg;

      if (result.triggeredConditions.length > 0) {
        addLog(
          `✨ ${actingAlly.player.name} renforce ${selectedSkill.name} : ${result.triggeredConditions.join(", ")}`
        );
      }

      logMsg = `${selectedSkill.icon} ${actingAlly.player.name} — ${selectedSkill.name} : -${dmg} PV${
        result.crit ? " 💥 CRITIQUE !" : ""
      }`;
    }

    let nextPlayerStats: Stats =
      manaCost > 0
        ? { ...currentStats, mana: currentStats.mana - manaCost }
        : currentStats;

    let updatedPlayerStatuses = [...currentStatuses];
    let updatedEnemyStatuses = [...enemyStatusesRef.current];

    if (action === "special" && selectedSkill?.extraEffects) {
      for (const effect of selectedSkill.extraEffects) {
        if (effect.type === "apply_status") {
          const chanceOk = effect.chance === undefined || Math.random() < effect.chance;

          if (chanceOk && effect.target === "enemy") {
            updatedEnemyStatuses = addStatus(updatedEnemyStatuses, {
              type: effect.status,
              value: effect.value,
              duration: effect.duration,
              source: selectedSkill.name,
            });
            addLog(`☠️ ${selectedSkill.name} applique ${effect.status}`);

            if (SYNERGY_STATUS_TYPES.includes(effect.status)) {
              setSynergyWindow({
                sourcePlayerId: actingAlly.playerId,
                statusType: effect.status,
                sourceLabel: selectedSkill.name,
              });
              addLog(`🪄 Amorçage : ${selectedSkill.name} prépare une synergie sur ${statusLabelMap[effect.status]}.`);
            }
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
          }
        }
      }
    }

    const synergyResult = resolveTeamSynergy(
      actingAlly.playerId,
      updatedEnemyStatuses,
      dmg,
      nextPlayerStats
    );

    dmg = synergyResult.damage;
    updatedEnemyStatuses = synergyResult.enemyStatuses;
    if (synergyResult.manaGain > 0) {
      nextPlayerStats = {
        ...nextPlayerStats,
        mana: Math.min(nextPlayerStats.maxMana, nextPlayerStats.mana + synergyResult.manaGain),
      };
      setSynergyWindow(null);
    }
    if (synergyResult.log) {
      addLog(synergyResult.log);
    }

    const nextEnemyStats: Enemy = {
      ...currentEnemyStats,
      hp: Math.max(0, currentEnemyStats.hp - dmg),
    };

    const afterAttackResult = applyPassiveTriggerForAlly(
      actingAlly,
      "after_attack",
      nextPlayerStats,
      nextEnemyStats,
      updatedPlayerStatuses,
      updatedEnemyStatuses
    );

    updateAlly(actingAlly.playerId, (prev) => ({
      ...prev,
      stats: afterAttackResult.playerStats,
      statuses: afterAttackResult.playerStatuses,
      isDead: afterAttackResult.playerStats.hp <= 0,
      defending: false,
    }));

    setEStats(afterAttackResult.enemyStats);
    setEnemyStatuses(afterAttackResult.enemyStatuses);

    triggerShake("enemy");
    addLog(logMsg);

    if (afterAttackResult.enemyStats.hp <= 0) {
      setTimeout(() => onWin(buildCombatResults()), 700);
      return;
    }

    setTimeout(() => {
      if (!checkCombatEnd()) goToNextTurn();
    }, 700);
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

  const displayedPlayer = activePlayer?.player;
  const displayedStats = activePlayer?.stats;
  const displayedStatuses = activePlayer?.statuses ?? [];
  const displayedDefending = activePlayer?.defending ?? false;

  const canUseSelectedSkill =
    !!selectedSkill && (displayedStats?.mana ?? 0) >= selectedSkill.manaCost;

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
          title={`${status.label} • valeur ${status.value} • ${status.duration} tour(s)`}
        >
          {status.label} · {status.value} · {status.duration}t
        </div>
      ))}
    </div>
  );
};

const renderPlayerCard = (ally: CombatPlayerState) => {
  const isActive =
    activeTurn?.kind === "player" && activeTurn.entityId === ally.playerId;

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
          {ally.isDead && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-red-500 bg-red-500/20 text-red-100">
              Mort
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between text-[11px] text-red-200 mb-1">
            <span>PV</span>
            <span>
              {ally.stats.hp}/{ally.stats.maxHp}
            </span>
          </div>
          <div className="h-2 rounded bg-black/40 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${ally.stats.maxHp > 0 ? (ally.stats.hp / ally.stats.maxHp) * 100 : 0}%`,
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
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center px-3 xl:px-4 py-3 xl:py-6 overflow-hidden">
    <AnimatePresence>
      {enemyAttackBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          className="absolute top-4 xl:top-8 left-1/2 -translate-x-1/2 z-[120] pointer-events-none px-4 w-full flex justify-center"
        >
          <div className="rounded-2xl border border-red-500/70 bg-black/85 px-4 xl:px-6 py-3 xl:py-4 shadow-[0_0_25px_rgba(239,68,68,0.35)] w-full max-w-[420px] text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-red-300 mb-1">
              Attaque ennemie
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
                    : eStats.name}
                </div>
              </div>
            </div>

            <div
              className={`rounded-2xl border p-5 mb-5 ${
                shake === "enemy"
                  ? "border-red-500 bg-red-950/20"
                  : "border-violet-800 bg-[#1b0a3d]/70"
              }`}
            >
            <div className="flex items-start gap-4">
              <div className="w-24 xl:w-28 shrink-0">
                <div className="rounded-2xl border border-violet-700 bg-black/30 p-2 shadow-inner">
                  <div className="aspect-square overflow-hidden rounded-xl bg-black/40 flex items-center justify-center">
                    {eStats.image ? (
                      <img
                        src={eStats.image}
                        alt={eStats.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl">👹</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="text-xs uppercase tracking-[0.2em] text-red-300">
                  Ennemi
                </div>
                <div className="text-xl xl:text-2xl font-bold text-violet-100 mt-1">
                  {eStats.name}
                </div>
                <div className="text-xs xl:text-sm text-violet-300 mt-1">
                  {eStats.archetype}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-red-200 mb-1">
                    <span>PV</span>
                    <span>
                      {eStats.hp}/{eStats.maxHp}
                    </span>
                  </div>
                  <div className="h-3 rounded bg-black/40 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${eStats.maxHp > 0 ? (eStats.hp / eStats.maxHp) * 100 : 0}%`,
                        background:
                          "linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(248,113,113,1) 100%)",
                      }}
                    />
                  </div>
                </div>

                {renderStatusBadges(enemyStatuses)}
              </div>
            </div>
            </div>

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
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAction("attack")}
                      disabled={turnState === "animating"}
                      className="rounded-xl border border-violet-700 bg-violet-900/30 hover:bg-violet-800/40 px-3 py-2.5 text-left transition"
                    >
                      <div className="font-bold text-violet-100">⚔️ Attaquer</div>
                      <div className="text-xs text-violet-300 mt-1">
                        Attaque stable basée sur la Force.
                      </div>
                    </button>

                    <button
                      onClick={() => handleAction("special")}
                      disabled={turnState === "animating" || !selectedSkill}
                      className="rounded-xl border border-fuchsia-700 bg-fuchsia-900/20 hover:bg-fuchsia-800/30 px-3 py-2.5 text-left transition"
                    >
                      <div className="font-bold text-fuchsia-100">
                        ✨ Compétence
                      </div>
                      <div className="text-xs text-fuchsia-300 mt-1">
                        {selectedSkill
                          ? `${selectedSkill.name} • ${selectedSkill.manaCost} mana`
                          : "Aucune compétence"}
                      </div>
                    </button>

                    <button
                      onClick={() => handleAction("defend")}
                      disabled={turnState === "animating"}
                      className="rounded-xl border border-sky-700 bg-sky-900/20 hover:bg-sky-800/30 px-3 py-2.5 text-left transition"
                    >
                      <div className="font-bold text-sky-100">🛡️ Défendre</div>
                      <div className="text-xs text-sky-300 mt-1">
                        +6 mana, +3 PV, +Bouclier.
                      </div>
                    </button>

                    <button
                      onClick={() => handleAction("flee")}
                      disabled={turnState === "animating"}
                      className="rounded-xl border border-amber-700 bg-amber-900/20 hover:bg-amber-800/30 px-3 py-2.5 text-left transition"
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
                {logs.slice(0, 10).map((log, index) => (
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