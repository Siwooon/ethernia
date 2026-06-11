import { Enemy, EnemyAttack, StatusEffect } from "@/shared/types/game";
import {
  applyStatusModifiersToStats,
  getDebuffMultiplier,
} from "@/shared/lib/statusEffects";
import {
  CombatEnemyState,
  CombatPlayerState,
  EnemyIntentionView,
  PlannedEnemyAction,
} from "./combatTypes";
import { chooseEnemyTargets, syncEnemyState } from "./enemyPlanning";

export function getEnemyAttackIcon(attack: EnemyAttack) {
  if (attack.skipDamage) return "🌀";
  if (attack.statusEffect?.type === "poison") return "☠️";
  if (attack.statusEffect?.type === "burn") return "🔥";
  if (attack.statusEffect?.type === "silence") return "🔇";
  if (attack.statusEffect?.type === "marked") return "🎯";
  if (attack.selfHealPercent) return "🩸";
  if (attack.kind === "magical") return "✨";
  if (attack.kind === "hybrid") return "💥";
  return "⚔️";
}

export function getEnemyAttackTone(
  attack: EnemyAttack,
): EnemyIntentionView["tone"] {
  if (attack.skipDamage || attack.statusEffect?.target === "enemy")
    return "support";
  if (attack.targetScope === "all_players" || (attack.hitCount ?? 1) >= 3)
    return "danger";
  if (attack.kind === "magical" || attack.kind === "hybrid") return "magic";
  return "attack";
}

export function getStatusEffectLabel(
  attack: EnemyAttack,
  statusLabelMap: Record<StatusEffect["type"], string>,
) {
  const effect = attack.statusEffect;
  if (!effect) return undefined;

  const label = statusLabelMap[effect.type] ?? effect.type;
  const target =
    effect.target === "enemy"
      ? "sur soi"
      : effect.target === "all_players"
        ? "sur l'équipe"
        : "sur la cible";

  return `${label} ${target} (${effect.value}, ${effect.duration}t)`;
}

export function estimateEnemyDamageRange(
  attack: EnemyAttack,
  enemyData: Enemy,
  target: CombatPlayerState,
) {
  if (attack.skipDamage || attack.powerMultiplier <= 0) {
    return "aucun dégât direct";
  }

  const hitCount = Math.max(1, attack.hitCount ?? 1);
  let base = 0;

  if (attack.kind === "physical") {
    base = enemyData.strength * attack.powerMultiplier;
  } else if (attack.kind === "magical") {
    base = enemyData.magic * attack.powerMultiplier;
  } else {
    base =
      (enemyData.strength + enemyData.magic) * 0.5 * attack.powerMultiplier;
  }

  const vulnerabilityMultiplier = getDebuffMultiplier(
    target.statuses,
    "vulnerability",
  );
  const defenseReduction = Math.floor(target.stats.defense / 3);
  const defendMultiplier = target.defending ? 0.3 : 1;

  const estimateHit = (variance: number) => {
    const raw = Math.floor(base * variance);
    const reduced = Math.max(1, raw - defenseReduction);
    return Math.max(
      1,
      Math.floor(reduced * vulnerabilityMultiplier * defendMultiplier),
    );
  };

  const min = estimateHit(0.9) * hitCount;
  const max = estimateHit(1.15) * hitCount;
  const critChance =
    attack.critChance ?? (enemyData.archetype === "assassin" ? 0.18 : 0.08);
  const critText =
    critChance > 0 ? ` · crit ${Math.round(critChance * 100)}%` : "";

  return `${min}-${max} PV${hitCount > 1 ? ` (${hitCount} coups)` : ""}${critText}`;
}

type BuildEnemyIntentionsInput = {
  allies: CombatPlayerState[];
  enemyStates: CombatEnemyState[];
  plannedEnemyActions: Record<string, PlannedEnemyAction>;
  statusLabelMap: Record<StatusEffect["type"], string>;
};

export function buildEnemyIntentions({
  allies,
  enemyStates,
  plannedEnemyActions,
  statusLabelMap,
}: BuildEnemyIntentionsInput): EnemyIntentionView[] {
  const livingAllies = allies.filter(
    (ally) => !ally.isDead && ally.stats.hp > 0,
  );
  if (!livingAllies.length) return [];

  return enemyStates
    .filter((enemyState) => !enemyState.isDead && enemyState.stats.hp > 0)
    .map((enemyState) => {
      const plannedAction = plannedEnemyActions[enemyState.enemyId];
      const previewEnemy = {
        ...applyStatusModifiersToStats({
          ...syncEnemyState(enemyState),
          statuses: enemyState.statuses,
        }),
        statuses: enemyState.statuses,
      };

      const attack = plannedAction?.attack ?? enemyState.enemy.attacks[0];
      const sourceEnemy = plannedAction?.enemy ?? previewEnemy;

      const likelyTargets = plannedAction
        ? plannedAction.targetIds
            .map((targetId) =>
              livingAllies.find((ally) => ally.playerId === targetId),
            )
            .filter((ally): ally is CombatPlayerState => Boolean(ally))
        : chooseEnemyTargets(attack, livingAllies);

      const targetLabel =
        attack.targetScope === "all_players"
          ? "Toute l'équipe"
          : (likelyTargets[0]?.player.name ?? "Cible incertaine");

      const damageLabel =
        attack.targetScope === "all_players"
          ? likelyTargets
              .map(
                (ally) =>
                  `${ally.player.name}: ${estimateEnemyDamageRange(attack, sourceEnemy, ally)}`,
              )
              .join(" · ")
          : likelyTargets[0]
            ? estimateEnemyDamageRange(attack, sourceEnemy, likelyTargets[0])
            : "inconnu";

      return {
        enemyId: enemyState.enemyId,
        enemyName: enemyState.enemy.name,
        icon: getEnemyAttackIcon(attack),
        tone: getEnemyAttackTone(attack),
        actionName: attack.name,
        description: plannedAction
          ? attack.description
          : (attack.description ??
            "Action affichée en attendant la planification du tour."),
        targetLabel,
        damageLabel,
        effectLabel: getStatusEffectLabel(attack, statusLabelMap),
        isArea: attack.targetScope === "all_players",
        isBoss: Boolean(enemyState.enemy.isBoss),
      };
    });
}
