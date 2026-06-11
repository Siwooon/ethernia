import {
  BossMechanicType,
  BossState,
  Enemy,
  EnemyAttack,
  StatusEffect,
} from "@/shared/types/game";
import { addStatus, getShieldValue, hasStatus } from "@/shared/lib/statusEffects";

type PreparedBossTurn = {
  enemy: Enemy;
  enemyStatuses: StatusEffect[];
  attack: EnemyAttack;
  logs: string[];
  preferredTargetPlayerId: number | null;
};

type LivingTarget = {
  playerId: number;
  isDead: boolean;
};

function createDefaultBossState(): BossState {
  return {
    phase: 1,
    rage: 0,
    ritualCharge: 0,
    ritualBroken: false,
    preyMarkedPlayerId: null,
    patternStep: 0,
    sealCount: 0,
    broodCount: 0,
    emberCharge: 0,
  };
}

function randomAlivePlayerId(livingAllies: LivingTarget[]): number | null {
  const alive = livingAllies.filter((ally) => !ally.isDead);
  if (alive.length === 0) return null;
  return alive[Math.floor(Math.random() * alive.length)].playerId;
}

function firstAttack(enemy: Enemy): EnemyAttack {
  return enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)] ?? enemy.attacks[0];
}

function shortPhaseLog(mechanic: BossMechanicType) {
  switch (mechanic) {
    case "feral_heart":
      return "🔥 Phase 2 : le Cœur sauvage lâche sa rage.";
    case "tainted_oracle":
      return "🕯️ Phase 2 : le rituel s’emballe.";
    case "plague_root":
      return "☠️ Phase 2 : la peste s’épaissit.";
    case "stone_colossus":
      return "🪨 Phase 2 : la pierre se fissure et frappe plus fort.";
    case "echo_brood":
      return "🦇 Phase 2 : les échos se multiplient.";
    case "ashen_pyre":
      return "🔥 Phase 2 : les braises deviennent un brasier.";
    case "grave_heart":
      return "🩸 Phase 2 : le cœur réclame des vies.";
    case "cathedral_judge":
      return "⚖️ Phase 2 : le verdict tombe.";
    case "world_heart":
      return "💠 Phase 2 : le Cœur-Monde ouvre le Second Voile.";
    default:
      return "⚠️ Phase 2.";
  }
}

function applyPhaseTwoStats(enemy: Enemy): Enemy {
  const mechanic = enemy.bossMechanic;
  if (!mechanic) return enemy;

  if (mechanic === "feral_heart") return { ...enemy, strength: enemy.strength + 3, speed: enemy.speed + 2 };
  if (mechanic === "tainted_oracle") return { ...enemy, magic: enemy.magic + 4, defense: enemy.defense + 2 };
  if (mechanic === "plague_root") return { ...enemy, magic: enemy.magic + 3, defense: enemy.defense + 2 };
  if (mechanic === "stone_colossus") return { ...enemy, strength: enemy.strength + 4, defense: enemy.defense + 2, speed: Math.max(1, enemy.speed - 1) };
  if (mechanic === "echo_brood") return { ...enemy, strength: enemy.strength + 2, magic: enemy.magic + 2, speed: enemy.speed + 3 };
  if (mechanic === "ashen_pyre") return { ...enemy, magic: enemy.magic + 5, speed: enemy.speed + 1 };
  if (mechanic === "grave_heart") return { ...enemy, strength: enemy.strength + 2, magic: enemy.magic + 3, defense: enemy.defense + 1 };
  if (mechanic === "cathedral_judge") return { ...enemy, magic: enemy.magic + 4, defense: enemy.defense + 3 };
  if (mechanic === "world_heart") return { ...enemy, magic: enemy.magic + 5, defense: enemy.defense + 2, speed: enemy.speed + 1 };
  return enemy;
}

export function initializeBossEnemy(enemy: Enemy): Enemy {
  if (!enemy.isBoss || !enemy.bossMechanic) return enemy;

  return {
    ...enemy,
    bossState: {
      ...createDefaultBossState(),
      ...(enemy.bossState ?? {}),
    },
    statuses: enemy.statuses ?? [],
  };
}

