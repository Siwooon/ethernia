import { CombatEnemyState } from "./combatTypes";
import { BossMechanicType } from "@/shared/types/game";

export type MobileBossPhaseInfo = {
  isBoss: boolean;
  name: string;
  phase: 1 | 2;
  hpPercent: number;
  mechanicLabel: string;
  phaseTitle: string;
  phaseDescription: string;
  warnings: string[];
  badges: string[];
  phaseImage?: string;
};

function getMechanicLabel(mechanic?: BossMechanicType) {
  if (mechanic === "feral_heart") return "Cœur sauvage";
  if (mechanic === "tainted_oracle") return "Oracle";
  if (mechanic === "plague_root") return "Peste";
  if (mechanic === "stone_colossus") return "Colosse";
  if (mechanic === "echo_brood") return "Écho";
  if (mechanic === "ashen_pyre") return "Bûcher";
  if (mechanic === "grave_heart") return "Cœur noir";
  if (mechanic === "cathedral_judge") return "Juge";
  return "Boss";
}

function getPhaseDescription(mechanic: BossMechanicType | undefined, phase: 1 | 2) {
  if (mechanic === "feral_heart") {
    return phase === 1
      ? "Le boss marque une proie et accumule sa rage. Sous 50 % PV, il devient plus rapide et plus brutal."
      : "Phase 2 : la rage est libérée. Ses attaques sont plus dangereuses, surtout contre les héros affaiblis.";
  }

  if (mechanic === "tainted_oracle") {
    return phase === 1
      ? "Charge un rituel protégé. Briser son bouclier réduit l’explosion."
      : "Le rituel revient plus vite et frappe plus fort.";
  }

  if (mechanic === "plague_root") {
    return phase === 1
      ? "Empoisonne l’équipe et se régénère par vagues."
      : "Le poison dure plus longtemps. Les soins et purifications comptent davantage.";
  }

  if (mechanic === "stone_colossus") {
    return phase === 1
      ? "Alterner défense et grosses frappes. Ses boucliers protègent les tours dangereux."
      : "Plus lent, mais ses écrasements touchent très fort.";
  }

  if (mechanic === "echo_brood") {
    return phase === 1
      ? "Accumule des échos, puis frappe plusieurs fois."
      : "Les échos accélèrent. Les dégâts de zone deviennent plus fréquents.";
  }

  if (mechanic === "ashen_pyre") {
    return phase === 1
      ? "Monte en braise, puis déclenche un brasier."
      : "Les brûlures sont plus sévères. Il faut terminer avant le prochain brasier.";
  }

  if (mechanic === "grave_heart") {
    return phase === 1
      ? "Draine, affaiblit et se régénère quand il vacille."
      : "Sa faim devient plus constante. Les combats longs l’avantagent.";
  }

  if (mechanic === "cathedral_judge") {
    return phase === 1
      ? "Pose des sceaux, impose des sentences, puis rend son verdict."
      : "Les verdicts brûlent les ressources et punissent les équipes fragiles.";
  }

  return phase === 1
    ? "Un adversaire majeur bloque la progression de l’étage."
    : "Phase 2 : le boss est enragé et ne reculera plus.";
}

function getPhaseWarnings(enemyState: CombatEnemyState, phase: 1 | 2) {
  const mechanic = enemyState.enemy.bossMechanic;
  const warnings: string[] = [];

  if (phase === 1 && enemyState.stats.maxHp > 0 && enemyState.stats.hp / enemyState.stats.maxHp <= 0.6) {
    warnings.push("Transition proche : prépare tes soins, boucliers ou défenses.");
  }

  if (mechanic === "feral_heart") {
    warnings.push(phase === 1 ? "Attention aux grosses frappes physiques." : "Priorité : terminer vite ou protéger le héros ciblé.");
  }

  if (mechanic === "tainted_oracle") {
    warnings.push(phase === 1 ? "Brise le bouclier avant l’explosion." : "La phase 2 punit les combats trop longs.");
  }

  if (mechanic === "plague_root") warnings.push("Prévois soins ou purge : le poison s’accumule.");
  if (mechanic === "stone_colossus") warnings.push("Défends avant l’écrasement.");
  if (mechanic === "echo_brood") warnings.push("Les multi-frappes punissent les héros bas PV.");
  if (mechanic === "ashen_pyre") warnings.push("Le brasier arrive après plusieurs braises.");
  if (mechanic === "grave_heart") warnings.push("Évite de laisser le combat durer.");
  if (mechanic === "cathedral_judge") warnings.push("Les sceaux annoncent un verdict de zone.");

  return warnings;
}

