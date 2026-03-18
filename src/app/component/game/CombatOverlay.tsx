"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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

  const alliesRef = useRef(allies);
  const eStatsRef = useRef(eStats);
  const enemyStatusesRef = useRef(enemyStatuses);

  useEffect(() => {
    alliesRef.current = allies;
  }, [allies]);

  useEffect(() => {
    eStatsRef.current = eStats;
  }, [eStats]);

  useEffect(() => {
    enemyStatusesRef.current = enemyStatuses;
  }, [enemyStatuses]);

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

  const checkCombatEnd = () => {
    const livingAllies = alliesRef.current.filter((a) => !a.isDead);

    if (eStatsRef.current.hp <= 0) {
      onWin(buildCombatResults());
      return true;
    }

    if (livingAllies.length === 0) {
      onDefeat(buildCombatResults());
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

    if (checkCombatEnd()) return;

    setTimeout(() => {
      goToNextTurn();
    }, 900);
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

    updateAlly(actingAlly.playerId, (prev) => ({
      ...prev,
      stats: currentStats,
      statuses: currentStatuses,
      isDead: currentStats.hp <= 0,
    }));

    if (currentStats.hp <= 0) {
      if (checkCombatEnd()) return;
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
        mana: Math.min(currentStats.maxMana, currentStats.mana + 5),
      };

      const defendedStatuses = addStatus(currentStatuses, {
        type: "shield",
        value: 1,
        duration: 1,
        source: "defend",
      });

      updateAlly(actingAlly.playerId, (prev) => ({
        ...prev,
        stats: defendedStats,
        statuses: defendedStatuses,
        defending: true,
      }));

      addLog(`🛡️ ${actingAlly.player.name} adopte une posture défensive ! +5 mana`);

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

    const nextEnemyStats: Enemy = {
      ...currentEnemyStats,
      hp: Math.max(0, currentEnemyStats.hp - dmg),
    };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-7xl bg-[#1a0b2e] border-4 border-purple-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-3 border-b border-violet-900 bg-[#120720]">
          <div className="flex items-center justify-between">
            <div className="text-violet-200 font-bold">Round {displayRound}</div>
            <div className="flex gap-2 flex-wrap">
              {turnOrder.map((entry, idx) => {
                const label =
                  entry.kind === "enemy"
                    ? eStats.name
                    : allies.find((a) => a.playerId === entry.entityId)?.player.name ?? "Joueur";

                return (
                  <div
                    key={entry.id}
                    className={`px-3 py-1 rounded border text-xs ${
                      idx === activeTurnIndex
                        ? "bg-yellow-500/20 border-yellow-400 text-yellow-200"
                        : "bg-black/50 border-violet-900 text-violet-200"
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[420px_1fr_300px] gap-4 p-4">
          <div className="space-y-3">
            <div className="text-sm font-bold text-violet-200">Équipe</div>
            <div className="grid grid-cols-2 gap-3">
              {allies.map((ally) => {
                const isActive =
                  activeTurn?.kind === "player" &&
                  activeTurn.entityId === ally.playerId;

                return (
                  <motion.div
                    key={ally.playerId}
                    animate={shake === "player" && isActive ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                    className={`rounded-lg border p-3 ${
                      ally.isDead
                        ? "border-red-800 opacity-50 bg-red-950/20"
                        : isActive
                        ? "border-yellow-400 bg-yellow-500/10 shadow-[0_0_16px_rgba(250,204,21,0.18)]"
                        : "border-violet-800 bg-black/40"
                    }`}
                  >
                    <img
                      src={ally.player.image}
                      alt={ally.player.name}
                      className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-violet-500"
                    />
                    <div className="mt-2 text-center text-sm font-bold text-white">
                      {ally.player.name}
                    </div>
                    <div className="text-center text-xs text-violet-300">
                      {ally.player.classType}
                    </div>

                    <div className="mt-2 text-xs text-green-300">
                      HP {ally.stats.hp}/{ally.stats.maxHp}
                    </div>
                    <div className="text-xs text-blue-300">
                      Mana {ally.stats.mana}/{ally.stats.maxMana}
                    </div>

                    {ally.defending && (
                      <div className="mt-1 text-[11px] text-cyan-300 font-bold">
                        🛡️ Défense
                      </div>
                    )}

                    {ally.isDead && (
                      <div className="mt-1 text-[11px] text-red-400 font-bold">KO</div>
                    )}

                    {ally.statuses.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {ally.statuses.map((status, idx) => (
                          <div
                            key={`${ally.playerId}-${status.type}-${idx}`}
                            className="text-[10px] px-2 py-0.5 rounded bg-violet-950 border border-violet-700 text-violet-100"
                          >
                            {statusLabelMap[status.type]} ({status.duration})
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="h-72 rounded-xl border border-violet-900 bg-gradient-to-b from-[#0c0422] to-[#1a0b2e] flex items-center justify-center">
              <div className="text-6xl font-fantasy text-red-700 select-none">VS</div>
            </div>

            <div className="bg-[#0f0518] p-4 border border-purple-900 rounded-xl flex gap-4 min-h-[260px]">
              <div className="flex-1 bg-black/60 p-3 rounded-lg border border-purple-900/60 overflow-y-auto font-mono text-sm h-52">
                {logs.map((l, idx) => (
                  <div key={`${l}-${idx}`} className={idx === 0 ? "text-white" : "text-gray-500"}>
                    {l}
                  </div>
                ))}
              </div>

              <div className="w-80 flex flex-col gap-2">
                <div className="bg-black/50 border border-violet-900 rounded-lg p-2">
                  <div className="text-xs text-violet-300 mb-1 font-bold">
                    Compétence sélectionnée
                  </div>
                  <select
                    value={selectedSkill?.id || ""}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="w-full p-2 rounded bg-[#1b0a3d] text-white border border-violet-700 text-sm"
                    disabled={!activePlayer}
                  >
                    {unlockedSkills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.icon} {skill.name} — {skill.manaCost} mana
                      </option>
                    ))}
                  </select>
                  {selectedSkill && (
                    <div className="mt-2 text-xs text-gray-300">
                      {selectedSkill.description}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 content-center">
                  {activeTurn?.kind === "player" ? (
                    <>
                      <button
                        onClick={() => handleAction("attack")}
                        className="bg-red-800 hover:bg-red-700 text-white py-2.5 rounded-lg border-2 border-red-500 text-sm font-bold"
                      >
                        ⚔️ ATTAQUER
                      </button>

                      <button
                        onClick={() => handleAction("special")}
                        disabled={!selectedSkill || !canUseSelectedSkill}
                        className="bg-violet-800 hover:bg-violet-700 text-white py-2.5 rounded-lg border-2 border-violet-400 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedSkill ? `${selectedSkill.icon} ${selectedSkill.name}` : "Sort"}
                        {selectedSkill && (
                          <span className="block text-xs text-blue-300">
                            {selectedSkill.manaCost} mana
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleAction("defend")}
                        className="bg-cyan-900 hover:bg-cyan-800 text-white py-2.5 rounded-lg border-2 border-cyan-600 text-sm font-bold"
                      >
                        🛡️ DÉFENDRE
                        <span className="block text-xs text-cyan-300">+5 mana</span>
                      </button>

                      <button
                        onClick={() => handleAction("flee")}
                        className="bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg border-2 border-gray-500 text-sm font-bold"
                      >
                        🏃 FUIR
                      </button>
                    </>
                  ) : (
                    <div className="col-span-2 flex items-center justify-center text-red-400 font-bold animate-pulse text-lg">
                      👹 Tour de {eStats.name}...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-red-200 mb-3">Ennemi</div>
            <motion.div
              animate={shake === "enemy" ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className="text-center rounded-xl border border-red-900 bg-black/40 p-4"
            >
              <img
                src={eStats.image}
                alt={eStats.name}
                className="w-28 h-28 object-cover rounded-full border-4 border-red-700 shadow-[0_0_24px_rgba(220,38,38,0.6)] mx-auto"
              />
              <div className="mt-3 text-sm font-fantasy text-red-100 font-bold">
                {eStats.name}
              </div>
              <div className="text-xs text-red-400 uppercase">{eStats.archetype}</div>
              <div className="text-[10px] text-gray-300 mt-1">
                FOR {eStats.strength} • MAG {eStats.magic} • DEF {eStats.defense} • VIT {eStats.speed}
              </div>

              {eStats.passive && (
                <div className="text-[10px] text-amber-300 mt-1">{eStats.passive}</div>
              )}

              <div className="mt-3 text-left text-xs text-red-300">
                HP {eStats.hp}/{eStats.maxHp}
              </div>
              <div className="h-2 bg-gray-800 rounded overflow-hidden mt-1">
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${Math.max(0, (eStats.hp / eStats.maxHp) * 100)}%` }}
                />
              </div>

              {enemyStatuses.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                  {enemyStatuses.map((status, idx) => (
                    <div
                      key={`${status.type}-${idx}`}
                      className="text-[10px] px-2 py-0.5 rounded bg-red-950 border border-red-700 text-red-100"
                    >
                      {statusLabelMap[status.type]} ({status.duration})
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}