function prepareFeralHeart(
  enemy: Enemy,
  state: BossState,
  livingAllies: LivingTarget[],
): { attack: EnemyAttack; preferredTargetPlayerId: number | null; logs: string[] } {
  const logs: string[] = [];
  let preferredTargetPlayerId: number | null = null;

  if (
    state.preyMarkedPlayerId !== null &&
    !livingAllies.some((ally) => ally.playerId === state.preyMarkedPlayerId && !ally.isDead)
  ) {
    state.preyMarkedPlayerId = null;
  }

  const rageBonus = state.rage;
  const preyId = state.preyMarkedPlayerId ?? randomAlivePlayerId(livingAllies);
  let attack: EnemyAttack;

  switch (state.patternStep % 4) {
    case 0:
      state.rage += 1;
      attack = {
        id: "feral_claw",
        name: "Griffe",
        description: "Frappe rapide. La rage monte.",
        kind: "physical",
        powerMultiplier: 1.05 + rageBonus * 0.12,
        targetScope: "single_player",
        hitCount: 1,
      };
      logs.push(`🐗 Furie : ${state.rage}.`);
      break;
    case 1:
      state.rage += 1;
      state.preyMarkedPlayerId = preyId;
      preferredTargetPlayerId = preyId;
      attack = {
        id: "feral_mark",
        name: "Marque",
        description: "Désigne une proie.",
        kind: "physical",
        powerMultiplier: 0.95 + rageBonus * 0.1,
        targetScope: "single_player",
        hitCount: 1,
        statusEffect: { type: "marked", value: 1, duration: 2, target: "player" },
      };
      logs.push("🎯 Proie marquée.");
      break;
    case 2:
      preferredTargetPlayerId = preyId;
      attack = {
        id: "feral_swipes",
        name: "Lacérations",
        description: "Plusieurs frappes sur la proie.",
        kind: "physical",
        powerMultiplier: 0.78 + rageBonus * 0.08,
        targetScope: "single_player",
        hitCount: state.phase === 2 ? 3 : 2,
      };
      logs.push("⚔️ Frappes en chaîne.");
      break;
    default:
      preferredTargetPlayerId = preyId;
      attack = {
        id: "feral_maul",
        name: "Déchaînement",
        description: "La rage retombe sans disparaître.",
        kind: "physical",
        powerMultiplier: 0.7 + rageBonus * 0.12,
        targetScope: "single_player",
        hitCount: state.phase === 2 ? 4 : 3,
        statusEffect: { type: "frailty", value: state.phase === 2 ? 2 : 1, duration: 2, target: "player" },
      };
      state.rage = Math.max(1, state.rage - 1);
      logs.push(`💥 Furie : ${state.rage}.`);
      break;
  }

  state.patternStep += 1;
  return { attack, preferredTargetPlayerId, logs };
}

function prepareTaintedOracle(
  enemy: Enemy,
  state: BossState,
  statuses: StatusEffect[],
  livingAllies: LivingTarget[],
): { attack: EnemyAttack; preferredTargetPlayerId: number | null; enemyStatuses: StatusEffect[]; logs: string[] } {
  const logs: string[] = [];
  let nextStatuses = [...statuses];
  let preferredTargetPlayerId: number | null = null;
  const silenced = hasStatus(nextStatuses, "silence");
  const ritualShield = getShieldValue(nextStatuses);

  if (silenced && state.ritualCharge > 0) {
    state.ritualCharge = 0;
    state.ritualBroken = true;
    logs.push("🔇 Rituel rompu.");
    return {
      enemyStatuses: nextStatuses,
      preferredTargetPlayerId,
      logs,
      attack: {
        id: "oracle_staggered_bolt",
        name: "Trait",
        description: "Sort faible après interruption.",
        kind: "magical",
        powerMultiplier: 0.9,
        targetScope: "single_player",
        hitCount: 1,
      },
    };
  }

  if (state.ritualCharge > 0 && ritualShield <= 0) {
    state.ritualBroken = true;
    logs.push("🛡️ Bouclier brisé.");
  }

  if (state.ritualCharge === 0) {
    state.ritualCharge = 1;
    state.ritualBroken = false;
    nextStatuses = addStatus(nextStatuses, {
      type: "shield",
      value: state.phase === 2 ? 16 : 12,
      duration: 1,
      source: "Rituel",
    });
    logs.push("🌀 Rituel lancé.");
    return {
      enemyStatuses: nextStatuses,
      preferredTargetPlayerId,
      logs,
      attack: {
        id: "oracle_begin",
        name: "Rituel",
        description: "Bouclier et charge.",
        kind: "magical",
        powerMultiplier: 0,
        skipDamage: true,
        targetScope: "single_player",
      },
    };
  }

  if (state.ritualCharge === 1) {
    state.ritualCharge = 2;
    nextStatuses = addStatus(nextStatuses, {
      type: "shield",
      value: state.phase === 2 ? 10 : 8,
      duration: 1,
      source: "Rituel",
    });
    preferredTargetPlayerId = randomAlivePlayerId(livingAllies);
    logs.push("🕯️ Rituel stable.");
    return {
      enemyStatuses: nextStatuses,
      preferredTargetPlayerId,
      logs,
      attack: {
        id: "oracle_bind",
        name: "Lien",
        description: "Affaiblit l’équipe.",
        kind: "magical",
        powerMultiplier: 1.0,
        manaBurn: state.phase === 2 ? 8 : 6,
        targetScope: "all_players",
        hitCount: 1,
        statusEffect: { type: "vulnerability", value: 1, duration: 2, target: "all_players" },
      },
    };
  }

  const fullPower = !state.ritualBroken && getShieldValue(nextStatuses) > 0;
  state.ritualCharge = 0;
  state.ritualBroken = false;
  logs.push(fullPower ? "🌋 Rituel complet." : "⚠️ Rituel fissuré.");

  return {
    enemyStatuses: nextStatuses,
    preferredTargetPlayerId,
    logs,
    attack: {
      id: "oracle_blast",
      name: fullPower ? "Cataclysme" : "Explosion",
      description: "Décharge rituelle.",
      kind: "magical",
      powerMultiplier: fullPower ? (state.phase === 2 ? 2.35 : 2.0) : state.phase === 2 ? 1.45 : 1.2,
      manaBurn: fullPower ? (state.phase === 2 ? 10 : 8) : 4,
      targetScope: "all_players",
      hitCount: 1,
      statusEffect: { type: fullPower ? "burn" : "silence", value: fullPower ? (state.phase === 2 ? 8 : 6) : 1, duration: fullPower ? 2 : 1, target: "all_players" },
    },
  };
}