export function buildMobileBossPhaseInfo(enemyState: CombatEnemyState | null | undefined): MobileBossPhaseInfo | null {
  if (!enemyState?.enemy.isBoss) return null;

  const phase = enemyState.enemy.bossState?.phase ?? 1;
  const mechanic = enemyState.enemy.bossMechanic;
  const hpPercent = enemyState.stats.maxHp > 0
    ? Math.max(0, Math.round((enemyState.stats.hp / enemyState.stats.maxHp) * 100))
    : 0;

  return {
    isBoss: true,
    name: enemyState.enemy.name,
    phase,
    hpPercent,
    mechanicLabel: getMechanicLabel(mechanic),
    phaseTitle: phase === 1 ? "Phase 1" : "Phase 2 — Enragé",
    phaseDescription: getPhaseDescription(mechanic, phase),
    warnings: getPhaseWarnings(enemyState, phase),
    badges: [
      getMechanicLabel(mechanic),
      phase === 1 ? "Transition à 50 %" : "Pouvoir renforcé",
      `${hpPercent}% PV`,
    ],
    phaseImage: phase === 2 ? enemyState.enemy.phaseTwoImage ?? enemyState.enemy.image : enemyState.enemy.image,
  };
}

export function applyMobileBossPhaseTransition(enemyState: CombatEnemyState): {
  enemyState: CombatEnemyState;
  transitioned: boolean;
  logs: string[];
} {
  if (!enemyState.enemy.isBoss) {
    return { enemyState, transitioned: false, logs: [] };
  }

  const currentPhase = enemyState.enemy.bossState?.phase ?? 1;
  const hpRatio = enemyState.stats.maxHp > 0 ? enemyState.stats.hp / enemyState.stats.maxHp : 1;

  if (currentPhase === 2 || hpRatio > 0.5) {
    return { enemyState, transitioned: false, logs: [] };
  }

  const mechanic = enemyState.enemy.bossMechanic;
  const nextBossState = {
    rage: 0,
    ritualCharge: 0,
    ritualBroken: false,
    preyMarkedPlayerId: null,
    patternStep: 0,
    ...enemyState.enemy.bossState,
    phase: 2 as const,
  };

  if (mechanic === "feral_heart") {
    const nextStrength = enemyState.stats.strength + 3;
    const nextSpeed = enemyState.stats.speed + 2;
    return {
      transitioned: true,
      logs: ["🔥 Phase 2 : le Cœur sauvage libère sa rage. Force +3, Vitesse +2."],
      enemyState: {
        ...enemyState,
        stats: {
          ...enemyState.stats,
          strength: nextStrength,
          speed: nextSpeed,
        },
        enemy: {
          ...enemyState.enemy,
          strength: nextStrength,
          speed: nextSpeed,
          bossState: nextBossState,
          image: enemyState.enemy.phaseTwoImage ?? enemyState.enemy.image,
          hp: enemyState.stats.hp,
        },
      },
    };
  }

  if (mechanic === "tainted_oracle") {
    const nextMagic = enemyState.stats.magic + 4;
    const nextDefense = enemyState.stats.defense + 2;
    return {
      transitioned: true,
      logs: ["🕯️ Phase 2 : le rituel de l’Oracle s’emballe. Magie +4, Défense +2."],
      enemyState: {
        ...enemyState,
        stats: {
          ...enemyState.stats,
          magic: nextMagic,
          defense: nextDefense,
        },
        enemy: {
          ...enemyState.enemy,
          magic: nextMagic,
          defense: nextDefense,
          bossState: nextBossState,
          hp: enemyState.stats.hp,
        },
      },
    };
  }

  const statBoosts: Partial<Record<BossMechanicType, Partial<typeof enemyState.stats>>> = {
    plague_root: { magic: enemyState.stats.magic + 3, defense: enemyState.stats.defense + 2 },
    stone_colossus: { strength: enemyState.stats.strength + 4, defense: enemyState.stats.defense + 2, speed: Math.max(1, enemyState.stats.speed - 1) },
    echo_brood: { strength: enemyState.stats.strength + 2, magic: enemyState.stats.magic + 2, speed: enemyState.stats.speed + 3 },
    ashen_pyre: { magic: enemyState.stats.magic + 5, speed: enemyState.stats.speed + 1 },
    grave_heart: { strength: enemyState.stats.strength + 2, magic: enemyState.stats.magic + 3, defense: enemyState.stats.defense + 1 },
    cathedral_judge: { magic: enemyState.stats.magic + 4, defense: enemyState.stats.defense + 3 },
  };

  if (mechanic && statBoosts[mechanic]) {
    const boostedStats = { ...enemyState.stats, ...statBoosts[mechanic] };
    return {
      transitioned: true,
      logs: [`⚠️ Phase 2 : ${getMechanicLabel(mechanic)} change de rythme.`],
      enemyState: {
        ...enemyState,
        stats: boostedStats,
        enemy: {
          ...enemyState.enemy,
          hp: boostedStats.hp,
          strength: boostedStats.strength,
          magic: boostedStats.magic,
          defense: boostedStats.defense,
          speed: boostedStats.speed,
          bossState: nextBossState,
        },
      },
    };
  }

  return {
    transitioned: true,
    logs: ["⚠️ Phase 2 : le boss entre en rage."],
    enemyState: {
      ...enemyState,
      enemy: {
        ...enemyState.enemy,
        bossState: nextBossState,
        hp: enemyState.stats.hp,
      },
    },
  };
}
