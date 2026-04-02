import { CombatEnemyState, Enemy, EnemyAttack, Stats, StatusEffect, SummonSpec, normalizeEnemy } from "@/app/component/types/game";

function makeEnemyId() {
  return `enemy-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

export function toCombatEnemyState(enemy: Enemy): CombatEnemyState {
  const normalized = normalizeEnemy(enemy);

  return {
    enemyId: makeEnemyId(),
    enemy: normalized,
    stats: {
      hp: normalized.hp,
      maxHp: normalized.maxHp,
      mana: 0,
      maxMana: 0,
      strength: normalized.strength,
      magic: normalized.magic,
      defense: normalized.defense,
      speed: normalized.speed,
    },
    statuses: [...normalized.statuses],
    isDead: normalized.hp <= 0,
  };
}

export function toCombatEnemyStates(enemies: Enemy[]): CombatEnemyState[] {
  return enemies.map(toCombatEnemyState);
}

export function buildSummonedEnemy(spec: SummonSpec): Enemy {
  return normalizeEnemy({
    name: spec.name ?? "Invocation",
    hp: spec.hp,
    maxHp: spec.hp,
    strength: spec.strength,
    magic: spec.magic,
    defense: spec.defense,
    speed: spec.speed,
    image: spec.image,
    archetype: spec.archetype,
    attacks: spec.attacks,
    passives: spec.passives ?? [],
    statuses: [],
    sourceTag: spec.sourceTag ?? "normal",
    rewardCategory: spec.rewardCategory,
  });
}

export function createSummonedCombatEnemies(spec: SummonSpec): CombatEnemyState[] {
  return Array.from({ length: spec.count }, () => ({
    ...toCombatEnemyState(buildSummonedEnemy(spec)),
    summonSlot: true,
  }));
}

export function syncCombatEnemyToEnemy(state: CombatEnemyState): Enemy {
  return {
    ...state.enemy,
    hp: state.stats.hp,
    maxHp: state.stats.maxHp,
    strength: state.stats.strength,
    magic: state.stats.magic,
    defense: state.stats.defense,
    speed: state.stats.speed,
    statuses: [...state.statuses],
  };
}

export function getPrimaryEnemy(enemies: CombatEnemyState[]): CombatEnemyState | null {
  const living = enemies.filter((e) => !e.isDead);
  if (living.length === 0) return null;

  const boss = living.find((e) => e.enemy.isBoss);
  if (boss) return boss;

  return living[0];
}