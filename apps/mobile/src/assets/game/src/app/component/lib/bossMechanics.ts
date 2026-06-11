import {
  BossState,
  Enemy,
  EnemyAttack,
  StatusEffect,
} from "@/app/component/types/game";
import { addStatus, getShieldValue, hasStatus } from "@/app/component/lib/statusEffects";

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
  };
}

function randomAlivePlayerId(livingAllies: LivingTarget[]): number | null {
  const alive = livingAllies.filter((ally) => !ally.isDead);
  if (alive.length === 0) return null;
  return alive[Math.floor(Math.random() * alive.length)].playerId;
}

export function initializeBossEnemy(enemy: Enemy): Enemy {
  if (!enemy.isBoss || !enemy.bossMechanic) return enemy;

  return {
    ...enemy,
    bossState: enemy.bossState ?? createDefaultBossState(),
    statuses: enemy.statuses ?? [],
  };
}

export function prepareBossTurn(
  enemy: Enemy,
  currentStatuses: StatusEffect[],
  livingAllies: LivingTarget[]
): PreparedBossTurn {
  if (!enemy.isBoss || !enemy.bossMechanic) {
    const fallbackAttack =
      enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)] ?? enemy.attacks[0];

    return {
      enemy,
      enemyStatuses: currentStatuses,
      attack: fallbackAttack,
      logs: [],
      preferredTargetPlayerId: null,
    };
  }

  let nextEnemy = initializeBossEnemy(enemy);
  let nextStatuses = [...(currentStatuses ?? [])];
  const logs: string[] = [];
  const state: BossState = {
    ...(nextEnemy.bossState ?? createDefaultBossState()),
  };

  const hpRatio = nextEnemy.maxHp > 0 ? nextEnemy.hp / nextEnemy.maxHp : 1;

  if (state.phase === 1 && hpRatio <= 0.5) {
    state.phase = 2;

    if (nextEnemy.bossMechanic === "feral_heart") {
      nextEnemy = {
        ...nextEnemy,
        strength: nextEnemy.strength + 3,
        speed: nextEnemy.speed + 2,
      };
      logs.push("🔥 Le Cœur sauvage passe en phase 2 : sa rage devient incontrôlable.");
    }

    if (nextEnemy.bossMechanic === "tainted_oracle") {
      nextEnemy = {
        ...nextEnemy,
        magic: nextEnemy.magic + 4,
        defense: nextEnemy.defense + 2,
      };
      logs.push("🕯️ L’Oracle souillé passe en phase 2 : le rituel s’emballe.");
    }
  }

  let preferredTargetPlayerId: number | null = null;
  let attack: EnemyAttack =
    nextEnemy.attacks[Math.floor(Math.random() * nextEnemy.attacks.length)] ??
    nextEnemy.attacks[0];

  if (nextEnemy.bossMechanic === "feral_heart") {
    if (
      state.preyMarkedPlayerId !== null &&
      !livingAllies.some(
        (ally) => ally.playerId === state.preyMarkedPlayerId && !ally.isDead
      )
    ) {
      state.preyMarkedPlayerId = null;
    }

    const rageBonus = state.rage;
    const preyId = state.preyMarkedPlayerId ?? randomAlivePlayerId(livingAllies);

    switch (state.patternStep % 4) {
      case 0: {
        state.rage += 1;
        attack = {
          id: "feral_claw",
          name: "Griffe dévorante",
          description: "Une attaque nerveuse qui fait monter la Furie.",
          kind: "physical",
          powerMultiplier: 1.05 + rageBonus * 0.12,
          targetScope: "single_player",
          hitCount: 1,
        };
        logs.push(`🐗 Furie : ${state.rage}.`);
        break;
      }

      case 1: {
        state.rage += 1;
        state.preyMarkedPlayerId = preyId;
        preferredTargetPlayerId = preyId;
        attack = {
          id: "feral_hunt_mark",
          name: "Marque du chasseur",
          description: "Le boss désigne sa proie et prépare son assaut.",
          kind: "physical",
          powerMultiplier: 0.95 + rageBonus * 0.1,
          targetScope: "single_player",
          hitCount: 1,
          statusEffect: {
            type: "marked",
            value: 1,
            duration: 2,
            target: "player",
          },
        };
        logs.push("🎯 Le boss marque sa proie.");
        break;
      }

      case 2: {
        preferredTargetPlayerId = preyId;
        attack = {
          id: "feral_relentless_swipes",
          name: "Lacérations enragées",
          description: "Deux frappes rapides sur la proie traquée.",
          kind: "physical",
          powerMultiplier: 0.78 + rageBonus * 0.08,
          targetScope: "single_player",
          hitCount: state.phase === 2 ? 3 : 2,
        };
        logs.push("⚔️ Le boss accélère et enchaîne les frappes.");
        break;
      }

      default: {
        preferredTargetPlayerId = preyId;
        attack = {
          id: "feral_breaking_maul",
          name: "Déchaînement féral",
          description: "Une rafale brutale qui ne calme la Furie qu’en partie.",
          kind: "physical",
          powerMultiplier: 0.7 + rageBonus * 0.12,
          targetScope: "single_player",
          hitCount: state.phase === 2 ? 4 : 3,
          statusEffect: {
            type: "frailty",
            value: state.phase === 2 ? 2 : 1,
            duration: 2,
            target: "player",
          },
        };
        state.rage = Math.max(1, state.rage - 1);
        logs.push(`💥 Déchaînement : la Furie retombe à ${state.rage}, mais ne disparaît pas.`);
        break;
      }
    }

    state.patternStep += 1;
  }

  if (nextEnemy.bossMechanic === "tainted_oracle") {
    const silenced = hasStatus(nextStatuses, "silence");
    const ritualShield = getShieldValue(nextStatuses);

    if (silenced && state.ritualCharge > 0) {
      state.ritualCharge = 0;
      state.ritualBroken = true;

      attack = {
        id: "oracle_staggered_bolt",
        name: "Trait vacillant",
        description: "Le rituel a été interrompu, l’Oracle improvise un sort faible.",
        kind: "magical",
        powerMultiplier: 0.9,
        targetScope: "single_player",
        hitCount: 1,
      };

      logs.push("🔇 Silence : le rituel est interrompu.");
    } else if (state.ritualCharge > 0 && ritualShield <= 0) {
      state.ritualBroken = true;
      logs.push("🛡️ Le bouclier rituel a été brisé : l’explosion sera affaiblie.");
    }

    if (state.ritualCharge === 0) {
      state.ritualCharge = 1;
      state.ritualBroken = false;

      nextStatuses = addStatus(nextStatuses, {
        type: "shield",
        value: state.phase === 2 ? 16 : 12,
        duration: 1,
        source: "oracle_ritual_shield",
      });

      attack = {
        id: "oracle_begin_ritual",
        name: "Ouverture du rituel",
        description: "L’Oracle érige un bouclier et entame l’incantation.",
        kind: "magical",
        powerMultiplier: 0,
        skipDamage: true,
        targetScope: "single_player",
      };

      logs.push("🌀 L’Oracle entame son rituel.");
    } else if (state.ritualCharge === 1) {
      state.ritualCharge = 2;

      nextStatuses = addStatus(nextStatuses, {
        type: "shield",
        value: state.phase === 2 ? 10 : 8,
        duration: 1,
        source: "oracle_ritual_shield",
      });

      preferredTargetPlayerId = randomAlivePlayerId(livingAllies);

      attack = {
        id: "oracle_bind_target",
        name: "Lien des cendres",
        description: "L’Oracle stabilise le rituel en affaiblissant une cible.",
        kind: "magical",
        powerMultiplier: 1.0,
        manaBurn: state.phase === 2 ? 8 : 6,
        targetScope: "all_players",
        hitCount: 1,
        statusEffect: {
          type: "vulnerability",
          value: 1,
          duration: 2,
          target: "player",
        },
      };

      logs.push("🕯️ Le rituel se stabilise.");
    } else {
      const fullPower = !state.ritualBroken && getShieldValue(nextStatuses) > 0;

      attack = {
        id: "oracle_ritual_blast",
        name: fullPower ? "Cataclysme rituel" : "Explosion rituelle fissurée",
        description: fullPower
          ? "Une explosion de zone dévaste tout le groupe."
          : "L’explosion a perdu en puissance après avoir été perturbée.",
        kind: "magical",
        powerMultiplier: fullPower
          ? state.phase === 2
            ? 2.35
            : 2.0
          : state.phase === 2
          ? 1.45
          : 1.2,
        manaBurn: fullPower ? (state.phase === 2 ? 10 : 8) : 4,
        targetScope: "all_players",
        hitCount: 1,
        statusEffect: {
          type: fullPower ? "burn" : "silence",
          value: fullPower ? (state.phase === 2 ? 8 : 6) : 1,
          duration: fullPower ? 2 : 1,
          target: "all_players",
        },
      };

      logs.push(
        fullPower
          ? "🌋 Le rituel atteint sa pleine puissance et frappe toute l’équipe."
          : "⚠️ Le rituel explose, mais sa puissance a été réduite."
      );

      state.ritualCharge = 0;
      state.ritualBroken = false;
    }

    state.patternStep += 1;
  }

  nextEnemy = {
    ...nextEnemy,
    bossState: state,
    statuses: nextStatuses,
  };

  return {
    enemy: nextEnemy,
    enemyStatuses: nextStatuses,
    attack,
    logs,
    preferredTargetPlayerId,
  };
}