function prepareNewBossTurn(
  enemy: Enemy,
  state: BossState,
  statuses: StatusEffect[],
  livingAllies: LivingTarget[],
): { attack: EnemyAttack; preferredTargetPlayerId: number | null; enemyStatuses: StatusEffect[]; logs: string[] } {
  const logs: string[] = [];
  let nextStatuses = [...statuses];
  let preferredTargetPlayerId: number | null = null;
  const step = state.patternStep % 4;

  switch (enemy.bossMechanic) {
    case "plague_root": {
      if (step === 0) {
        nextStatuses = addStatus(nextStatuses, { type: "regen", value: state.phase === 2 ? 10 : 7, duration: 2, source: "Sève" });
        logs.push("☠️ Sève active.");
        state.patternStep += 1;
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "plague_sap", name: "Sève", description: "Se régénère.", kind: "magical", powerMultiplier: 0, skipDamage: true, targetScope: "self" } };
      }
      state.patternStep += 1;
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "plague_cloud", name: step === 3 ? "Nappe" : "Peste", description: "Poison de zone.", kind: "magical", powerMultiplier: step === 3 ? (state.phase === 2 ? 1.45 : 1.15) : 0.95, targetScope: step === 3 ? "all_players" : "single_player", statusEffect: { type: "poison", value: state.phase === 2 ? 7 : 5, duration: 3, target: step === 3 ? "all_players" : "player" } } };
    }

    case "stone_colossus": {
      if (step === 0) {
        nextStatuses = addStatus(nextStatuses, { type: "shield", value: state.phase === 2 ? 22 : 16, duration: 2, source: "Pierre" });
        logs.push("🪨 Garde de pierre.");
        state.patternStep += 1;
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "stone_guard", name: "Garde", description: "Bouclier.", kind: "physical", powerMultiplier: 0, skipDamage: true, targetScope: "self" } };
      }
      state.patternStep += 1;
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "stone_crush", name: step === 3 ? "Écrasement" : "Poing", description: "Frappe lourde.", kind: "physical", powerMultiplier: step === 3 ? (state.phase === 2 ? 2.0 : 1.65) : 1.2, targetScope: step === 3 ? "all_players" : "single_player", statusEffect: { type: "frailty", value: state.phase === 2 ? 2 : 1, duration: 2, target: step === 3 ? "all_players" : "player" } } };
    }

    case "echo_brood": {
      state.broodCount = Math.min(4, (state.broodCount ?? 0) + (step === 0 ? 1 : 0));
      const echo = state.broodCount ?? 0;
      preferredTargetPlayerId = randomAlivePlayerId(livingAllies);
      state.patternStep += 1;
      if (step === 0) logs.push(`🦇 Échos : ${echo}.`);
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "echo_strike", name: step === 3 ? "Résonance" : "Écho", description: "Frappes rapides.", kind: "hybrid", powerMultiplier: step === 3 ? 0.72 + echo * 0.08 : 0.68 + echo * 0.05, targetScope: step === 3 ? "all_players" : "single_player", hitCount: step === 3 ? (state.phase === 2 ? 3 : 2) : (state.phase === 2 ? 3 : 2), statusEffect: step === 3 ? { type: "weakness", value: 1, duration: 2, target: "all_players" } : undefined } };
    }

    case "ashen_pyre": {
      state.emberCharge = Math.min(3, (state.emberCharge ?? 0) + 1);
      if ((state.emberCharge ?? 0) >= 3) {
        state.emberCharge = 0;
        state.patternStep += 1;
        logs.push("🔥 Brasier.");
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "pyre_blast", name: "Brasier", description: "Explosion brûlante.", kind: "magical", powerMultiplier: state.phase === 2 ? 2.05 : 1.65, targetScope: "all_players", statusEffect: { type: "burn", value: state.phase === 2 ? 9 : 6, duration: 2, target: "all_players" } } };
      }
      state.patternStep += 1;
      logs.push(`🔥 Braise : ${state.emberCharge}.`);
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "pyre_spark", name: "Braise", description: "Prépare le brasier.", kind: "magical", powerMultiplier: 1.05, targetScope: "single_player", statusEffect: { type: "burn", value: state.phase === 2 ? 6 : 4, duration: 2, target: "player" } } };
    }

    case "grave_heart": {
      const lowHp = enemy.maxHp > 0 && enemy.hp / enemy.maxHp <= 0.35;
      if (step === 0 || lowHp) {
        const healValue = state.phase === 2 ? 12 : 8;
        nextStatuses = addStatus(nextStatuses, { type: "regen", value: healValue, duration: 2, source: "Faim" });
        logs.push("🩸 Faim active.");
      }
      state.patternStep += 1;
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "grave_drain", name: step === 3 ? "Appel" : "Drain", description: "Draine et affaiblit.", kind: "hybrid", powerMultiplier: step === 3 ? (state.phase === 2 ? 1.55 : 1.25) : 1.05, targetScope: step === 3 ? "all_players" : "single_player", statusEffect: { type: step === 3 ? "vulnerability" : "weakness", value: 1, duration: 2, target: step === 3 ? "all_players" : "player" } } };
    }

    case "cathedral_judge": {
      state.sealCount = Math.min(3, (state.sealCount ?? 0) + (step === 0 ? 1 : 0));
      const seals = state.sealCount ?? 0;
      if (step === 0) {
        preferredTargetPlayerId = randomAlivePlayerId(livingAllies);
        logs.push(`⚖️ Sceau : ${seals}.`);
        state.patternStep += 1;
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "judge_mark", name: "Sceau", description: "Marque une cible.", kind: "magical", powerMultiplier: 0.85, targetScope: "single_player", statusEffect: { type: "marked", value: 1, duration: 2, target: "player" } } };
      }
      if (step === 3) {
        state.sealCount = 0;
        state.patternStep += 1;
        logs.push("⚖️ Verdict.");
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "judge_verdict", name: "Verdict", description: "Frappe selon les sceaux.", kind: "magical", powerMultiplier: (state.phase === 2 ? 1.55 : 1.25) + seals * 0.2, targetScope: "all_players", manaBurn: state.phase === 2 ? 8 : 5, statusEffect: { type: "silence", value: 1, duration: 1, target: "all_players" } } };
      }
      state.patternStep += 1;
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "judge_sentence", name: "Sentence", description: "Pression sacrée.", kind: "magical", powerMultiplier: state.phase === 2 ? 1.25 : 1.05, targetScope: "all_players", statusEffect: { type: "vulnerability", value: 1, duration: 2, target: "all_players" } } };
    }

    case "world_heart": {
      const filters = state.sealCount ?? 0;
      const veilCharge = state.ritualCharge ?? 0;

      if (step === 0) {
        state.sealCount = Math.min(4, filters + 1);
        nextStatuses = addStatus(nextStatuses, {
          type: "shield",
          value: state.phase === 2 ? 22 : 16,
          duration: 1,
          source: "Filtration",
        });
        logs.push(`💠 Filtration : ${state.sealCount}.`);
        state.patternStep += 1;
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "heart_filter", name: "Filtration", description: "Le Cœur-Monde se protège.", kind: "magical", powerMultiplier: 0, skipDamage: true, targetScope: "single_player" } };
      }

      if (step === 1) {
        preferredTargetPlayerId = randomAlivePlayerId(livingAllies);
        logs.push("🌑 Rejet de Mer Noire.");
        state.patternStep += 1;
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "heart_black_sea", name: "Rejet", description: "Corruption expulsée.", kind: "hybrid", powerMultiplier: state.phase === 2 ? 1.2 : 1.0, targetScope: "all_players", statusEffect: { type: "vulnerability", value: 1, duration: 2, target: "all_players" } } };
      }

      if (step === 2) {
        preferredTargetPlayerId = randomAlivePlayerId(livingAllies);
        state.ritualCharge = Math.min(2, veilCharge + 1);
        logs.push(`👑 Trône-Mémoire : ${state.ritualCharge}/2.`);
        state.patternStep += 1;
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "heart_memory_throne", name: "Trône-Mémoire", description: "Une mémoire royale marque le groupe.", kind: "magical", powerMultiplier: state.phase === 2 ? 1.35 : 1.1, targetScope: "single_player", manaBurn: state.phase === 2 ? 7 : 4, statusEffect: { type: "marked", value: 1, duration: 2, target: "player" } } };
      }

      state.patternStep += 1;
      if ((state.ritualCharge ?? 0) >= 2) {
        state.ritualCharge = 0;
        state.sealCount = 0;
        logs.push("🪡 Second Voile.");
        return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "heart_second_veil", name: "Second Voile", description: "Le Cœur tente de recoudre la réalité contre vous.", kind: "hybrid", powerMultiplier: state.phase === 2 ? 1.85 : 1.45, targetScope: "all_players", manaBurn: state.phase === 2 ? 10 : 6, statusEffect: { type: "silence", value: 1, duration: 1, target: "all_players" } } };
      }

      logs.push("⚙️ Pulsation sacrée.");
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: { id: "heart_pulse", name: "Pulsation", description: "Onde de la cathédrale-machine.", kind: "magical", powerMultiplier: 1.2 + filters * 0.08, targetScope: "all_players", statusEffect: { type: "weakness", value: 1, duration: 2, target: "all_players" } } };
    }

    default:
      state.patternStep += 1;
      return { enemyStatuses: nextStatuses, preferredTargetPlayerId, logs, attack: firstAttack(enemy) };
  }
}

