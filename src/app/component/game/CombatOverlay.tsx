"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getUnlockedSkills } from "@/app/component/data/abilities";
import { Enemy, EnemyAttack, Player, PlayerSkill, Stats, StatusEffect } from "@/app/component/types/game";
import { getEffectiveStats } from "@/app/component/lib/equipment";
import { addStatus, applyTurnStatusEffectsToStats, getStatusValue, hasStatus } from "@/app/component/lib/statusEffects";
import { applyCombatStartMapEffects, consumeCombatMapEffects } from "@/app/component/lib/mapEffects";

type Props = {
  player: Player;
  enemy: Enemy;
  onWin: (remainingStats: Stats) => void;
  onDefeat: () => void;
  onFlee: (remainingStats: Stats) => void;
};

export default function CombatOverlay({
  player,
  enemy,
  onWin,
  onDefeat,
  onFlee,
}: Props) {
  const [logs, setLogs] = useState<string[]>(["⚔️ Le combat commence !"]);
  const basePlayerStats = getEffectiveStats(player);
  const blessingBonus = player.mapEffects
    ?.filter((e) => e.type === "blessing")
    .reduce((sum, e) => sum + e.value, 0) || 0;

  const [pStats, setPStats] = useState<Stats>({
    ...basePlayerStats,
    magic: basePlayerStats.magic + blessingBonus,
  });
  const [eStats, setEStats] = useState<Enemy>({ ...enemy });
  const [turn, setTurn] = useState<"player" | "animating">("player");
  const [defending, setDefending] = useState(false);
  const [shake, setShake] = useState<"player" | "enemy" | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [playerStatuses, setPlayerStatuses] = useState<StatusEffect[]>([
    ...(player.statuses || []),
    ...applyCombatStartMapEffects(player),
  ]);
  const [enemyStatuses, setEnemyStatuses] = useState<StatusEffect[]>(enemy.statuses || []);

  const pStatsRef = useRef(pStats);
  const eStatsRef = useRef(eStats);
  const defendingRef = useRef(defending);
  const playerStatusesRef = useRef(playerStatuses);
  const enemyStatusesRef = useRef(enemyStatuses);

  useEffect(() => {
    pStatsRef.current = pStats;
  }, [pStats]);

  useEffect(() => {
    eStatsRef.current = eStats;
  }, [eStats]);

  useEffect(() => {
    defendingRef.current = defending;
  }, [defending]);
  useEffect(() => {
    playerStatusesRef.current = playerStatuses;
  }, [playerStatuses]);
  useEffect(() => {
    enemyStatusesRef.current = enemyStatuses;
  }, [enemyStatuses]);

  const unlockedSkills = useMemo(
    () => getUnlockedSkills(player.classType, player.level),
    [player.classType, player.level]
  );

  const selectedSkill =
    unlockedSkills.find((skill) => skill.id === selectedSkillId) || unlockedSkills[0];

  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev]);

  const triggerShake = (target: "player" | "enemy") => {
    setShake(target);
    setTimeout(() => setShake(null), 400);
  };

  const computeEnemyDamage = (attack: EnemyAttack, enemyData: Enemy, playerData: Stats) => {
    let raw = 0;

    if (attack.kind === "physical") {
      raw = enemyData.strength * attack.powerMultiplier;
    } else if (attack.kind === "magical") {
      raw = enemyData.magic * attack.powerMultiplier;
    } else {
      raw = (enemyData.strength + enemyData.magic) * 0.5 * attack.powerMultiplier;
    }

    const variable = 0.9 + Math.random() * 0.25;
    raw = Math.floor(raw * variable);

    const shieldStatus = hasStatus(playerStatusesRef.current, "shield");
    const shieldMultiplier = defendingRef.current ? 0.4 : shieldStatus ? 0.65 : 1;
    const shielded = Math.floor(raw * shieldMultiplier);
    const reduced = Math.max(1, shielded - Math.floor(playerData.defense / 3));

    let final = reduced;

    const critChance = attack.critChance ?? (enemyData.archetype === "assassin" ? 0.18 : 0.08);
    const crit = Math.random() < critChance;
    if (crit) final *= 2;

    return { damage: final, crit };
  };

  const statusLabelMap: Record<StatusEffect["type"], string> = {
    poison: "☠️ Poison",
    burn: "🔥 Brûlure",
    shield: "🛡️ Bouclier",
    regen: "✨ Régénération",
  };

  const doEnemyTurn = () => {
    const enemyStatusResult = applyTurnStatusEffectsToStats({
      hp: eStatsRef.current.hp,
      maxHp: eStatsRef.current.maxHp,
      statuses: enemyStatusesRef.current,
    });

    if (enemyStatusResult.logs.length > 0) {
      enemyStatusResult.logs.forEach((log) => addLog(`👹 ${eStatsRef.current.name} — ${log}`));
    }

    setEnemyStatuses(enemyStatusResult.statuses);
    setEStats((prev) => ({
      ...prev,
      hp: enemyStatusResult.hp,
    }));

    if (enemyStatusResult.hp <= 0) {
      setTimeout(() => onWin(pStatsRef.current), 600);
      return;
    }
    const ps = pStatsRef.current;
    const es = {
      ...eStatsRef.current,
      hp: enemyStatusResult.hp,
    };
    const attack =
      es.attacks[Math.floor(Math.random() * es.attacks.length)] || es.attacks[0];

    const { damage, crit } = computeEnemyDamage(attack, es, ps);
    const finalHp = Math.max(0, ps.hp - damage);

    triggerShake("player");

    setPStats((prev) => {
      let nextMana = prev.mana;

      if (attack.manaBurn) {
        nextMana = Math.max(0, nextMana - attack.manaBurn);
      }

      return {
        ...prev,
        hp: finalHp,
        mana: nextMana,
      };
    });
    if (attack.statusEffect) {
      const effect = attack.statusEffect;

      if (effect.target === "player") {
        setPlayerStatuses((prev) =>
          addStatus(prev, {
            type: effect.type,
            value: effect.value,
            duration: effect.duration,
            source: attack.name,
          })
        );
      }

      if (effect.target === "enemy") {
        setEnemyStatuses((prev) =>
          addStatus(prev, {
            type: effect.type,
            value: effect.value,
            duration: effect.duration,
            source: attack.name,
          })
        );
      }
    }

    if (attack.selfHealPercent) {
      setEStats((prev) => {
        const heal = Math.max(1, Math.floor(damage * attack.selfHealPercent!));
        return {
          ...prev,
          hp: Math.min(prev.maxHp, prev.hp + heal),
        };
      });
    }

    setDefending(false);

    const critText = crit ? " 💥 CRITIQUE !" : "";
    const manaText = attack.manaBurn ? ` -${attack.manaBurn} Mana` : "";

    let statusText = "";
    if (attack.statusEffect) {
      if (attack.statusEffect.type === "poison") statusText = " + Poison";
      if (attack.statusEffect.type === "burn") statusText = " + Brûlure";
      if (attack.statusEffect.type === "shield") statusText = " + Bouclier";
      if (attack.statusEffect.type === "regen") statusText = " + Régénération";
    }

    addLog(
      `👹 ${es.name} utilise ${attack.name} : -${damage} PV${critText}${manaText}${statusText}`
    );

    if (finalHp <= 0) {
      setTimeout(() => onDefeat(), 800);
    } else {
      setTurn("player");
    }
  };

  const computePlayerSkillDamage = (skill: PlayerSkill, stats: Stats, enemyData: Enemy) => {
    let base = 0;

    if (skill.scaling === "strength") {
      base = stats.strength * skill.multiplier;
    } else if (skill.scaling === "magic") {
      base = stats.magic * skill.multiplier;
    } else {
      base = (stats.strength + stats.magic) * skill.multiplier;
    }

    let dmg = Math.floor(base);

    if (!skill.ignoreDefense) {
      dmg = Math.max(1, dmg - Math.floor(enemyData.defense / 2));
    }

    const crit = skill.guaranteedCrit || false;
    if (crit) dmg *= 2;

    return { dmg, crit };
  };

  const handleAction = (action: "attack" | "special" | "defend" | "flee") => {
    if (turn !== "player") return;
    const playerStatusResult = applyTurnStatusEffectsToStats({
      hp: pStatsRef.current.hp,
      maxHp: pStatsRef.current.maxHp,
      statuses: playerStatusesRef.current,
    });

    if (playerStatusResult.logs.length > 0) {
      playerStatusResult.logs.forEach((log) => addLog(`🧙 ${player.name} — ${log}`));
    }

    setPlayerStatuses(playerStatusResult.statuses);
    setPStats((prev) => ({
      ...prev,
      hp: playerStatusResult.hp,
    }));

    if (playerStatusResult.hp <= 0) {
      setTimeout(() => onDefeat(), 600);
      return;
    }
    setTurn("animating");

    const ps = {
      ...pStatsRef.current,
      hp: playerStatusResult.hp,
    };
    const es = eStatsRef.current;

    if (action === "defend") {
      setDefending(true);
      setPStats((prev) => ({
        ...prev,
        mana: Math.min(prev.maxMana, prev.mana + 5),
      }));
      addLog("🛡️ Posture défensive ! Bouclier actif, +5 mana");
      setPlayerStatuses((prev) =>
        addStatus(prev, { type: "shield", value: 1, duration: 1, source: "defend" })
      );
      setTimeout(doEnemyTurn, 1000);
      return;
    }

    if (action === "flee") {
      if (Math.random() < 0.4) {
        addLog("🏃 Vous fuyez le combat !");
        setTimeout(() => onFlee(pStatsRef.current), 800);
      } else {
        addLog("❌ Impossible de fuir !");
        setTimeout(doEnemyTurn, 1000);
      }
      return;
    }

    let dmg = 0;
    let logMsg = "";
    let manaCost = 0;

    if (action === "attack") {
      const raw = Math.max(1, Math.floor(ps.strength * (0.8 + Math.random() * 0.4)));
      const enemyShieldedRaw = hasStatus(enemyStatusesRef.current, "shield")
        ? Math.floor(raw * 0.65)
        : raw;

      const reduced = Math.max(1, enemyShieldedRaw - Math.floor(es.defense / 2));
      const isCrit = Math.random() < 0.1;
      dmg = isCrit ? reduced * 2 : reduced;

      logMsg = isCrit
        ? `⚔️ Attaque — CRITIQUE ! -${dmg} PV !`
        : `⚔️ Attaque : -${dmg} PV`;
    }

    if (action === "special") {
      if (!selectedSkill) {
        addLog("❌ Aucun sort disponible.");
        setTurn("player");
        return;
      }

      manaCost = selectedSkill.manaCost;

      if (ps.mana < manaCost) {
        addLog("❌ Pas assez de mana !");
        setTurn("player");
        return;
      }

      const result = computePlayerSkillDamage(selectedSkill, ps, es);
      dmg = result.dmg;
      if (player.classType === "Mage") {
        setEnemyStatuses((prev) =>
          addStatus(prev, { type: "burn", value: 6, duration: 2, source: selectedSkill.name })
        );
      }

      if (player.classType === "Voleur") {
        setEnemyStatuses((prev) =>
          addStatus(prev, { type: "poison", value: 5, duration: 3, source: selectedSkill.name })
        );
      }

      if (player.classType === "Invocateur") {
        setPlayerStatuses((prev) =>
          addStatus(prev, { type: "regen", value: 6, duration: 2, source: selectedSkill.name })
        );
      }

      if (player.classType === "Guerrier") {
        setPlayerStatuses((prev) =>
          addStatus(prev, { type: "shield", value: 1, duration: 1, source: selectedSkill.name })
        );
      }
      if (player.classType === "Mage") logMsg += " + Brûlure";
      if (player.classType === "Voleur") logMsg += " + Poison";
      if (player.classType === "Invocateur") logMsg += " + Régénération";
      if (player.classType === "Guerrier") logMsg += " + Bouclier";

      logMsg = `${selectedSkill.icon} ${selectedSkill.name} : -${dmg} PV${
        result.crit ? " 💥 CRITIQUE !" : ""
      }`;
    }

    const newEHp = Math.max(0, es.hp - dmg);

    triggerShake("enemy");
    setEStats((prev) => ({ ...prev, hp: newEHp }));

    if (manaCost > 0) {
      setPStats((prev) => ({ ...prev, mana: prev.mana - manaCost }));
    }

    addLog(logMsg);

    if (newEHp <= 0) {
      setTimeout(() => onWin(pStatsRef.current), 800);
      return;
    }

    setTimeout(doEnemyTurn, 1200);
  };

  const isPlayerTurn = turn === "player";
  const canUseSelectedSkill = selectedSkill ? pStats.mana >= selectedSkill.manaCost : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-[#1a0b2e] border-4 border-purple-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="relative h-64 flex items-center justify-between px-16 bg-gradient-to-b from-[#0c0422] to-[#1a0b2e]">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 pointer-events-none" />

          <motion.div
            animate={shake === "player" ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center"
          >
            <img
              src={player.image}
              alt={player.name}
              className="w-28 h-28 object-cover rounded-full border-4 border-violet-500 shadow-[0_0_24px_rgba(168,117,255,0.6)] mx-auto"
            />
            <div className="mt-2 bg-black/80 px-3 py-2 rounded-lg border border-violet-800 min-w-[170px]">
              <div className="text-sm font-fantasy text-violet-100 font-bold">{player.name}</div>
              <div className="text-xs text-violet-400 mb-1">
                {player.classType} • Niv. {player.level}
              </div>

              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs w-4">❤️</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${Math.max(0, (pStats.hp / pStats.maxHp) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-green-400 ml-1">
                  {pStats.hp}/{pStats.maxHp}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs w-4">💧</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(pStats.mana / pStats.maxMana) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-blue-400 ml-1">
                  {pStats.mana}/{pStats.maxMana}
                </span>
              </div>

              {defending && (
                <div className="mt-1 text-xs text-cyan-300 font-bold">🛡️ EN DÉFENSE</div>
              )}
              {playerStatuses.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {playerStatuses.map((status, idx) => (
                    <div
                      key={`${status.type}-${idx}`}
                      className="text-[10px] px-2 py-0.5 rounded bg-violet-950 border border-violet-700 text-violet-100"
                    >
                      {statusLabelMap[status.type]} ({status.duration})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <div className="text-5xl font-fantasy text-red-600 animate-pulse select-none">VS</div>

          <motion.div
            animate={shake === "enemy" ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center"
          >
            <img
              src={eStats.image}
              alt={eStats.name}
              className="w-28 h-28 object-cover rounded-full border-4 border-red-700 shadow-[0_0_24px_rgba(220,38,38,0.6)] mx-auto"
            />
            <div className="mt-2 bg-black/80 px-3 py-2 rounded-lg border border-red-900 min-w-[200px]">
              <div className="text-sm font-fantasy text-red-100 font-bold">{eStats.name}</div>
              <div className="text-xs text-red-400 mb-1 uppercase">{eStats.archetype}</div>
              <div className="text-[10px] text-gray-300 mb-1">
                FOR {eStats.strength} • MAG {eStats.magic} • DEF {eStats.defense}
              </div>
              {eStats.passive && (
                <div className="text-[10px] text-amber-300 mb-1">{eStats.passive}</div>
              )}

              <div className="flex items-center gap-1">
                <span className="text-xs w-4">❤️</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${Math.max(0, (eStats.hp / eStats.maxHp) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-red-400 ml-1">
                  {eStats.hp}/{eStats.maxHp}
                  {enemyStatuses.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
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
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-[#0f0518] p-4 border-t-2 border-purple-900 flex gap-4">
          <div className="flex-1 bg-black/60 p-3 rounded-lg border border-purple-900/60 overflow-y-auto font-mono text-sm h-40 hide-scrollbar">
            {logs.map((l, idx) => (
              <div key={`${l}-${idx}`} className={idx === 0 ? "text-white" : "text-gray-500"}>
                {l}
              </div>
            ))}
          </div>

          <div className="w-80 flex flex-col gap-2">
            <div className="bg-black/50 border border-violet-900 rounded-lg p-2">
              <div className="text-xs text-violet-300 mb-1 font-bold">Compétence sélectionnée</div>
              <select
                value={selectedSkill?.id || ""}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="w-full p-2 rounded bg-[#1b0a3d] text-white border border-violet-700 text-sm"
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
              {isPlayerTurn ? (
                <>
                  <button
                    onClick={() => handleAction("attack")}
                    className="bg-red-800 hover:bg-red-700 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-red-500 transition-all text-sm font-bold"
                  >
                    ⚔️ ATTAQUER
                  </button>

                  <button
                    onClick={() => handleAction("special")}
                    disabled={!selectedSkill || !canUseSelectedSkill}
                    className="bg-violet-800 hover:bg-violet-700 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-violet-400 transition-all text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    title={selectedSkill?.description}
                  >
                    {selectedSkill ? `${selectedSkill.icon} ${selectedSkill.name}` : "Sort"}
                    {selectedSkill && (
                      <span className="block text-xs text-blue-300">{selectedSkill.manaCost} mana</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleAction("defend")}
                    className="bg-cyan-900 hover:bg-cyan-800 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-cyan-600 transition-all text-sm font-bold"
                  >
                    🛡️ DÉFENDRE
                    <span className="block text-xs text-cyan-300">+5 mana</span>
                  </button>

                  <button
                    onClick={() => handleAction("flee")}
                    className="bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-gray-500 transition-all text-sm font-bold"
                  >
                    🏃 FUIR
                    <span className="block text-xs text-gray-400">40% chance</span>
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
    </div>
  );
}