export function prepareBossTurn(
  enemy: Enemy,
  currentStatuses: StatusEffect[],
  livingAllies: LivingTarget[]
): PreparedBossTurn {
  if (!enemy.isBoss || !enemy.bossMechanic) {
    return {
      enemy,
      enemyStatuses: currentStatuses,
      attack: firstAttack(enemy),
      logs: [],
      preferredTargetPlayerId: null,
    };
  }

  let nextEnemy = initializeBossEnemy(enemy);
  let nextStatuses = [...(currentStatuses ?? [])];
  const logs: string[] = [];
  const state: BossState = {
    ...createDefaultBossState(),
    ...(nextEnemy.bossState ?? {}),
  };

  const hpRatio = nextEnemy.maxHp > 0 ? nextEnemy.hp / nextEnemy.maxHp : 1;
  if (state.phase === 1 && hpRatio <= 0.5) {
    state.phase = 2;
    nextEnemy = applyPhaseTwoStats(nextEnemy);
    if (nextEnemy.bossMechanic) logs.push(shortPhaseLog(nextEnemy.bossMechanic));
  }

  let prepared: { attack: EnemyAttack; preferredTargetPlayerId: number | null; enemyStatuses?: StatusEffect[]; logs: string[] };

  if (nextEnemy.bossMechanic === "feral_heart") {
    prepared = prepareFeralHeart(nextEnemy, state, livingAllies);
  } else if (nextEnemy.bossMechanic === "tainted_oracle") {
    prepared = prepareTaintedOracle(nextEnemy, state, nextStatuses, livingAllies);
  } else {
    prepared = prepareNewBossTurn(nextEnemy, state, nextStatuses, livingAllies);
  }

  nextStatuses = prepared.enemyStatuses ?? nextStatuses;

  nextEnemy = {
    ...nextEnemy,
    bossState: state,
    statuses: nextStatuses,
  };

  return {
    enemy: nextEnemy,
    enemyStatuses: nextStatuses,
    attack: prepared.attack,
    logs: [...logs, ...prepared.logs],
    preferredTargetPlayerId: prepared.preferredTargetPlayerId,
  };
}
