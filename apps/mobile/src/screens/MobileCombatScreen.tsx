import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { getUnlockedSkills } from "@/shared/data/abilities";
import {
  applyIncomingDamageToStats,
  applyHealingToStats,
  resolveEnemyAttackAgainstPlayer,
  resolvePlayerBasicAttack,
  resolvePlayerSkill,
} from "@/shared/engine/combat/combatEngine";
import { createInitialCombatAllies } from "@/shared/engine/combat/combatSetup";
import {
  CombatEnemyState,
  CombatPlayerState,
  EnemyIntentionView,
  TurnEntry,
} from "@/shared/engine/combat/combatTypes";
import {
  applyCorruptedAffixesToEnemies,
  buildCorruptedAffixLabels,
  resolveCorruptedAffixDeathEffects,
} from "@/shared/engine/combat/corruptedAffixes";
import { buildEnemyIntentions } from "@/shared/engine/combat/enemyIntentions";
import { buildPlannedEnemyAction } from "@/shared/engine/combat/enemyPlanning";
import { applyStartOfTurnEffects } from "@/shared/engine/combat/roundEffects";
import { buildTurnOrder } from "@/shared/engine/combat/turnOrder";
import { balanceEnemiesForPartyTalents } from "@/shared/engine/combat/talentEnemyBalance";
import { balanceEnemiesForPartySize } from "@/shared/engine/combat/partySizeBalance";
import {
  applyMobileBossPhaseTransition,
  buildMobileBossPhaseInfo,
} from "@/shared/engine/combat/mobileBossCombatEngine";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import {
  canLocalDeviceControlPlayer,
  getCoopActionLockMessage,
  getCoopTurnOwnerLabel,
} from "@/shared/engine/game/coopParty";
import { isNodeCorrupted } from "@/shared/engine/map/mapEngine";
import {
  buildMobileCombatRewardPreview,
  finalizeMobileCombatRun,
  MobileCombatRewardSummary,
  MobilePostCombatFlow,
} from "@/shared/engine/combat/mobileCombatRewards";
import { createScopedRandom, GameRandom } from "@/shared/platform/random";
import {
  ClassType,
  Enemy,
  InventoryItem,
  Player,
  PlayerSkill,
  StatusEffect,
} from "@/shared/types/game";
import {
  getBiomeBackgroundSource,
  getClassPortraitSource,
  getEnemyImageSource,
} from "../assets/mobileAssets";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import { mobileTheme } from "../styles/theme";
import { getClassPresentation } from "@/shared/engine/game/classPresentation";
import { getClassDisplayName } from "@/shared/engine/game/displayLabels";
import {
  getAvailableTalentPoints,
  getTalentNodes,
  getTalentNodeRoleText,
  isTalentNodeAvailable,
  isTalentNodeUnlocked,
} from "@/shared/engine/game/classTalentTrees";
import { removeOneItemFromInventoryList } from "@/shared/lib/inventoryHelpers";

export type MobileCombatLaunch = {
  nodeId: number;
  title: string;
  enemies: Enemy[];
  participantIndexes?: number[];
};

type MobileCombatScreenProps = {
  initialRun: EtherniaRunSave;
  combat: MobileCombatLaunch;
  onCombatFinished: (
    run: EtherniaRunSave,
    postCombat: MobilePostCombatFlow,
  ) => void;
  onCancelCombat: () => void;
  onOpenHeroAfterLevelUp?: (
    run: EtherniaRunSave,
    postCombat: MobilePostCombatFlow,
  ) => void;
};

type CombatOutcome = "victory" | "defeat" | null;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CombatPulseKind =
  | "enemyHit"
  | "enemyDeath"
  | "allyHit"
  | "allyHeal"
  | "allyShield"
  | "playerAction"
  | "enemyAction"
  | "enemyBurn"
  | "enemyPoison"
  | "enemyCorruption"
  | "bossPhase"
  | "momentumStrike";

type CombatAnimationPulse = {
  kind: CombatPulseKind;
  targetId: string;
  nonce: number;
};

type CombatLottieKind =
  | "hit"
  | "heal"
  | "shield"
  | "fire"
  | "poison"
  | "corruption";

const combatLottieSources: Record<CombatLottieKind, object> = {
  hit: require("../assets/lottie/hit.json"),
  heal: require("../assets/lottie/heal.json"),
  shield: require("../assets/lottie/shield.json"),
  fire: require("../assets/lottie/fire.json"),
  poison: require("../assets/lottie/poison.json"),
  corruption: require("../assets/lottie/corruption.json"),
};

function CombatLottieOverlay({
  kind,
  nonce,
  compact = false,
}: {
  kind?: CombatLottieKind | null;
  nonce?: number;
  compact?: boolean;
}) {
  if (!kind || !nonce) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.lottieOverlay, compact && styles.lottieOverlayCompact]}
    >
      <LottieView
        key={`${kind}-${nonce}`}
        source={combatLottieSources[kind] as never}
        autoPlay
        loop={false}
        resizeMode="cover"
        style={styles.lottieEffect}
      />
    </View>
  );
}

function getEnemyPulseLottieKind(
  enemy: CombatEnemyState,
  pulseKind: CombatPulseKind | undefined,
  isCorruptedCombat: boolean,
): CombatLottieKind | null {
  if (!pulseKind) return null;
  if (pulseKind === "bossPhase") return "corruption";
  if (pulseKind === "enemyDeath")
    return enemy.enemy.corruptionAffixes?.length || isCorruptedCombat
      ? "corruption"
      : "hit";
  if (pulseKind === "enemyBurn") return "fire";
  if (pulseKind === "enemyPoison") return "poison";
  if (pulseKind === "enemyCorruption") return "corruption";
  if (pulseKind === "momentumStrike") return "hit";
  if (pulseKind === "enemyHit")
    return enemy.enemy.corruptionAffixes?.length || isCorruptedCombat
      ? "corruption"
      : "hit";
  return null;
}

function getAllyPulseLottieKind(
  pulseKind: CombatPulseKind | undefined,
): CombatLottieKind | null {
  if (pulseKind === "allyHeal") return "heal";
  if (pulseKind === "allyShield") return "shield";
  if (pulseKind === "allyHit" || pulseKind === "enemyAction") return "hit";
  return null;
}

type AnimatedCombatSurfaceProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  pulseKind?: CombatPulseKind;
  pulseNonce?: number;
  style: StyleProp<ViewStyle>;
};

function AnimatedCombatSurface({
  children,
  disabled,
  onPress,
  pulseKind,
  pulseNonce = 0,
  style,
}: AnimatedCombatSurfaceProps) {
  const impact = useSharedValue(0);

  useEffect(() => {
    if (!pulseNonce || !pulseKind) return;

    impact.value = 0;
    impact.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(-0.55, { duration: 80 }),
      withTiming(0.22, { duration: 90 }),
      withTiming(0, { duration: 120 }),
    );
  }, [impact, pulseKind, pulseNonce]);

  const animatedStyle = useAnimatedStyle(() => {
    const absoluteImpact = Math.abs(impact.value);
    const isHit =
      pulseKind === "enemyHit" ||
      pulseKind === "enemyDeath" ||
      pulseKind === "allyHit" ||
      pulseKind === "enemyAction" ||
      pulseKind === "momentumStrike";
    const isSupport = pulseKind === "allyHeal" || pulseKind === "allyShield";
    const isDot = pulseKind === "enemyBurn" || pulseKind === "enemyPoison";
    const isCorrupted =
      pulseKind === "enemyCorruption" || pulseKind === "bossPhase";

    return {
      opacity: pulseKind === "enemyDeath" ? 1 - absoluteImpact * 0.22 : 1,
      transform: [
        { translateX: isHit || isDot ? impact.value * (isDot ? 5 : 10) : 0 },
        {
          translateY: isSupport
            ? -absoluteImpact * 6
            : isCorrupted
              ? -absoluteImpact * 4
              : 0,
        },
        {
          scale:
            1 +
            absoluteImpact * (isCorrupted ? 0.065 : isSupport ? 0.04 : 0.028),
        },
        { rotate: isDot ? `${impact.value * 2.5}deg` : "0deg" },
      ],
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

function AnimatedCombatBlock({
  children,
  pulseKind,
  pulseNonce = 0,
  style,
}: Omit<AnimatedCombatSurfaceProps, "onPress" | "disabled">) {
  const impact = useSharedValue(0);

  useEffect(() => {
    if (!pulseNonce || !pulseKind) return;

    impact.value = 0;
    impact.value = withSequence(
      withTiming(1, { duration: 90 }),
      withTiming(-0.4, { duration: 80 }),
      withTiming(0, { duration: 140 }),
    );
  }, [impact, pulseKind, pulseNonce]);

  const animatedStyle = useAnimatedStyle(() => {
    const absoluteImpact = Math.abs(impact.value);
    const isHit = pulseKind === "allyHit" || pulseKind === "enemyAction";
    const isSupport = pulseKind === "allyHeal" || pulseKind === "allyShield";

    return {
      opacity: pulseKind === "allyHit" ? 1 - absoluteImpact * 0.08 : 1,
      transform: [
        { translateX: isHit ? impact.value * -8 : 0 },
        { translateY: isSupport ? -absoluteImpact * 6 : 0 },
        { scale: 1 + absoluteImpact * (isSupport ? 0.04 : 0.028) },
      ],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

function enemyToCombatState(enemy: Enemy, index: number): CombatEnemyState {
  return {
    enemyId: `mobile-enemy-${index}`,
    enemy,
    stats: {
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      mana: 0,
      maxMana: 0,
      strength: enemy.strength,
      magic: enemy.magic,
      defense: enemy.defense,
      speed: enemy.speed,
    },
    statuses: enemy.statuses ?? [],
    isDead: enemy.hp <= 0,
  };
}

function getAliveEnemies(enemies: CombatEnemyState[]) {
  return enemies.filter((enemy) => !enemy.isDead && enemy.stats.hp > 0);
}

function getAliveAllies(allies: CombatPlayerState[]) {
  return allies.filter((ally) => !ally.isDead && ally.stats.hp > 0);
}

function makeTurnOrder(
  allies: CombatPlayerState[],
  enemies: CombatEnemyState[],
  rng: GameRandom,
) {
  return buildTurnOrder(getAliveAllies(allies), getAliveEnemies(enemies), rng);
}

function getNextTurnIndex(
  order: TurnEntry[],
  currentIndex: number,
  allies: CombatPlayerState[],
  enemies: CombatEnemyState[],
) {
  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % order.length;
    const candidate = order[candidateIndex];

    if (candidate.kind === "player") {
      const ally = allies.find((item) => item.playerId === candidate.entityId);
      if (ally && !ally.isDead && ally.stats.hp > 0) return candidateIndex;
    }

    if (candidate.kind === "enemy") {
      const enemy = enemies.find((item) => item.enemyId === candidate.entityId);
      if (enemy && !enemy.isDead && enemy.stats.hp > 0) return candidateIndex;
    }
  }

  return 0;
}

function evaluateOutcome(
  allies: CombatPlayerState[],
  enemies: CombatEnemyState[],
): CombatOutcome {
  if (getAliveEnemies(enemies).length === 0) return "victory";
  if (getAliveAllies(allies).length === 0) return "defeat";
  return null;
}

function clearDefendingForPlayer(
  allies: CombatPlayerState[],
  playerId: number,
) {
  return allies.map((ally) =>
    ally.playerId === playerId ? { ...ally, defending: false } : ally,
  );
}

type CombatTempo =
  | "player_turn_start"
  | "player_action"
  | "enemy_action"
  | "round_transition";
type CombatPanelMode = "skills" | "items" | "journal" | null;

const MOMENTUM_MAX = 3;

type ClassFlowState = {
  gaugeByPlayerId: Record<number, number>;
  rogueTargetByPlayerId: Record<number, string | null>;
  rogueComboByPlayerId: Record<number, number>;
};

function getClassMechanicName(classType: ClassType) {
  const labels: Record<ClassType, string> = {
    Guerrier: "Garde",
    Mage: "Surcharge",
    Archer: "Marque",
    Voleur: "Combo",
    Demoniste: "Pacte",
    Clerc: "Foi",
    Sentinelle: "Ancre",
  };
  return labels[classType];
}

function getClassGaugeMax(classType: ClassType) {
  if (classType === "Mage") return 2;
  if (classType === "Clerc") return 3;
  if (classType === "Sentinelle") return 3;
  if (classType === "Demoniste") return 2;
  if (classType === "Voleur") return 3;
  return 2;
}

function getClassGaugeValue(
  flow: ClassFlowState,
  playerId: number,
  classType: ClassType,
) {
  if (classType === "Voleur") return flow.rogueComboByPlayerId[playerId] ?? 0;
  return flow.gaugeByPlayerId[playerId] ?? 0;
}

function describeClassMechanic(ally: CombatPlayerState, flow: ClassFlowState) {
  const max = getClassGaugeMax(ally.player.classType);
  const value = Math.min(
    max,
    getClassGaugeValue(flow, ally.playerId, ally.player.classType),
  );
  if (ally.player.classType === "Guerrier")
    return ally.defending ? "Riposte prête" : "Garde";
  if (ally.player.classType === "Archer") return "Marque les cibles";
  if (ally.player.classType === "Mage")
    return value >= max ? "Surcharge prête" : `Surcharge ${value}/${max}`;
  if (ally.player.classType === "Voleur")
    return value > 0 ? `Combo ${value}` : "Combo";
  if (ally.player.classType === "Demoniste")
    return value >= max ? "Pacte prêt" : `Pacte ${value}/${max}`;
  if (ally.player.classType === "Clerc")
    return value >= max ? "Foi prête" : `Foi ${value}/${max}`;
  if (ally.player.classType === "Sentinelle")
    return value >= max ? "Ancre prête" : `Ancre ${value}/${max}`;
  return getClassMechanicName(ally.player.classType);
}

function getClassMechanicToneStyle(classType: ClassType) {
  if (classType === "Guerrier") return styles.classToneWarrior;
  if (classType === "Mage") return styles.classToneMage;
  if (classType === "Archer") return styles.classToneArcher;
  if (classType === "Voleur") return styles.classToneRogue;
  if (classType === "Demoniste") return styles.classToneWarlock;
  if (classType === "Clerc") return styles.classToneCleric;
  if (classType === "Sentinelle") return styles.classToneSentinel;
  return null;
}

function hasNegativeStatus(statuses: StatusEffect[]) {
  return statuses.some((status) => isNegativeCombatStatus(status));
}

function removeOneNegativeStatus(statuses: StatusEffect[]) {
  const index = statuses.findIndex(isNegativeCombatStatus);
  if (index === -1) return { statuses, removed: false };
  return {
    statuses: statuses.filter((_, statusIndex) => statusIndex !== index),
    removed: true,
  };
}

function addStatusOnce(statuses: StatusEffect[], nextStatus: StatusEffect) {
  const existingIndex = statuses.findIndex(
    (status) =>
      status.type === nextStatus.type && status.source === nextStatus.source,
  );
  if (existingIndex === -1) return [...statuses, nextStatus];
  return statuses.map((status, index) =>
    index === existingIndex
      ? {
          ...nextStatus,
          duration: Math.max(status.duration, nextStatus.duration),
          value: Math.max(status.value, nextStatus.value),
        }
      : status,
  );
}

function healLowestLivingAlly(
  allies: CombatPlayerState[],
  amount: number,
  source: string,
) {
  const living = allies.filter(
    (ally) =>
      !ally.isDead && ally.stats.hp > 0 && ally.stats.hp < ally.stats.maxHp,
  );
  if (!living.length || amount <= 0) return { allies, logs: [] as string[] };
  const target = [...living].sort(
    (a, b) => a.stats.hp / a.stats.maxHp - b.stats.hp / b.stats.maxHp,
  )[0];
  let healedAmount = 0;
  return {
    logs: [] as string[],
    allies: allies
      .map((ally) => {
        if (ally.playerId !== target.playerId) return ally;
        const healed = applyHealingToStats({ stats: ally.stats, amount });
        healedAmount = healed.healed;
        return { ...ally, stats: healed.stats };
      })
      .map((ally) => ally),
  };
}

function applyTeamShield(
  allies: CombatPlayerState[],
  value: number,
  source: string,
) {
  if (value <= 0) return allies;
  return allies.map((ally) => {
    if (ally.isDead || ally.stats.hp <= 0) return ally;
    return {
      ...ally,
      statuses: addStatusOnce(ally.statuses, {
        type: "shield",
        value,
        duration: 2,
        source,
      }),
    };
  });
}

function getMomentumLabel(momentum: number, armed = false) {
  if (momentum <= 0) return "Élan vide";
  if (!armed) return `Élan ${momentum}/${MOMENTUM_MAX} · prêt à activer`;
  return momentum >= MOMENTUM_MAX
    ? "Élan activé · prochaine action x2"
    : `Élan activé · +${momentum} dégâts`;
}

function getMomentumBonus(
  ally: CombatPlayerState | null,
  momentum: number,
  armed: boolean,
) {
  if (!ally || !armed || momentum <= 0 || momentum >= MOMENTUM_MAX) return 0;
  return momentum === 1
    ? Math.max(1, Math.floor(ally.stats.strength * 0.18))
    : Math.max(2, Math.floor(ally.stats.strength * 0.35));
}

function shouldRepeatMomentumAction(momentum: number, armed: boolean) {
  return armed && momentum >= MOMENTUM_MAX;
}

function getMomentumSpendLog(
  playerName: string,
  momentum: number,
  bonus: number,
  repeated: boolean,
) {
  if (repeated) return `⚡ ${playerName} libère l’Élan : action doublée.`;
  if (bonus > 0) return `⚡ ${playerName} libère l’Élan : +${bonus} dégâts.`;
  return null;
}

function getLevelChoiceToneStyle(
  tone: "survive" | "damage" | "magic" | "tempo" | "cleanse" | "risk",
) {
  switch (tone) {
    case "survive":
      return styles.levelChoiceToneSurvive;
    case "damage":
      return styles.levelChoiceToneDamage;
    case "magic":
      return styles.levelChoiceToneMagic;
    case "tempo":
      return styles.levelChoiceToneTempo;
    case "cleanse":
      return styles.levelChoiceToneCleanse;
    case "risk":
      return styles.levelChoiceToneRisk;
    default:
      return styles.levelChoiceToneSurvive;
  }
}

function describeCombatTempo(
  tempo: CombatTempo,
  activeAlly: CombatPlayerState | null,
  activeEnemy: CombatEnemyState | null,
) {
  if (tempo === "player_turn_start" && activeAlly)
    return `Tour de ${activeAlly.player.name}`;
  if (tempo === "player_action" && activeAlly)
    return `${activeAlly.player.name} agit`;
  if (tempo === "enemy_action" && activeEnemy)
    return `${activeEnemy.enemy.name} agit`;
  if (tempo === "round_transition") return "Nouveau round";
  return "Combat";
}

function isTurnEntryAlive(
  entry: TurnEntry | undefined,
  allies: CombatPlayerState[],
  enemies: CombatEnemyState[],
) {
  if (!entry) return false;

  if (entry.kind === "player") {
    const ally = allies.find((item) => item.playerId === entry.entityId);
    return Boolean(ally && !ally.isDead && ally.stats.hp > 0);
  }

  const enemy = enemies.find((item) => item.enemyId === entry.entityId);
  return Boolean(enemy && !enemy.isDead && enemy.stats.hp > 0);
}

function getStatusLabel(status: StatusEffect) {
  const labels: Record<string, string> = {
    poison: "Poison",
    burn: "Brûlure",
    freeze: "Gel",
    stun: "Étourdi",
    shield: "Bouclier",
    vulnerable: "Vulnérable",
    marked: "Marqué",
    regen: "Régénération",
    silence: "Silence",
    bleed: "Saignement",
  };
  return labels[status.type] ?? status.type;
}

const combatStatusLabelMap: Record<StatusEffect["type"], string> = {
  poison: "Poison",
  burn: "Brûlure",
  shield: "Bouclier",
  regen: "Régénération",
  weakness: "Faiblesse",
  frailty: "Fragile",
  silence: "Silence",
  vulnerability: "Vulnérable",
  marked: "Marque",
};

function getIntentToneLabel(tone: EnemyIntentionView["tone"]) {
  const labels: Record<EnemyIntentionView["tone"], string> = {
    attack: "Attaque",
    magic: "Pouvoir",
    support: "Soutien",
    danger: "Menace",
  };
  return labels[tone];
}

function cleanCombatLogLine(line: string) {
  return line
    .replace(/^⚔️\s*/, "")
    .replace(/^👹\s*/, "")
    .replace(/^🎒\s*/, "")
    .replace(/^✨\s*/, "")
    .replace(/CRITIQUE !/g, "critique")
    .replace(/—/g, "·")
    .replace(/\s+/g, " ")
    .trim();
}

function getCombatFeedbackLine(line: string) {
  const cleaned = cleanCombatLogLine(line);
  const damage = cleaned.match(
    /(.+?)(?:attaque|sur|utilise)\s+(.+?)(?:\s*:|\s*!|\s*·).*?-(\d+) PV/i,
  );
  if (damage) {
    return `${damage[1].trim()} inflige ${damage[3]} dégâts.`;
  }
  const enemyAttack = cleaned.match(/(.+?) utilise (.+?)\./i);
  if (enemyAttack)
    return `${enemyAttack[1].trim()} prépare ${enemyAttack[2].trim()}.`;
  const heal = cleaned.match(/(.+?) récupère (\d+) PV/i);
  if (heal) return `${heal[1].trim()} récupère ${heal[2]} PV.`;
  if (/bouclier/i.test(cleaned)) return cleaned.replace(/\.$/, ".");
  if (/Nouveau round/i.test(cleaned)) return "Nouveau round.";
  if (/Mana insuffisant/i.test(cleaned)) return cleaned;
  if (/Choisis une cible/i.test(cleaned)) return cleaned;
  if (/Élan insuffisant/i.test(cleaned)) return cleaned;
  return cleaned.length > 82 ? `${cleaned.slice(0, 79).trim()}...` : cleaned;
}

function buildPlayerActionLog(params: {
  actorName: string;
  actionName: string;
  targetName?: string;
  damage?: number;
  heal?: number;
  shield?: number;
  crit?: boolean;
  repeat?: boolean;
  statuses?: string[];
}) {
  const parts: string[] = [];
  if (params.damage && params.damage > 0)
    parts.push(
      `${params.damage}${params.repeat ? " x2" : ""} dégâts${params.crit ? " critique" : ""}`,
    );
  if (params.heal && params.heal > 0) parts.push(`+${params.heal} PV`);
  if (params.shield && params.shield > 0)
    parts.push(`${params.shield} bouclier`);
  if (params.statuses?.length) parts.push(params.statuses.join(" · "));
  const effect = parts.length ? ` : ${parts.join(" · ")}` : ".";
  return `${params.actorName} utilise ${params.actionName}${params.targetName ? ` sur ${params.targetName}` : ""}${effect}`;
}

function getIntentCardStyle(tone: EnemyIntentionView["tone"]) {
  if (tone === "danger") return styles.intentRowDanger;
  if (tone === "magic") return styles.intentRowMagic;
  if (tone === "support") return styles.intentRowSupport;
  return styles.intentRowAttack;
}

function getIntentPillStyle(tone: EnemyIntentionView["tone"]) {
  if (tone === "danger") return styles.intentToneDanger;
  if (tone === "magic") return styles.intentToneMagic;
  if (tone === "support") return styles.intentToneSupport;
  return styles.intentToneAttack;
}

function StatMeter({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "mana";
}) {
  const percent =
    max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <View style={styles.statMeter}>
      <View style={styles.statMeterHeader}>
        <Text
          style={[
            styles.statMeterLabel,
            tone === "hp" ? styles.hpText : styles.manaText,
          ]}
        >
          {label}
        </Text>
        <Text style={styles.statMeterValue}>
          {value}/{max}
        </Text>
      </View>
      <View style={styles.statMeterTrack}>
        <View
          style={[
            styles.statMeterFill,
            tone === "hp" ? styles.hpFill : styles.manaFill,
            { width: `${percent}%` },
          ]}
        />
      </View>
    </View>
  );
}

function StatusChips({
  statuses,
  compact = false,
  max = statuses.length,
  hideEmpty = false,
}: {
  statuses: StatusEffect[];
  compact?: boolean;
  max?: number;
  hideEmpty?: boolean;
}) {
  if (!statuses.length) {
    if (hideEmpty) return null;
    return <Text style={styles.noStatusText}>Aucun statut</Text>;
  }

  const shownStatuses = statuses.slice(0, max);
  const hiddenCount = Math.max(0, statuses.length - shownStatuses.length);

  return (
    <View
      style={[styles.statusChipRow, compact && styles.statusChipRowCompact]}
    >
      {shownStatuses.map((status, index) => (
        <View
          key={`${status.type}-${index}`}
          style={[styles.statusChip, compact && styles.statusChipCompact]}
        >
          <Text
            style={[
              styles.statusChipText,
              compact && styles.statusChipTextCompact,
            ]}
          >
            {getStatusLabel(status)}
            {status.duration ? ` · ${status.duration}t` : ""}
          </Text>
        </View>
      ))}
      {hiddenCount > 0 ? (
        <View style={[styles.statusChip, compact && styles.statusChipCompact]}>
          <Text
            style={[
              styles.statusChipText,
              compact && styles.statusChipTextCompact,
            ]}
          >
            +{hiddenCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function estimateSkillDamage(
  skill: PlayerSkill,
  ally: CombatPlayerState | null,
  enemy: CombatEnemyState | null,
) {
  if (!ally || !enemy) return 0;
  const powerStat =
    skill.scaling === "magic"
      ? ally.stats.magic
      : skill.scaling === "hybrid"
        ? (ally.stats.strength + ally.stats.magic) * 0.5
        : ally.stats.strength;
  const raw = Math.round(powerStat * skill.multiplier);
  return Math.max(1, raw - Math.floor(enemy.stats.defense * 0.45));
}

function getSkillRole(skill: PlayerSkill) {
  if (skill.extraEffects?.some((effect) => effect.type.includes("heal")))
    return "Soutien";
  if (skill.extraEffects?.some((effect) => effect.type.includes("shield")))
    return "Protection";
  if (skill.extraEffects?.some((effect) => effect.type === "apply_status"))
    return "Altération";
  if (skill.multiplier >= 1.7) return "Dégâts forts";
  return "Attaque";
}

function isNegativeCombatStatus(status: StatusEffect) {
  return [
    "poison",
    "burn",
    "weakness",
    "frailty",
    "silence",
    "vulnerability",
    "marked",
  ].includes(status.type);
}

function isCombatUsableItem(item: InventoryItem) {
  return (
    item.type === "consumable" &&
    Boolean(
      item.combatEffects ||
      item.effects?.healHp ||
      item.effects?.healMana ||
      item.effects?.damageEnemy ||
      item.effects?.shield,
    )
  );
}

function hasBuildChoice(ally: CombatPlayerState | null, choiceId: string) {
  return Boolean(
    ally?.player.buildChoices?.some((choice) => choice.id === choiceId),
  );
}

type TalentCombatFeedback = {
  message: string;
  pulseKind: CombatPulseKind;
};

function compactTalentDetail(logs: string[]) {
  const joined = logs.join(" · ");
  const details: string[] = [];
  const damageFlat = joined.match(/\+(\d+) dégâts/i);
  const percent = joined.match(/\+(\d+)%/i);
  const shield = joined.match(/\+(\d+) bouclier/i);
  const hpCost = joined.match(/(\d+)% PV max/i);

  if (damageFlat) details.push(`+${damageFlat[1]} dégâts`);
  if (percent) details.push(`+${percent[1]}%`);
  if (shield) details.push(`Bouclier +${shield[1]}`);
  if (hpCost) details.push(`${hpCost[1]}% PV max`);
  if (/brûlure/i.test(joined)) details.push("Brûlure");
  if (/vulnérable/i.test(joined)) details.push("Vulnérable");
  if (/fragilité/i.test(joined)) details.push("Fragilité");
  if (/régénération/i.test(joined)) details.push("Régénération");
  if (/purge/i.test(joined)) details.push("Purge");
  if (/marqu/i.test(joined)) details.push("Marque");
  if (/combo/i.test(joined)) details.push("Combo");
  if (/équipe/i.test(joined)) details.push("Équipe");

  return details.slice(0, 3).join(" · ");
}

function talentFeedback(
  label: string,
  logs: string[],
  pulseKind: CombatPulseKind,
): TalentCombatFeedback {
  const detail = compactTalentDetail(logs);
  return {
    message: detail ? `${label} : ${detail}.` : `${label} activé.`,
    pulseKind,
  };
}

function getTalentCombatFeedbackFromLogs(
  logs: string[],
): TalentCombatFeedback | null {
  if (!logs.length) return null;
  const joined = logs.join(" ");
  if (joined.includes("Bastion"))
    return talentFeedback("Bastion", logs, "allyShield");
  if (joined.includes("Mur")) return talentFeedback("Mur", logs, "allyShield");
  if (joined.includes("Rang d'or"))
    return talentFeedback("Rang d'or", logs, "allyShield");
  if (joined.includes("Ligne"))
    return talentFeedback("Ligne", logs, "allyShield");
  if (joined.includes("Acier rendu"))
    return talentFeedback("Acier rendu", logs, "momentumStrike");
  if (joined.includes("Contre") || joined.includes("Riposte"))
    return talentFeedback("Riposte", logs, "momentumStrike");
  if (joined.includes("Lecture noire"))
    return talentFeedback("Lecture noire", logs, "enemyCorruption");
  if (joined.includes("Voile"))
    return talentFeedback("Voile", logs, "enemyCorruption");
  if (joined.includes("Flamme vive"))
    return talentFeedback("Flamme vive", logs, "enemyBurn");
  if (joined.includes("Braise"))
    return talentFeedback("Braise", logs, "enemyBurn");
  if (joined.includes("Orage captif"))
    return talentFeedback("Orage captif", logs, "bossPhase");
  if (joined.toLowerCase().includes("surcharge"))
    return talentFeedback("Surcharge", logs, "bossPhase");
  if (joined.includes("Trait final"))
    return talentFeedback("Trait final", logs, "enemyHit");
  if (joined.includes("Finir"))
    return talentFeedback("Finir", logs, "enemyHit");
  if (joined.includes("Pas sûr"))
    return talentFeedback("Pas sûr", logs, "momentumStrike");
  if (joined.includes("Piste"))
    return talentFeedback("Piste", logs, "momentumStrike");
  if (
    joined.includes("Proie") ||
    joined.includes("marque") ||
    joined.includes("marqué")
  )
    return talentFeedback("Trace", logs, "enemyHit");
  if (joined.includes("Dernier anneau"))
    return talentFeedback("Dernier anneau", logs, "momentumStrike");
  if (joined.includes("Ombre") || joined.includes("Pas d'ombre"))
    return talentFeedback("Ombre", logs, "momentumStrike");
  if (joined.includes("Main sûre"))
    return talentFeedback("Main sûre", logs, "allyHeal");
  if (joined.includes("Butin"))
    return talentFeedback("Butin", logs, "allyHeal");
  if (joined.includes("Prix moindre"))
    return talentFeedback("Prix moindre", logs, "enemyCorruption");
  if (joined.includes("pacte"))
    return talentFeedback("Pacte", logs, "enemyCorruption");
  if (joined.includes("Marée noire"))
    return talentFeedback("Marée noire", logs, "enemyCorruption");
  if (joined.includes("Abîme"))
    return talentFeedback("Abîme", logs, "enemyCorruption");
  if (joined.includes("Faim dernière"))
    return talentFeedback("Faim dernière", logs, "enemyCorruption");
  if (joined.includes("Faim"))
    return talentFeedback("Faim", logs, "enemyCorruption");
  if (joined.includes("Foi") || joined.includes("foi"))
    return talentFeedback("Foi", logs, "allyShield");
  if (joined.includes("Sceau gardien"))
    return talentFeedback("Sceau gardien", logs, "allyShield");
  if (joined.includes("Sceau"))
    return talentFeedback("Sceau", logs, "allyShield");
  if (joined.includes("Sentence"))
    return talentFeedback("Sentence", logs, "enemyCorruption");
  if (joined.includes("Jugement"))
    return talentFeedback("Jugement", logs, "enemyCorruption");
  return null;
}

function hasEquippedItem(ally: CombatPlayerState | null, itemName: string) {
  if (!ally) return false;
  return Object.values(ally.player.equipment ?? {}).some(
    (item) => item?.name === itemName,
  );
}

function getCombatSkillManaCost(ally: CombatPlayerState, skill: PlayerSkill) {
  const veilReduction = hasEquippedItem(ally, "Éclat du Voile") ? 2 : 0;
  return Math.max(0, skill.manaCost - veilReduction);
}

function getEnemyStatusPressure(enemy: CombatEnemyState | null) {
  return (
    enemy?.statuses.some((status) => isNegativeCombatStatus(status)) ?? false
  );
}

function getCombatItemSummary(item: InventoryItem) {
  const parts: string[] = [];
  const combat = item.combatEffects;
  const effects = item.effects ?? {};
  const damage = combat?.damageEnemy ?? effects.damageEnemy;
  const healHp = combat?.healHp ?? effects.healHp;
  const healMana = combat?.healMana ?? effects.healMana;
  const shield = combat?.shield ?? effects.shield;

  if (damage) parts.push(`${damage} dégâts`);
  if (healHp) parts.push(`+${healHp} PV`);
  if (healMana) parts.push(`+${healMana} mana`);
  if (shield) parts.push(`${shield} bouclier`);
  if (combat?.applyStatus) parts.push(combat.applyStatus.type);
  if (combat?.cleanseNegative) parts.push("purge");

  return parts.join(" · ") || "utilisable";
}

function combatItemNeedsEnemy(item: InventoryItem) {
  return Boolean(
    item.combatEffects?.target === "enemy" ||
    item.combatEffects?.damageEnemy ||
    item.effects?.damageEnemy ||
    item.combatEffects?.applyStatus?.target === "enemy",
  );
}

function clampClassGauge(value: number, classType: ClassType) {
  return Math.max(0, Math.min(getClassGaugeMax(classType), value));
}

function buildClassGaugeUpdate(
  flow: ClassFlowState,
  ally: CombatPlayerState,
  nextValue: number,
): ClassFlowState {
  if (ally.player.classType === "Voleur") {
    return {
      ...flow,
      rogueComboByPlayerId: {
        ...flow.rogueComboByPlayerId,
        [ally.playerId]: clampClassGauge(nextValue, ally.player.classType),
      },
    };
  }

  return {
    ...flow,
    gaugeByPlayerId: {
      ...flow.gaugeByPlayerId,
      [ally.playerId]: clampClassGauge(nextValue, ally.player.classType),
    },
  };
}

function getClassMechanicDetail(ally: CombatPlayerState, flow: ClassFlowState) {
  const value = getClassGaugeValue(flow, ally.playerId, ally.player.classType);
  const max = getClassGaugeMax(ally.player.classType);

  if (ally.player.classType === "Guerrier") {
    const extras = [
      hasBuildChoice(ally, "warrior_garde") ? "Mur" : null,
      hasBuildChoice(ally, "warrior_riposte") ? "Contre" : null,
      hasBuildChoice(ally, "warrior_commandement") ? "Ligne" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return ally.defending
      ? `Riposte prête${extras ? ` · ${extras}` : ""}`
      : `Défendre prépare une riposte${extras ? ` · ${extras}` : ""}.`;
  }
  if (ally.player.classType === "Mage") {
    const extras = [
      hasBuildChoice(ally, "mage_feu") ? "Braise" : null,
      hasBuildChoice(ally, "mage_voile") ? "Voile" : null,
      hasBuildChoice(ally, "mage_surcharge") ? "Charge" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return value >= max
      ? `Le prochain sort est amplifié${extras ? ` · ${extras}` : ""}.`
      : `Les sorts chargent la surcharge${extras ? ` · ${extras}` : ""}.`;
  }
  if (ally.player.classType === "Archer")
    return "Les tirs marquent. Frapper une marque inflige plus.";
  if (ally.player.classType === "Voleur")
    return value >= max
      ? "Combo prêt : frappe forte puis reset."
      : "Enchaîne la même cible pour monter le combo.";
  if (ally.player.classType === "Demoniste")
    return value >= max
      ? "Le pacte ajoute des dégâts, au prix du sang."
      : "Les actions chargent un pacte risqué.";
  if (ally.player.classType === "Clerc")
    return value >= max
      ? "La foi protège l’équipe."
      : "Défense et soutien chargent la foi.";
  return "";
}

function targetHasMarkedStatus(enemy: CombatEnemyState | null) {
  return Boolean(enemy?.statuses.some((status) => status.type === "marked"));
}

function computeClassStrikeModifier(params: {
  ally: CombatPlayerState;
  targetEnemy: CombatEnemyState;
  flow: ClassFlowState;
  actionKind: "basic" | "skill";
  skill?: PlayerSkill;
}) {
  const { ally, targetEnemy, flow, actionKind, skill } = params;
  const logs: string[] = [];
  let flatBonus = 0;
  let multiplier = 1;
  let nextFlow = flow;
  let selfHpCost = 0;
  let teamShield = 0;
  let applyMark = false;
  const enemyStatuses: StatusEffect[] = [];
  let pulse: CombatPulseKind | null = null;

  if (ally.player.classType === "Archer") {
    applyMark = true;
    if (targetHasMarkedStatus(targetEnemy)) {
      multiplier += hasBuildChoice(ally, "archer_hunters_mark")
        ? 0.45
        : hasBuildChoice(ally, "archer_marque")
          ? 0.35
          : 0.25;
      logs.push(`🎯 ${ally.player.name} exploite la marque.`);
      if (hasBuildChoice(ally, "archer_momentum")) {
        const momentumFlat = Math.max(3, Math.floor(ally.stats.speed * 0.35));
        flatBonus += momentumFlat;
        logs.push(`🎯 Pas sûr : +${momentumFlat} dégâts.`);
      } else if (hasBuildChoice(ally, "archer_piste")) {
        flatBonus += 2;
        logs.push(`🎯 Piste : +2 dégâts.`);
      }
    } else {
      logs.push(`🎯 ${targetEnemy.enemy.name} est marqué.`);
    }
    if (
      hasBuildChoice(ally, "archer_execution") &&
      (hasBuildChoice(ally, "archer_finisher")
        ? targetEnemy.stats.hp / targetEnemy.stats.maxHp <= 0.48
        : targetEnemy.stats.hp / targetEnemy.stats.maxHp <= 0.4)
    ) {
      multiplier += hasBuildChoice(ally, "archer_finisher") ? 0.3 : 0.22;
      logs.push(
        hasBuildChoice(ally, "archer_finisher")
          ? `🎯 Trait final : seuil 48%.`
          : `🎯 Finir : seuil 40%.`,
      );
    }
  }

  if (ally.player.classType === "Voleur") {
    const previousTarget = flow.rogueTargetByPlayerId[ally.playerId];
    const previousCombo = flow.rogueComboByPlayerId[ally.playerId] ?? 0;
    const nextCombo =
      previousTarget === targetEnemy.enemyId
        ? Math.min(3, previousCombo + 1)
        : 1;
    if (
      hasBuildChoice(ally, "rogue_ombre") &&
      previousTarget !== targetEnemy.enemyId &&
      previousCombo === 0
    ) {
      multiplier += hasBuildChoice(ally, "rogue_first_shadow") ? 0.24 : 0.14;
      logs.push(
        hasBuildChoice(ally, "rogue_first_shadow")
          ? `🗡️ Pas d'ombre : ouverture +24%.`
          : `🗡️ Ombre : ouverture +14%.`,
      );
    }
    if (nextCombo >= 3) {
      multiplier += hasBuildChoice(ally, "rogue_chain_finish")
        ? 0.95
        : hasBuildChoice(ally, "rogue_combo")
          ? 0.7
          : 0.45;
      logs.push(
        hasBuildChoice(ally, "rogue_chain_finish")
          ? `🗡️ Dernier anneau : combo +95%.`
          : `🗡️ ${ally.player.name} conclut son combo.`,
      );
      nextFlow = {
        ...nextFlow,
        rogueTargetByPlayerId: {
          ...nextFlow.rogueTargetByPlayerId,
          [ally.playerId]: null,
        },
        rogueComboByPlayerId: {
          ...nextFlow.rogueComboByPlayerId,
          [ally.playerId]: 0,
        },
      };
      pulse = "momentumStrike";
    } else {
      nextFlow = {
        ...nextFlow,
        rogueTargetByPlayerId: {
          ...nextFlow.rogueTargetByPlayerId,
          [ally.playerId]: targetEnemy.enemyId,
        },
        rogueComboByPlayerId: {
          ...nextFlow.rogueComboByPlayerId,
          [ally.playerId]: nextCombo,
        },
      };
    }
  }

  if (ally.player.classType === "Mage" && actionKind === "skill") {
    const current = flow.gaugeByPlayerId[ally.playerId] ?? 0;
    const next = current + 1;
    if (
      hasBuildChoice(ally, "mage_voile") &&
      getEnemyStatusPressure(targetEnemy)
    ) {
      multiplier += hasBuildChoice(ally, "mage_void_reading") ? 0.26 : 0.16;
      if (hasBuildChoice(ally, "mage_void_reading")) {
        enemyStatuses.push({
          type: "vulnerability",
          value: 1,
          duration: 2,
          source: "Lecture noire",
        });
      }
      logs.push(
        hasBuildChoice(ally, "mage_void_reading")
          ? `✦ Lecture noire : +26% et vulnérable.`
          : `✦ Voile : +16%.`,
      );
    }
    if (hasBuildChoice(ally, "mage_feu")) {
      const braiseFlat = Math.max(
        1,
        Math.floor(
          ally.stats.magic *
            (hasBuildChoice(ally, "mage_inferno") ? 0.16 : 0.12),
        ),
      );
      flatBonus += braiseFlat;
      enemyStatuses.push({
        type: "burn",
        value: Math.max(
          1,
          Math.floor(
            ally.stats.magic *
              (hasBuildChoice(ally, "mage_inferno") ? 0.16 : 0.1),
          ),
        ),
        duration: hasBuildChoice(ally, "mage_inferno") ? 3 : 2,
        source: hasBuildChoice(ally, "mage_inferno") ? "Flamme vive" : "Braise",
      });
      logs.push(
        hasBuildChoice(ally, "mage_inferno")
          ? `✦ Flamme vive : +${braiseFlat} et brûlure.`
          : `✦ Braise : +${braiseFlat} et brûlure.`,
      );
    }
    if (next >= getClassGaugeMax("Mage")) {
      multiplier += hasBuildChoice(ally, "mage_overcharge")
        ? 0.95
        : hasBuildChoice(ally, "mage_surcharge")
          ? 0.7
          : 0.55;
      logs.push(
        hasBuildChoice(ally, "mage_overcharge")
          ? `✦ Orage captif : surcharge +95%.`
          : `✦ ${ally.player.name} libère une surcharge.`,
      );
      nextFlow = buildClassGaugeUpdate(nextFlow, ally, 0);
      pulse = "bossPhase";
    } else {
      nextFlow = buildClassGaugeUpdate(nextFlow, ally, next);
    }
  }

  if (ally.player.classType === "Demoniste") {
    const current = flow.gaugeByPlayerId[ally.playerId] ?? 0;
    const next = current + 1;
    if (
      hasBuildChoice(ally, "warlock_abime") &&
      getEnemyStatusPressure(targetEnemy)
    ) {
      multiplier += hasBuildChoice(ally, "warlock_black_tide") ? 0.28 : 0.16;
      if (hasBuildChoice(ally, "warlock_black_tide")) {
        enemyStatuses.push({
          type: "frailty",
          value: 1,
          duration: 2,
          source: "Marée noire",
        });
      }
      logs.push(
        hasBuildChoice(ally, "warlock_black_tide")
          ? `☾ Marée noire : +28% et fragilité.`
          : `☾ Abîme : +16%.`,
      );
    }
    if (
      hasBuildChoice(ally, "warlock_faim") &&
      ally.stats.hp / ally.stats.maxHp <=
        (hasBuildChoice(ally, "warlock_last_hunger") ? 0.4 : 0.5)
    ) {
      multiplier += hasBuildChoice(ally, "warlock_last_hunger") ? 0.38 : 0.22;
      logs.push(
        hasBuildChoice(ally, "warlock_last_hunger")
          ? `☾ Faim dernière : +38% sous 40% PV.`
          : `☾ Faim : +22% sous 50% PV.`,
      );
    }
    if (next >= getClassGaugeMax("Demoniste")) {
      flatBonus += Math.max(
        2,
        Math.floor(
          ally.stats.magic *
            (hasBuildChoice(ally, "warlock_abime") ? 0.6 : 0.45),
        ),
      );
      selfHpCost = Math.max(
        1,
        Math.floor(
          ally.stats.maxHp *
            (hasBuildChoice(ally, "warlock_blood_price")
              ? 0.02
              : hasBuildChoice(ally, "warlock_sang")
                ? 0.035
                : 0.06),
        ),
      );
      logs.push(
        hasBuildChoice(ally, "warlock_blood_price")
          ? `☾ Prix moindre : pacte à 2% PV max.`
          : `☾ ${ally.player.name} paie le pacte.`,
      );
      nextFlow = buildClassGaugeUpdate(nextFlow, ally, 0);
      pulse = "enemyCorruption";
    } else {
      nextFlow = buildClassGaugeUpdate(nextFlow, ally, next);
    }
  }

  if (
    ally.player.classType === "Clerc" &&
    skill?.extraEffects?.some(
      (effect) =>
        effect.type.includes("heal") || effect.type.includes("shield"),
    )
  ) {
    const current = flow.gaugeByPlayerId[ally.playerId] ?? 0;
    const next = current + 1;
    if (next >= getClassGaugeMax("Clerc")) {
      teamShield = Math.max(
        3,
        Math.floor(
          ally.stats.magic *
            (hasBuildChoice(ally, "cleric_wide_faith")
              ? 0.65
              : hasBuildChoice(ally, "cleric_foi")
                ? 0.5
                : 0.35),
        ),
      );
      logs.push(`✚ ${ally.player.name} élève la foi.`);
      nextFlow = buildClassGaugeUpdate(nextFlow, ally, 0);
    } else {
      nextFlow = buildClassGaugeUpdate(nextFlow, ally, next);
    }
  }

  if (
    ally.player.classType === "Clerc" &&
    hasBuildChoice(ally, "cleric_jugement") &&
    targetHasMarkedStatus(targetEnemy)
  ) {
    multiplier += hasBuildChoice(ally, "cleric_sentence") ? 0.4 : 0.22;
    if (hasBuildChoice(ally, "cleric_sentence")) {
      enemyStatuses.push({
        type: "vulnerability",
        value: 1,
        duration: 2,
        source: "Sentence",
      });
    }
    logs.push(
      hasBuildChoice(ally, "cleric_sentence")
        ? `✚ Sentence : +40% et vulnérable.`
        : `✚ Jugement : +22%.`,
    );
  }

  return {
    flatBonus,
    multiplier,
    logs,
    nextFlow,
    selfHpCost,
    teamShield,
    applyMark,
    enemyStatuses,
    pulse,
  };
}

function applyPlayerSkillExtraEffects(params: {
  skill: PlayerSkill;
  damageDealt: number;
  activeAlly: CombatPlayerState;
  allies: CombatPlayerState[];
  targetEnemy: CombatEnemyState;
  enemies: CombatEnemyState[];
}): {
  allies: CombatPlayerState[];
  enemies: CombatEnemyState[];
  logs: string[];
} {
  let allies = [...params.allies];
  let enemies = [...params.enemies];
  const logs: string[] = [];

  for (const effect of params.skill.extraEffects ?? []) {
    if (effect.type === "apply_status" && effect.target === "enemy") {
      const status: StatusEffect = {
        type: effect.status,
        value:
          effect.status === "burn" &&
          hasEquippedItem(params.activeAlly, "Braise noire")
            ? effect.value + 2
            : effect.value,
        duration: effect.duration,
        source: params.skill.name,
      };

      enemies = enemies.map((enemy) =>
        enemy.enemyId === params.targetEnemy.enemyId
          ? { ...enemy, statuses: [...enemy.statuses, status] }
          : enemy,
      );
      logs.push(`${params.targetEnemy.enemy.name} subit ${effect.status}.`);
    }

    if (effect.type === "heal_self") {
      const amount = Math.floor(
        (effect.flat ?? 0) +
          params.damageDealt * (effect.percentDamageDealt ?? 0),
      );
      allies = allies.map((ally) => {
        if (ally.playerId !== params.activeAlly.playerId) return ally;
        const healed = applyHealingToStats({ stats: ally.stats, amount });
        if (healed.healed > 0)
          logs.push(`${ally.player.name} récupère ${healed.healed} PV.`);
        return { ...ally, stats: healed.stats };
      });
    }

    if (effect.type === "grant_shield_self") {
      allies = allies.map((ally) =>
        ally.playerId === params.activeAlly.playerId
          ? {
              ...ally,
              statuses: [
                ...ally.statuses,
                {
                  type: "shield",
                  value: effect.value,
                  duration: effect.duration ?? 2,
                  source: params.skill.name,
                },
              ],
            }
          : ally,
      );
      logs.push(`${params.activeAlly.player.name} gagne un bouclier.`);
    }

    if (effect.type === "grant_shield_team") {
      allies = allies.map((ally) => ({
        ...ally,
        statuses: [
          ...ally.statuses,
          {
            type: "shield",
            value: effect.value,
            duration: effect.duration ?? 2,
            source: params.skill.name,
          },
        ],
      }));
      logs.push("L’équipe gagne un bouclier.");
    }
  }

  return { allies, enemies, logs };
}

type RewardProgressionCard = {
  playerId: number;
  name: string;
  level: number;
  xpLabel: string;
  masteryPoints: number;
  nextTalentLabel: string;
  nextTalentMeta: string;
};

function findNextTalentForPlayer(player: Player) {
  const nodes = getTalentNodes(player.classType);
  const available = nodes
    .filter((node) =>
      isTalentNodeAvailable(
        node,
        player.classType,
        player.level,
        player.buildChoices,
      ),
    )
    .sort(
      (a, b) =>
        (a.tier ?? 0) - (b.tier ?? 0) ||
        a.requiredLevel - b.requiredLevel ||
        a.cost - b.cost,
    );
  if (available[0]) return { node: available[0], ready: true };

  const locked = nodes
    .filter((node) => !isTalentNodeUnlocked(node, player.buildChoices))
    .sort(
      (a, b) =>
        a.requiredLevel - b.requiredLevel ||
        (a.tier ?? 0) - (b.tier ?? 0) ||
        a.cost - b.cost,
    );
  return locked[0] ? { node: locked[0], ready: false } : null;
}

function buildRewardProgressionCards(
  run: EtherniaRunSave,
  participantIndexes: number[],
): RewardProgressionCard[] {
  return participantIndexes
    .map((index) => run.players[index])
    .filter((player): player is Player => Boolean(player))
    .map((player) => {
      const nextTalent = findNextTalentForPlayer(player);
      const remainingXp = Math.max(0, player.xpToNextLevel - player.xp);
      const masteryPoints = getAvailableTalentPoints(
        player.classType,
        player.level,
        player.buildChoices,
      );
      const nextTalentLabel = nextTalent
        ? `${nextTalent.ready ? "Prêt" : "Bientôt"} · ${nextTalent.node.label}`
        : "Arbre complété";
      const nextTalentMeta = nextTalent
        ? `${getTalentNodeRoleText(nextTalent.node)} · coût ${nextTalent.node.cost} · niv. ${nextTalent.node.requiredLevel}`
        : "Aucun talent restant.";

      return {
        playerId: player.id,
        name: player.name,
        level: player.level,
        xpLabel:
          remainingXp > 0
            ? `${remainingXp} XP avant niveau ${player.level + 1}`
            : "Niveau prêt à monter",
        masteryPoints,
        nextTalentLabel,
        nextTalentMeta,
      };
    });
}

function buildRewardHighlights(rewardSummary: MobileCombatRewardSummary) {
  const highlights: string[] = [];
  if (rewardSummary.xpGained > 0)
    highlights.push(`XP +${rewardSummary.xpGained}`);
  if (rewardSummary.goldGained > 0)
    highlights.push(`Or +${rewardSummary.goldGained}`);
  if (rewardSummary.bundle?.items?.length)
    highlights.push(
      `${rewardSummary.bundle.items.length} butin${rewardSummary.bundle.items.length > 1 ? "s" : ""}`,
    );
  if (rewardSummary.levelUps.length > 0)
    highlights.push(
      `${rewardSummary.levelUps.length} niveau${rewardSummary.levelUps.length > 1 ? "x" : ""}`,
    );
  return highlights;
}

export function MobileCombatScreen({
  initialRun,
  combat,
  onCombatFinished,
  onCancelCombat,
  onOpenHeroAfterLevelUp,
}: MobileCombatScreenProps) {
  const participantIndexes = combat.participantIndexes?.length
    ? combat.participantIndexes
    : [initialRun.currentPlayerIndex];
  const participantPlayers = participantIndexes
    .map((index) => initialRun.players[index])
    .filter(Boolean);

  const combatNode = initialRun.nodes.find((node) => node.id === combat.nodeId);
  const isCorruptedCombat = combatNode
    ? isNodeCorrupted(combatNode, initialRun.corruptedNodeIds)
    : false;
  const corruptedPreparedEnemies = useMemo(
    () =>
      applyCorruptedAffixesToEnemies({
        enemies: combat.enemies,
        runSeed: initialRun.runSeed ?? "mobile-run",
        nodeId: combat.nodeId,
        corruptionLevel: initialRun.corruptionLevel,
        corruptionCharge: initialRun.corruptionCharge,
        isCorruptedNode: isCorruptedCombat,
        isBossCombat: combatNode?.type === "boss",
      }),
    [
      combat.enemies,
      combat.nodeId,
      combatNode?.type,
      initialRun.corruptionCharge,
      initialRun.corruptionLevel,
      initialRun.corruptedNodeIds,
      initialRun.runSeed,
      isCorruptedCombat,
    ],
  );
  const talentBalancedEnemies = useMemo(
    () =>
      balanceEnemiesForPartyTalents({
        enemies: corruptedPreparedEnemies,
        players: participantPlayers,
        floor: initialRun.currentFloor,
        isBossCombat: combatNode?.type === "boss",
        corruptionLevel: initialRun.corruptionLevel,
      }),
    [
      combatNode?.type,
      corruptedPreparedEnemies,
      initialRun.corruptionLevel,
      initialRun.currentFloor,
      participantPlayers,
    ],
  );
  const partySizeBalancedEnemies = useMemo(
    () =>
      balanceEnemiesForPartySize({
        enemies: talentBalancedEnemies.enemies,
        participantCount: participantPlayers.length,
        isBossCombat: combatNode?.type === "boss",
      }),
    [
      combatNode?.type,
      participantPlayers.length,
      talentBalancedEnemies.enemies,
    ],
  );
  const preparedEnemies = partySizeBalancedEnemies.enemies;

  const [rng] = useState(() =>
    createScopedRandom(
      initialRun.runSeed ?? "mobile-run",
      `combat-${combat.nodeId}`,
    ),
  );
  const [allies, setAllies] = useState<CombatPlayerState[]>(() =>
    createInitialCombatAllies(participantPlayers),
  );
  const [enemies, setEnemies] = useState<CombatEnemyState[]>(() =>
    preparedEnemies.map(enemyToCombatState),
  );
  const [turnOrder, setTurnOrder] = useState<TurnEntry[]>(() =>
    makeTurnOrder(
      createInitialCombatAllies(participantPlayers),
      preparedEnemies.map(enemyToCombatState),
      rng,
    ),
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [actionTurnNumber, setActionTurnNumber] = useState(1);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(() =>
    combat.enemies.length ? "mobile-enemy-0" : null,
  );
  const [selectedAllyId, setSelectedAllyId] = useState<number | null>(() =>
    participantPlayers[0]?.id ?? null,
  );
  const [logs, setLogs] = useState<string[]>(() => [
    `Combat : ${combat.title}`,
    ...talentBalancedEnemies.logs.map(cleanCombatLogLine),
    ...partySizeBalancedEnemies.logs.map(cleanCombatLogLine),
  ]);
  const [outcome, setOutcome] = useState<CombatOutcome>(null);
  const [saving, setSaving] = useState(false);
  const [rewardSummary, setRewardSummary] =
    useState<MobileCombatRewardSummary | null>(null);
  const [finalizedRun, setFinalizedRun] = useState<EtherniaRunSave | null>(
    null,
  );
  const [finalizedPostCombat, setFinalizedPostCombat] =
    useState<MobilePostCombatFlow | null>(null);
  const [resultStep, setResultStep] = useState<"summary" | "level_up">(
    "summary",
  );
  const rewardHighlights = rewardSummary
    ? buildRewardHighlights(rewardSummary)
    : [];
  const rewardProgressionCards = finalizedRun
    ? buildRewardProgressionCards(finalizedRun, participantIndexes)
    : [];
  const [combatFeedback, setCombatFeedback] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedCombatItemId, setSelectedCombatItemId] = useState<
    string | null
  >(null);
  const [combatTempo, setCombatTempo] =
    useState<CombatTempo>("player_turn_start");
  const [combatPulse, setCombatPulse] = useState<CombatAnimationPulse | null>(
    null,
  );
  const [expandedCombatPanel, setExpandedCombatPanel] =
    useState<CombatPanelMode>(null);
  const [momentumByPlayerId, setMomentumByPlayerId] = useState<
    Record<number, number>
  >({});
  const [armedMomentumByPlayerId, setArmedMomentumByPlayerId] = useState<
    Record<number, boolean>
  >({});
  const [classFlow, setClassFlow] = useState<ClassFlowState>({
    gaugeByPlayerId: {},
    rogueTargetByPlayerId: {},
    rogueComboByPlayerId: {},
  });
  const pulseNonceRef = useRef(0);
  const isBossCombat = combatNode?.type === "boss";

  const activeTurn = turnOrder[turnIndex];
  const activeAlly =
    activeTurn?.kind === "player"
      ? (allies.find((ally) => ally.playerId === activeTurn.entityId) ?? null)
      : null;
  const activeEnemy =
    activeTurn?.kind === "enemy"
      ? (enemies.find((enemy) => enemy.enemyId === activeTurn.entityId) ?? null)
      : null;
  const selectedEnemy = selectedEnemyId
    ? (enemies.find((enemy) => enemy.enemyId === selectedEnemyId) ?? null)
    : null;
  const selectedAlly = selectedAllyId
    ? (allies.find((ally) => ally.playerId === selectedAllyId) ?? null)
    : null;
  const canUseSelectedAlly = Boolean(
    selectedAlly && !selectedAlly.isDead && selectedAlly.stats.hp > 0,
  );
  const canUseSelectedEnemy = Boolean(
    selectedEnemy && !selectedEnemy.isDead && selectedEnemy.stats.hp > 0,
  );
  const aliveEnemyCount = enemies.filter(
    (enemy) => !enemy.isDead && enemy.stats.hp > 0,
  ).length;
  const aliveAllyCount = allies.filter(
    (ally) => !ally.isDead && ally.stats.hp > 0,
  ).length;
  const visibleTurnOrder = turnOrder.length
    ? [...turnOrder.slice(turnIndex), ...turnOrder.slice(0, turnIndex)].slice(
        0,
        6,
      )
    : [];

  const selectNextLivingEnemy = () => {
    const aliveEnemies = getAliveEnemies(enemies);
    if (!aliveEnemies.length) return;
    const currentIndex = aliveEnemies.findIndex(
      (enemy) => enemy.enemyId === selectedEnemyId,
    );
    const nextEnemy = aliveEnemies[(currentIndex + 1 + aliveEnemies.length) % aliveEnemies.length];
    setSelectedEnemyId(nextEnemy.enemyId);
  };

  useEffect(() => {
    const aliveEnemies = getAliveEnemies(enemies);
    if (!aliveEnemies.length) return;
    const selectedStillAlive = aliveEnemies.some(
      (enemy) => enemy.enemyId === selectedEnemyId,
    );
    if (!selectedStillAlive) setSelectedEnemyId(aliveEnemies[0].enemyId);
  }, [enemies, selectedEnemyId]);

  useEffect(() => {
    const aliveAllies = getAliveAllies(allies);
    if (!aliveAllies.length) return;
    const selectedStillAlive = aliveAllies.some(
      (ally) => ally.playerId === selectedAllyId,
    );
    if (!selectedStillAlive) {
      setSelectedAllyId(activeAlly?.playerId ?? aliveAllies[0].playerId);
    }
  }, [activeAlly?.playerId, allies, selectedAllyId]);
  const activeSkills = useMemo(
    () =>
      activeAlly
        ? getUnlockedSkills(
            activeAlly.player.classType,
            activeAlly.player.level,
          )
        : [],
    [activeAlly],
  );
  const selectedSkill =
    activeSkills.find((skill) => skill.id === selectedSkillId) ?? null;
  const activeCombatItems = useMemo(
    () =>
      activeAlly ? activeAlly.player.inventory.filter(isCombatUsableItem) : [],
    [activeAlly],
  );
  const selectedCombatItem =
    activeCombatItems.find((item) => item.id === selectedCombatItemId) ?? null;
  const activeMomentum = activeAlly
    ? (momentumByPlayerId[activeAlly.playerId] ?? 0)
    : 0;
  const activeMomentumArmed = activeAlly
    ? Boolean(armedMomentumByPlayerId[activeAlly.playerId])
    : false;
  const activeMomentumBonus = getMomentumBonus(
    activeAlly,
    activeMomentum,
    activeMomentumArmed,
  );
  const activeMomentumRepeat = shouldRepeatMomentumAction(
    activeMomentum,
    activeMomentumArmed,
  );
  const canControlActiveHero = canLocalDeviceControlPlayer(
    initialRun.coopSession,
    activeAlly?.playerId,
  );
  const activeActionLockMessage = getCoopActionLockMessage(
    initialRun.coopSession,
    activeAlly?.playerId,
  );
  const currentEnemyPlan = useMemo(
    () =>
      activeEnemy
        ? buildPlannedEnemyAction(activeEnemy, getAliveAllies(allies))
        : null,
    [activeEnemy, allies],
  );
  const focusedAlly = useMemo(() => {
    if (activeAlly) return activeAlly;
    const firstTargetId = currentEnemyPlan?.targetIds[0];
    if (typeof firstTargetId === "number") {
      const targetedAlly = allies.find(
        (ally) => ally.playerId === firstTargetId,
      );
      if (targetedAlly) return targetedAlly;
    }
    return getAliveAllies(allies)[0] ?? null;
  }, [activeAlly, allies, currentEnemyPlan]);
  const bossInfo = useMemo(() => {
    if (!isBossCombat) return null;
    const bossEnemy =
      enemies.find((enemy) => enemy.enemy.isBoss) ?? enemies[0] ?? null;
    return buildMobileBossPhaseInfo(bossEnemy);
  }, [enemies, isBossCombat]);
  const visibleEnemyIntentions = useMemo(
    () =>
      buildEnemyIntentions({
        allies,
        enemyStates: enemies,
        plannedEnemyActions: Object.fromEntries(
          enemies
            .map((enemy) => {
              const plan = buildPlannedEnemyAction(
                enemy,
                getAliveAllies(allies),
              );
              return plan ? [enemy.enemyId, plan] : null;
            })
            .filter(
              (
                entry,
              ): entry is [
                string,
                NonNullable<ReturnType<typeof buildPlannedEnemyAction>>,
              ] => Boolean(entry),
            ),
        ),
        statusLabelMap: combatStatusLabelMap,
      }),
    [allies, enemies],
  );
  const processedEnemyTurnRef = useRef<string | null>(null);
  const backgroundSource = getBiomeBackgroundSource(
    initialRun.currentFloorBiome,
  );

  const appendLogs = (nextLogs: string[]) => {
    const cleanedLogs = nextLogs.map(cleanCombatLogLine).filter(Boolean);
    if (cleanedLogs[0])
      setCombatFeedback(getCombatFeedbackLine(cleanedLogs[0]));
    setLogs((current) => [...cleanedLogs, ...current].slice(0, 10));
  };

  const triggerCombatPulse = (kind: CombatPulseKind, targetId: string) => {
    pulseNonceRef.current += 1;
    setCombatPulse({ kind, targetId, nonce: pulseNonceRef.current });
  };

  const blockLockedAction = () => {
    appendLogs([
      activeActionLockMessage ?? "Ce héros est contrôlé par une autre place.",
    ]);
  };

  const gainMomentum = (playerId: number, amount = 1) => {
    setMomentumByPlayerId((current) => ({
      ...current,
      [playerId]: Math.min(MOMENTUM_MAX, (current[playerId] ?? 0) + amount),
    }));
  };

  const armMomentum = (playerId: number) => {
    if (!canLocalDeviceControlPlayer(initialRun.coopSession, playerId)) {
      appendLogs([
        getCoopActionLockMessage(initialRun.coopSession, playerId) ??
          "Ce héros est contrôlé par une autre place.",
      ]);
      return;
    }
    const currentMomentum = momentumByPlayerId[playerId] ?? 0;
    if (currentMomentum <= 0) {
      appendLogs(["Élan insuffisant."]);
      return;
    }
    setArmedMomentumByPlayerId((current) => ({
      ...current,
      [playerId]: !current[playerId],
    }));
  };

  const finishMomentumAfterAction = (playerId: number, consumed: boolean) => {
    if (consumed) {
      setMomentumByPlayerId((current) => ({ ...current, [playerId]: 0 }));
      setArmedMomentumByPlayerId((current) => ({
        ...current,
        [playerId]: false,
      }));
      return;
    }
    setMomentumByPlayerId((current) => ({
      ...current,
      [playerId]: Math.min(MOMENTUM_MAX, (current[playerId] ?? 0) + 1),
    }));
  };

  const resolveCombatOutcome = (
    nextAllies: CombatPlayerState[],
    nextEnemies: CombatEnemyState[],
  ) => {
    const combatOutcome = evaluateOutcome(nextAllies, nextEnemies);

    if (combatOutcome) {
      setOutcome(combatOutcome);
      setRewardSummary(
        buildMobileCombatRewardPreview({
          run: initialRun,
          nodeId: combat.nodeId,
          enemies: nextEnemies,
          outcome: combatOutcome,
        }),
      );
      return true;
    }

    return false;
  };

  const continueAfterAction = (
    nextAllies: CombatPlayerState[],
    nextEnemies: CombatEnemyState[],
    extraLogs: string[] = [],
  ) => {
    setAllies(nextAllies);
    setEnemies(nextEnemies);
    setActionTurnNumber((current) => current + 1);
    appendLogs(extraLogs);

    if (resolveCombatOutcome(nextAllies, nextEnemies)) return;

    let workingAllies = nextAllies;
    let workingEnemies = nextEnemies;
    let workingOrder = turnOrder.length
      ? turnOrder
      : makeTurnOrder(workingAllies, workingEnemies, rng);
    let workingIndex = getNextTurnIndex(
      workingOrder,
      turnIndex,
      workingAllies,
      workingEnemies,
    );
    const transitionLogs: string[] = [];

    for (let guard = 0; guard < 12; guard += 1) {
      if (workingOrder.length === 0 || workingIndex <= turnIndex) {
        workingOrder = makeTurnOrder(workingAllies, workingEnemies, rng);
        workingIndex = 0;
        transitionLogs.push("Nouveau round.");
      }

      const turnEntry = workingOrder[workingIndex];
      if (!turnEntry) break;

      const start = applyStartOfTurnEffects(
        workingAllies,
        workingEnemies,
        turnEntry,
      );
      workingAllies = start.allies;
      workingEnemies = start.enemies;
      transitionLogs.push(...start.logs);

      if (resolveCombatOutcome(workingAllies, workingEnemies)) {
        setAllies(workingAllies);
        setEnemies(workingEnemies);
        appendLogs(transitionLogs);
        return;
      }

      if (isTurnEntryAlive(turnEntry, workingAllies, workingEnemies)) {
        setAllies(workingAllies);
        setEnemies(workingEnemies);
        setTurnOrder(workingOrder);
        setTurnIndex(workingIndex);
        setCombatTempo(
          turnEntry.kind === "player" ? "player_turn_start" : "enemy_action",
        );
        if (transitionLogs.length > 0) appendLogs(transitionLogs);
        return;
      }

      workingIndex = getNextTurnIndex(
        workingOrder,
        workingIndex,
        workingAllies,
        workingEnemies,
      );
    }

    const fallbackOrder = makeTurnOrder(workingAllies, workingEnemies, rng);
    setAllies(workingAllies);
    setEnemies(workingEnemies);
    setTurnOrder(fallbackOrder);
    setTurnIndex(0);
    setCombatTempo("round_transition");
    if (transitionLogs.length > 0) appendLogs(transitionLogs);
  };

  const handleBasicAttack = () => {
    if (!activeAlly || !selectedEnemy || selectedEnemy.isDead) return;
    if (!canControlActiveHero) {
      blockLockedAction();
      return;
    }

    const currentMomentum = momentumByPlayerId[activeAlly.playerId] ?? 0;
    const momentumArmed = Boolean(armedMomentumByPlayerId[activeAlly.playerId]);
    const momentumBonus = getMomentumBonus(
      activeAlly,
      currentMomentum,
      momentumArmed,
    );
    const momentumRepeat = shouldRepeatMomentumAction(
      currentMomentum,
      momentumArmed,
    );
    const momentumConsumed = momentumArmed && currentMomentum > 0;
    const resolution = resolvePlayerBasicAttack({
      playerName: activeAlly.player.name,
      stats: activeAlly.stats,
      enemy: selectedEnemy.enemy,
      enemyStatuses: selectedEnemy.statuses,
      rng,
    });
    const classModifier = computeClassStrikeModifier({
      ally: activeAlly,
      targetEnemy: selectedEnemy,
      flow: classFlow,
      actionKind: "basic",
    });

    const phaseLogs: string[] = [...classModifier.logs];
    let bossPhaseTriggered = false;
    let nextAllies = clearDefendingForPlayer(allies, activeAlly.playerId);
    const nextEnemies = enemies.map((enemy) => {
      if (enemy.enemyId !== selectedEnemy.enemyId) return enemy;
      const beforeEnemy = enemy.enemy;
      const baseDamage = Math.max(
        0,
        Math.round(
          (resolution.damage + momentumBonus + classModifier.flatBonus) *
            classModifier.multiplier,
        ),
      );
      const applied = applyIncomingDamageToStats({
        stats: enemy.stats,
        statuses: enemy.statuses,
        damage: momentumRepeat ? baseDamage * 2 : baseDamage,
      });
      const deathEffect = resolveCorruptedAffixDeathEffects({
        before: beforeEnemy,
        afterHp: applied.stats.hp,
        allies: nextAllies,
        corruptionLevel: initialRun.corruptionLevel,
      });
      nextAllies = deathEffect.allies;
      phaseLogs.push(...deathEffect.logs);
      let nextStatuses = classModifier.applyMark
        ? addStatusOnce(applied.statuses, {
            type: "marked",
            value: hasBuildChoice(activeAlly, "archer_hunters_mark") ? 2 : 1,
            duration: hasBuildChoice(activeAlly, "archer_hunters_mark")
              ? 4
              : hasBuildChoice(activeAlly, "archer_marque")
                ? 3
                : 2,
            source: activeAlly.player.name,
          })
        : applied.statuses;
      for (const status of classModifier.enemyStatuses) {
        nextStatuses = addStatusOnce(nextStatuses, status);
      }
      const damagedEnemy: CombatEnemyState = {
        ...enemy,
        stats: applied.stats,
        statuses: nextStatuses,
        enemy: { ...enemy.enemy, hp: applied.stats.hp, statuses: nextStatuses },
        isDead: applied.stats.hp <= 0,
      };
      const phaseTransition = applyMobileBossPhaseTransition(damagedEnemy);
      if (phaseTransition.logs.length > 0) bossPhaseTriggered = true;
      phaseLogs.push(...phaseTransition.logs);
      return phaseTransition.enemyState;
    });

    const momentumLog = getMomentumSpendLog(
      activeAlly.player.name,
      currentMomentum,
      momentumBonus,
      momentumRepeat,
    );
    const selfCostLogs: string[] = [];
    if (classModifier.selfHpCost > 0) {
      nextAllies = nextAllies.map((ally) =>
        ally.playerId === activeAlly.playerId
          ? {
              ...ally,
              stats: {
                ...ally.stats,
                hp: Math.max(1, ally.stats.hp - classModifier.selfHpCost),
              },
            }
          : ally,
      );
      selfCostLogs.push(
        `${activeAlly.player.name} perd ${classModifier.selfHpCost} PV.`,
      );
    }
    if (classModifier.teamShield > 0) {
      nextAllies = applyTeamShield(nextAllies, classModifier.teamShield, "Foi");
    }
    const masteryFeedback = getTalentCombatFeedbackFromLogs(phaseLogs);
    if (masteryFeedback) setCombatFeedback(masteryFeedback.message);
    setClassFlow(classModifier.nextFlow);
    finishMomentumAfterAction(activeAlly.playerId, momentumConsumed);
    triggerCombatPulse(
      nextEnemies.find((enemy) => enemy.enemyId === selectedEnemy.enemyId)
        ?.isDead
        ? "enemyDeath"
        : bossPhaseTriggered
          ? "bossPhase"
          : (masteryFeedback?.pulseKind ??
            classModifier.pulse ??
            (momentumConsumed ? "momentumStrike" : "enemyHit")),
      selectedEnemy.enemyId,
    );
    setCombatTempo("player_action");
    const dealtDamage = Math.max(
      0,
      Math.round(
        (resolution.damage + momentumBonus + classModifier.flatBonus) *
          classModifier.multiplier,
      ) * (momentumRepeat ? 2 : 1),
    );
    continueAfterAction(nextAllies, nextEnemies, [
      buildPlayerActionLog({
        actorName: activeAlly.player.name,
        actionName: momentumRepeat ? "Attaque x2" : "Attaque",
        targetName: selectedEnemy.enemy.name,
        damage: dealtDamage,
        crit: resolution.crit,
        repeat: momentumRepeat,
        statuses: classModifier.applyMark ? ["marque appliquée"] : undefined,
      }),
      ...(momentumLog ? [momentumLog] : []),
      ...selfCostLogs,
      ...(masteryFeedback ? [masteryFeedback.message] : []),
      ...phaseLogs,
    ]);
  };

  const handleUseSkill = (skill: PlayerSkill) => {
    if (!activeAlly || !selectedEnemy || selectedEnemy.isDead) return;
    if (!canControlActiveHero) {
      blockLockedAction();
      return;
    }

    const manaCost = getCombatSkillManaCost(activeAlly, skill);
    if (activeAlly.stats.mana < manaCost) {
      appendLogs([`Mana insuffisant pour ${skill.name}.`]);
      return;
    }

    const currentMomentum = momentumByPlayerId[activeAlly.playerId] ?? 0;
    const momentumArmed = Boolean(armedMomentumByPlayerId[activeAlly.playerId]);
    const momentumBonus = getMomentumBonus(
      activeAlly,
      currentMomentum,
      momentumArmed,
    );
    const momentumRepeat = shouldRepeatMomentumAction(
      currentMomentum,
      momentumArmed,
    );
    const momentumConsumed = momentumArmed && currentMomentum > 0;

    const resolution = resolvePlayerSkill({
      skill,
      playerName: activeAlly.player.name,
      stats: activeAlly.stats,
      enemy: selectedEnemy.enemy,
      playerStatuses: activeAlly.statuses,
      enemyStatuses: selectedEnemy.statuses,
    });
    const classModifier = computeClassStrikeModifier({
      ally: activeAlly,
      targetEnemy: selectedEnemy,
      flow: classFlow,
      actionKind: "skill",
      skill,
    });

    let nextAllies = allies.map((ally) =>
      ally.playerId === activeAlly.playerId
        ? {
            ...ally,
            stats: {
              ...ally.stats,
              mana: Math.max(0, ally.stats.mana - manaCost),
            },
            defending: false,
          }
        : ally,
    );

    const phaseLogs: string[] = [...classModifier.logs];
    let bossPhaseTriggered = false;
    let nextEnemies = enemies.map((enemy) => {
      if (enemy.enemyId !== selectedEnemy.enemyId) return enemy;
      const beforeEnemy = enemy.enemy;
      const baseDamage = Math.max(
        0,
        Math.round(
          (resolution.damage + momentumBonus + classModifier.flatBonus) *
            classModifier.multiplier,
        ),
      );
      const applied = applyIncomingDamageToStats({
        stats: enemy.stats,
        statuses: enemy.statuses,
        damage: momentumRepeat ? baseDamage * 2 : baseDamage,
      });
      const deathEffect = resolveCorruptedAffixDeathEffects({
        before: beforeEnemy,
        afterHp: applied.stats.hp,
        allies: nextAllies,
        corruptionLevel: initialRun.corruptionLevel,
      });
      nextAllies = deathEffect.allies;
      phaseLogs.push(...deathEffect.logs);
      let nextStatuses = classModifier.applyMark
        ? addStatusOnce(applied.statuses, {
            type: "marked",
            value: hasBuildChoice(activeAlly, "archer_hunters_mark") ? 2 : 1,
            duration: hasBuildChoice(activeAlly, "archer_hunters_mark")
              ? 4
              : hasBuildChoice(activeAlly, "archer_marque")
                ? 3
                : 2,
            source: activeAlly.player.name,
          })
        : applied.statuses;
      for (const status of classModifier.enemyStatuses) {
        nextStatuses = addStatusOnce(nextStatuses, status);
      }
      const damagedEnemy: CombatEnemyState = {
        ...enemy,
        stats: applied.stats,
        statuses: nextStatuses,
        enemy: { ...enemy.enemy, hp: applied.stats.hp, statuses: nextStatuses },
        isDead: applied.stats.hp <= 0,
      };
      const phaseTransition = applyMobileBossPhaseTransition(damagedEnemy);
      if (phaseTransition.logs.length > 0) bossPhaseTriggered = true;
      phaseLogs.push(...phaseTransition.logs);
      return phaseTransition.enemyState;
    });

    const extras = applyPlayerSkillExtraEffects({
      skill,
      damageDealt: resolution.damage,
      activeAlly,
      allies: nextAllies,
      targetEnemy: selectedEnemy,
      enemies: nextEnemies,
    });
    nextAllies = extras.allies;
    nextEnemies = extras.enemies;

    const skillStatusEffect = skill.extraEffects?.find(
      (effect) => effect.type === "apply_status" && effect.target === "enemy",
    ) as { status?: string } | undefined;
    const skillStatus = skillStatusEffect?.status;
    const skillPulse: CombatPulseKind = nextEnemies.find(
      (enemy) => enemy.enemyId === selectedEnemy.enemyId,
    )?.isDead
      ? "enemyDeath"
      : bossPhaseTriggered
        ? "bossPhase"
        : skillStatus === "burn"
          ? "enemyBurn"
          : skillStatus === "poison"
            ? "enemyPoison"
            : skillStatus
              ? "enemyCorruption"
              : "enemyHit";
    triggerCombatPulse(skillPulse, selectedEnemy.enemyId);
    const momentumLog = getMomentumSpendLog(
      activeAlly.player.name,
      currentMomentum,
      momentumBonus,
      momentumRepeat,
    );
    const selfCostLogs: string[] = [];
    if (classModifier.selfHpCost > 0) {
      nextAllies = nextAllies.map((ally) =>
        ally.playerId === activeAlly.playerId
          ? {
              ...ally,
              stats: {
                ...ally.stats,
                hp: Math.max(1, ally.stats.hp - classModifier.selfHpCost),
              },
            }
          : ally,
      );
      selfCostLogs.push(
        `${activeAlly.player.name} perd ${classModifier.selfHpCost} PV.`,
      );
    }
    if (classModifier.teamShield > 0) {
      nextAllies = applyTeamShield(nextAllies, classModifier.teamShield, "Foi");
      selfCostLogs.push(`L’équipe gagne un bouclier.`);
    }
    const masteryFeedback = getTalentCombatFeedbackFromLogs(phaseLogs);
    if (masteryFeedback) {
      setCombatFeedback(masteryFeedback.message);
      triggerCombatPulse(masteryFeedback.pulseKind, selectedEnemy.enemyId);
    }
    setClassFlow(classModifier.nextFlow);
    finishMomentumAfterAction(activeAlly.playerId, momentumConsumed);
    setCombatTempo("player_action");
    const dealtDamage = Math.max(
      0,
      Math.round(
        (resolution.damage + momentumBonus + classModifier.flatBonus) *
          classModifier.multiplier,
      ) * (momentumRepeat ? 2 : 1),
    );
    const statusLabels = [
      ...(classModifier.applyMark ? ["marque appliquée"] : []),
      ...(skillStatus
        ? [
            combatStatusLabelMap[skillStatus as StatusEffect["type"]] ??
              skillStatus,
          ]
        : []),
    ];
    continueAfterAction(nextAllies, nextEnemies, [
      buildPlayerActionLog({
        actorName: activeAlly.player.name,
        actionName: skill.name,
        targetName: selectedEnemy.enemy.name,
        damage: dealtDamage,
        crit: resolution.crit,
        repeat: momentumRepeat,
        statuses: statusLabels,
      }),
      ...(momentumLog ? [momentumLog] : []),
      ...selfCostLogs,
      ...(masteryFeedback ? [masteryFeedback.message] : []),
      ...phaseLogs,
      ...extras.logs,
    ]);
  };

  const handleDefend = () => {
    if (!activeAlly) return;
    if (!canControlActiveHero) {
      blockLockedAction();
      return;
    }
    let nextAllies = allies.map((ally) =>
      ally.playerId === activeAlly.playerId
        ? { ...ally, defending: true }
        : ally,
    );
    const defendLogs = [`🛡️ ${activeAlly.player.name} se met en défense.`];

    if (activeAlly.player.classType === "Guerrier") {
      defendLogs.push(`⚔️ Riposte prête.`);
      if (hasBuildChoice(activeAlly, "warrior_garde")) {
        const selfShield = Math.max(
          3,
          Math.floor(
            activeAlly.stats.defense *
              (hasBuildChoice(activeAlly, "warrior_stalwart") ? 0.9 : 0.75),
          ),
        );
        nextAllies = nextAllies.map((ally) =>
          ally.playerId === activeAlly.playerId
            ? {
                ...ally,
                statuses: addStatusOnce(ally.statuses, {
                  type: "shield",
                  value: selfShield,
                  duration: hasBuildChoice(activeAlly, "warrior_stalwart")
                    ? 3
                    : 2,
                  source: hasBuildChoice(activeAlly, "warrior_stalwart")
                    ? "Bastion"
                    : "Mur",
                }),
              }
            : ally,
        );
        defendLogs.push(
          `${hasBuildChoice(activeAlly, "warrior_stalwart") ? "Bastion" : "Mur"} : +${selfShield} bouclier.`,
        );
      }
      if (hasBuildChoice(activeAlly, "warrior_commandement")) {
        const lineShield = hasBuildChoice(activeAlly, "warrior_battle_line")
          ? 4
          : 3;
        nextAllies = applyTeamShield(
          nextAllies,
          lineShield,
          hasBuildChoice(activeAlly, "warrior_battle_line")
            ? "Rang d'or"
            : "Ligne",
        );
        defendLogs.push(
          `${hasBuildChoice(activeAlly, "warrior_battle_line") ? "Rang d'or" : "Ligne"} : +${lineShield} bouclier équipe.`,
        );
      }
    }

    if (
      hasEquippedItem(activeAlly, "Sceau froid") ||
      hasBuildChoice(activeAlly, "cleric_sceau")
    ) {
      const fragile = [...nextAllies]
        .filter(
          (ally) =>
            ally.playerId !== activeAlly.playerId &&
            !ally.isDead &&
            ally.stats.hp > 0,
        )
        .sort(
          (a, b) => a.stats.hp / a.stats.maxHp - b.stats.hp / b.stats.maxHp,
        )[0];
      if (fragile) {
        const guardianSeal = hasBuildChoice(activeAlly, "cleric_guardian_seal");
        let cleansed = false;
        nextAllies = nextAllies.map((ally) => {
          if (ally.playerId !== fragile.playerId) return ally;
          const cleaned = guardianSeal
            ? removeOneNegativeStatus(ally.statuses)
            : { statuses: ally.statuses, removed: false };
          cleansed = cleaned.removed;
          return {
            ...ally,
            statuses: addStatusOnce(cleaned.statuses, {
              type: "shield",
              value: guardianSeal ? 8 : 5,
              duration: guardianSeal ? 3 : 2,
              source: hasEquippedItem(activeAlly, "Sceau froid")
                ? "Sceau froid"
                : guardianSeal
                  ? "Sceau gardien"
                  : "Sceau",
            }),
          };
        });
        defendLogs.push(
          guardianSeal
            ? `Sceau gardien : ${fragile.player.name} +8 bouclier${cleansed ? " et purge" : ""}.`
            : `Sceau : ${fragile.player.name} est couvert.`,
        );
      }
    }

    if (activeAlly.player.classType === "Clerc") {
      const currentFaith = classFlow.gaugeByPlayerId[activeAlly.playerId] ?? 0;
      const nextFaith = currentFaith + 1;
      if (nextFaith >= getClassGaugeMax("Clerc")) {
        const shieldValue = Math.max(
          3,
          Math.floor(
            activeAlly.stats.magic *
              (hasBuildChoice(activeAlly, "cleric_wide_faith")
                ? 0.65
                : hasBuildChoice(activeAlly, "cleric_foi")
                  ? 0.5
                  : 0.35),
          ),
        );
        nextAllies = applyTeamShield(nextAllies, shieldValue, "Foi");
        setClassFlow(buildClassGaugeUpdate(classFlow, activeAlly, 0));
        defendLogs.push(`✚ Foi : bouclier d’équipe.`);
      } else {
        setClassFlow(buildClassGaugeUpdate(classFlow, activeAlly, nextFaith));
      }
    }

    triggerCombatPulse("allyShield", String(activeAlly.playerId));
    const masteryFeedback = getTalentCombatFeedbackFromLogs(defendLogs);
    if (masteryFeedback) {
      setCombatFeedback(masteryFeedback.message);
      triggerCombatPulse(
        masteryFeedback.pulseKind,
        String(activeAlly.playerId),
      );
    }
    gainMomentum(activeAlly.playerId);
    setCombatTempo("player_action");
    continueAfterAction(nextAllies, enemies, [
      `${activeAlly.player.name} se protège et gagne 1 élan.`,
      ...(masteryFeedback ? [masteryFeedback.message] : []),
      ...defendLogs,
    ]);
  };

  const handleWait = () => {
    if (!activeAlly) return;
    if (!canControlActiveHero) {
      blockLockedAction();
      return;
    }
    const nextAllies = clearDefendingForPlayer(allies, activeAlly.playerId);
    gainMomentum(activeAlly.playerId);
    setCombatTempo("player_action");
    continueAfterAction(nextAllies, enemies, [
      `${activeAlly.player.name} attend et gagne 1 élan.`,
    ]);
  };

  const handleUseCombatItem = (item: InventoryItem) => {
    if (!activeAlly) return;
    if (!canControlActiveHero) {
      blockLockedAction();
      return;
    }
    if (
      combatItemNeedsEnemy(item) &&
      (!selectedEnemy || selectedEnemy.isDead)
    ) {
      appendLogs(["Choisis une cible avant d’utiliser cet objet."]);
      return;
    }

    const combat = item.combatEffects;
    const effects = item.effects ?? {};
    const damage = combat?.damageEnemy ?? effects.damageEnemy ?? 0;
    const healHp = combat?.healHp ?? effects.healHp ?? 0;
    const healMana = combat?.healMana ?? effects.healMana ?? 0;
    const shield = combat?.shield ?? effects.shield ?? 0;
    const allyTargetId =
      healHp > 0 || healMana > 0 || shield > 0 || combat?.cleanseNegative
        ? selectedAlly?.playerId ?? activeAlly.playerId
        : activeAlly.playerId;
    const itemLogs: string[] = [
      `🎒 ${activeAlly.player.name} utilise ${item.name}.`,
    ];

    let nextAllies = allies.map((ally) => {
      const isUser = ally.playerId === activeAlly.playerId;
      const isTarget = ally.playerId === allyTargetId;
      if (!isUser && !isTarget) return ally;

      let nextStats = { ...ally.stats };
      let nextStatuses = [...ally.statuses];

      if (isTarget && healHp > 0) {
        const healed = applyHealingToStats({
          stats: nextStats,
          amount: healHp,
        });
        nextStats = healed.stats;
        if (healed.healed > 0)
          itemLogs.push(`${ally.player.name} récupère ${healed.healed} PV.`);
      }

      if (isTarget && healMana > 0) {
        const beforeMana = nextStats.mana;
        nextStats = {
          ...nextStats,
          mana: Math.min(nextStats.maxMana, nextStats.mana + healMana),
        };
        const manaGain = nextStats.mana - beforeMana;
        if (manaGain > 0)
          itemLogs.push(`${ally.player.name} récupère ${manaGain} mana.`);
      }

      if (isTarget && shield > 0) {
        nextStatuses = [
          ...nextStatuses,
          { type: "shield", value: shield, duration: 2, source: item.name },
        ];
        itemLogs.push(`${ally.player.name} gagne un bouclier.`);
      }

      if (isTarget && combat?.cleanseNegative) {
        const beforeCount = nextStatuses.length;
        nextStatuses = nextStatuses.filter(
          (status) => !isNegativeCombatStatus(status),
        );
        if (beforeCount !== nextStatuses.length)
          itemLogs.push(`${ally.player.name} se libère d’altérations.`);
      }

      if (isTarget && combat?.applyStatus?.target === "self") {
        nextStatuses = [
          ...nextStatuses,
          { ...combat.applyStatus, source: item.name },
        ];
        itemLogs.push(`${ally.player.name} reçoit ${combat.applyStatus.type}.`);
      }

      return {
        ...ally,
        stats: nextStats,
        statuses: nextStatuses,
        defending: isUser ? false : ally.defending,
        player: isUser
          ? {
              ...ally.player,
              inventory: removeOneItemFromInventoryList(
                ally.player.inventory,
                item.id,
              ),
            }
          : ally.player,
      };
    });

    const phaseLogs: string[] = [];
    let bossPhaseTriggered = false;
    let nextEnemies = enemies.map((enemy) => {
      if (!selectedEnemy || enemy.enemyId !== selectedEnemy.enemyId)
        return enemy;

      let nextEnemy = enemy;
      if (damage > 0) {
        const beforeEnemy = nextEnemy.enemy;
        const applied = applyIncomingDamageToStats({
          stats: nextEnemy.stats,
          statuses: nextEnemy.statuses,
          damage,
        });
        const deathEffect = resolveCorruptedAffixDeathEffects({
          before: beforeEnemy,
          afterHp: applied.stats.hp,
          allies: nextAllies,
          corruptionLevel: initialRun.corruptionLevel,
        });
        nextAllies = deathEffect.allies;
        phaseLogs.push(...deathEffect.logs);
        nextEnemy = {
          ...nextEnemy,
          stats: applied.stats,
          statuses: applied.statuses,
          enemy: {
            ...nextEnemy.enemy,
            hp: applied.stats.hp,
            statuses: applied.statuses,
          },
          isDead: applied.stats.hp <= 0,
        };
        itemLogs.push(`${nextEnemy.enemy.name} subit ${damage} dégâts.`);
      }

      if (combat?.applyStatus?.target === "enemy") {
        const nextStatuses = [
          ...nextEnemy.statuses,
          { ...combat.applyStatus, source: item.name },
        ];
        nextEnemy = {
          ...nextEnemy,
          statuses: nextStatuses,
          enemy: { ...nextEnemy.enemy, statuses: nextStatuses },
        };
        itemLogs.push(
          `${nextEnemy.enemy.name} subit ${combat.applyStatus.type}.`,
        );
      }

      const phaseTransition = applyMobileBossPhaseTransition(nextEnemy);
      if (phaseTransition.logs.length > 0) bossPhaseTriggered = true;
      phaseLogs.push(...phaseTransition.logs);
      return phaseTransition.enemyState;
    });

    setSelectedCombatItemId(null);
    const itemStatus = combat?.applyStatus?.type;
    if (
      selectedEnemy &&
      (damage > 0 || combat?.applyStatus?.target === "enemy")
    ) {
      const itemPulse: CombatPulseKind = nextEnemies.find(
        (enemy) => enemy.enemyId === selectedEnemy.enemyId,
      )?.isDead
        ? "enemyDeath"
        : bossPhaseTriggered
          ? "bossPhase"
          : itemStatus === "burn"
            ? "enemyBurn"
            : itemStatus === "poison"
              ? "enemyPoison"
              : itemStatus
                ? "enemyCorruption"
                : "enemyHit";
      triggerCombatPulse(itemPulse, selectedEnemy.enemyId);
    } else if (healHp > 0 || healMana > 0) {
      triggerCombatPulse("allyHeal", String(allyTargetId));
    } else if (shield > 0) {
      triggerCombatPulse("allyShield", String(allyTargetId));
    }
    setCombatTempo("player_action");
    nextAllies = clearDefendingForPlayer(nextAllies, activeAlly.playerId);
    gainMomentum(
      activeAlly.playerId,
      hasBuildChoice(activeAlly, "rogue_quick_loot")
        ? 2
        : hasBuildChoice(activeAlly, "rogue_butin")
          ? 2
          : 1,
    );
    if (hasBuildChoice(activeAlly, "rogue_quick_loot")) {
      nextAllies = nextAllies.map((ally) =>
        ally.playerId === activeAlly.playerId
          ? {
              ...ally,
              statuses: addStatusOnce(ally.statuses, {
                type: "regen",
                value: 2,
                duration: 2,
                source: "Main sûre",
              }),
            }
          : ally,
      );
      itemLogs.push(`Main sûre : +2 élan et régénération.`);
    } else if (hasBuildChoice(activeAlly, "rogue_butin")) {
      itemLogs.push(`Butin : Élan accru.`);
    }
    const masteryFeedback = getTalentCombatFeedbackFromLogs(itemLogs);
    if (masteryFeedback) {
      setCombatFeedback(masteryFeedback.message);
      triggerCombatPulse(
        masteryFeedback.pulseKind,
        String(activeAlly.playerId),
      );
    }
    const itemSummary = buildPlayerActionLog({
      actorName: activeAlly.player.name,
      actionName: item.name,
      targetName:
        damage > 0 && selectedEnemy ? selectedEnemy.enemy.name : undefined,
      damage,
      heal: healHp,
      shield,
      statuses: [
        healMana > 0 ? `+${healMana} mana` : null,
        itemStatus
          ? (combatStatusLabelMap[itemStatus as StatusEffect["type"]] ??
            itemStatus)
          : null,
      ].filter((line): line is string => Boolean(line)),
    });
    continueAfterAction(nextAllies, nextEnemies, [
      itemSummary,
      ...(masteryFeedback ? [masteryFeedback.message] : []),
      ...itemLogs.slice(1),
      ...phaseLogs,
    ]);
  };

  const handleEnemyTurn = () => {
    if (!activeEnemy || activeEnemy.isDead) return;

    setCombatTempo("enemy_action");

    const livingAllies = getAliveAllies(allies);
    const plan = buildPlannedEnemyAction(activeEnemy, livingAllies);
    if (!plan) {
      continueAfterAction(allies, enemies, [
        `${activeEnemy.enemy.name} ne peut pas agir.`,
      ]);
      return;
    }

    let nextAllies = [...allies];
    let nextEnemies = enemies.map((enemy) =>
      enemy.enemyId === activeEnemy.enemyId
        ? {
            ...enemy,
            enemy: {
              ...plan.enemy,
              hp: enemy.stats.hp,
              maxHp: enemy.stats.maxHp,
              strength: enemy.stats.strength,
              magic: enemy.stats.magic,
              defense: enemy.stats.defense,
              speed: enemy.stats.speed,
              statuses: plan.enemyStatuses,
            },
            statuses: plan.enemyStatuses,
          }
        : enemy,
    );
    const actingEnemy =
      nextEnemies.find((enemy) => enemy.enemyId === activeEnemy.enemyId) ??
      activeEnemy;
    const turnLogs = [
      `${actingEnemy.enemy.name} utilise ${plan.attack.name}.`,
      ...plan.logs,
    ];
    const riposteHits: { playerName: string; damage: number }[] = [];
    const momentumGainsFromHits: number[] = [];

    for (const targetId of plan.targetIds) {
      nextAllies = nextAllies.map((ally) => {
        if (ally.playerId !== targetId || ally.isDead) return ally;

        const resolution = resolveEnemyAttackAgainstPlayer({
          attack: plan.attack,
          enemy: actingEnemy.enemy,
          targetStats: ally.stats,
          targetStatuses: ally.statuses,
          targetDefending: ally.defending,
          rng,
        });

        const statusFromAttack =
          plan.attack.statusEffect &&
          (plan.attack.statusEffect.target === "player" ||
            plan.attack.statusEffect.target === "all_players")
            ? [
                {
                  type: plan.attack.statusEffect.type,
                  value: plan.attack.statusEffect.value,
                  duration: plan.attack.statusEffect.duration,
                  source: plan.attack.name,
                } satisfies StatusEffect,
              ]
            : [];

        turnLogs.push(
          `${ally.player.name} perd ${resolution.hpLost} PV${resolution.crit ? " · critique" : ""}.`,
        );
        if (
          ally.player.classType === "Guerrier" &&
          ally.defending &&
          resolution.stats.hp > 0 &&
          resolution.hpLost > 0
        ) {
          riposteHits.push({
            playerName: ally.player.name,
            damage: Math.max(
              1,
              Math.floor(
                ally.stats.strength *
                  (hasBuildChoice(ally, "warrior_riposte_master")
                    ? 0.95
                    : hasBuildChoice(ally, "warrior_riposte")
                      ? 0.75
                      : 0.45),
              ),
            ),
          });
        }

        if (resolution.hpLost > 0 && hasEquippedItem(ally, "Anneau fendu")) {
          momentumGainsFromHits.push(ally.playerId);
        }

        return {
          ...ally,
          stats: resolution.stats,
          statuses: [...resolution.statuses, ...statusFromAttack],
          defending: resolution.stats.hp <= 0 ? false : ally.defending,
          isDead: resolution.stats.hp <= 0,
        };
      });
    }

    if (momentumGainsFromHits.length > 0) {
      setMomentumByPlayerId((current) => {
        const next = { ...current };
        for (const id of momentumGainsFromHits) {
          next[id] = Math.min(MOMENTUM_MAX, (next[id] ?? 0) + 1);
        }
        return next;
      });
      turnLogs.push(`Anneau fendu : Élan gagné.`);
    }

    if (riposteHits.length > 0) {
      const totalRiposteDamage = riposteHits.reduce(
        (total, hit) => total + hit.damage,
        0,
      );
      nextEnemies = nextEnemies.map((enemy) => {
        if (enemy.enemyId !== actingEnemy.enemyId) return enemy;
        const applied = applyIncomingDamageToStats({
          stats: enemy.stats,
          statuses: enemy.statuses,
          damage: totalRiposteDamage,
        });
        return {
          ...enemy,
          stats: applied.stats,
          statuses: applied.statuses,
          enemy: {
            ...enemy.enemy,
            hp: applied.stats.hp,
            statuses: applied.statuses,
          },
          isDead: applied.stats.hp <= 0,
        };
      });
      for (const hit of riposteHits)
        turnLogs.push(`⚔️ ${hit.playerName} riposte pour ${hit.damage}.`);
      triggerCombatPulse("enemyHit", actingEnemy.enemyId);
    }

    const firstHitTarget = plan.targetIds[0];
    if (typeof firstHitTarget === "number")
      triggerCombatPulse("allyHit", String(firstHitTarget));
    continueAfterAction(nextAllies, nextEnemies, turnLogs);
  };

  useEffect(() => {
    if (!activeEnemy || activeEnemy.isDead || outcome || saving) {
      if (!activeEnemy) processedEnemyTurnRef.current = null;
      return;
    }

    const turnKey = `${activeEnemy.enemyId}:${turnIndex}:${activeEnemy.stats.hp}`;
    if (processedEnemyTurnRef.current === turnKey) return;
    processedEnemyTurnRef.current = turnKey;

    const timer = setTimeout(() => {
      handleEnemyTurn();
    }, 650);

    return () => clearTimeout(timer);
  }, [
    activeEnemy?.enemyId,
    activeEnemy?.stats.hp,
    activeEnemy?.isDead,
    turnIndex,
    outcome,
    saving,
  ]);

  useEffect(() => {
    if (!combatFeedback) return;
    const timer = setTimeout(() => setCombatFeedback(null), 1200);
    return () => clearTimeout(timer);
  }, [combatFeedback]);

  useEffect(() => {
    setSelectedSkillId(null);
    setSelectedCombatItemId(null);
    setExpandedCombatPanel(null);
  }, [activeAlly?.playerId]);

  const allLevelUpChoicesPicked = true;

  const finishCombat = async () => {
    if (!outcome) return;

    if (finalizedRun && finalizedPostCombat) {
      if (rewardSummary?.levelUps.length && resultStep === "summary") {
        setResultStep("level_up");
        return;
      }

      onCombatFinished(finalizedRun, finalizedPostCombat);
      return;
    }

    setSaving(true);
    const finalized = finalizeMobileCombatRun({
      run: initialRun,
      nodeId: combat.nodeId,
      participantIndexes,
      allies,
      enemies,
      outcome,
    });

    setRewardSummary(finalized.rewards);
    setFinalizedRun(finalized.state);
    setFinalizedPostCombat(finalized.postCombat);
    await mobileRunSaveSystem.saveRun(finalized.state);
    setSaving(false);

    if (finalized.rewards.levelUps.length > 0) {
      setResultStep("level_up");
      return;
    }

    onCombatFinished(finalized.state, finalized.postCombat);
  };

  if (outcome) {
    const defeatedCount = enemies.filter(
      (enemy) => enemy.isDead || enemy.stats.hp <= 0,
    ).length;
    const survivingAllies = allies.filter(
      (ally) => !ally.isDead && ally.stats.hp > 0,
    );
    if (resultStep === "level_up" && rewardSummary?.levelUps.length) {
      return (
        <View style={styles.screen}>
          <ImageBackground
            source={backgroundSource}
            style={StyleSheet.absoluteFill}
            imageStyle={styles.screenBackgroundImage}
          />
          <ScrollView
            contentContainerStyle={styles.resultScreenContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.levelUpHeroCard}>
              <Text style={styles.resultKicker}>Progression</Text>
              <Text style={styles.resultTitle}>Niveau gagné</Text>
              <Text style={styles.resultDescription}>
                Les héros suivants ont évolué grâce à ce combat.
              </Text>
              <Text style={styles.masteryGainHint}>
                +1 point de maîtrise par niveau gagné.
              </Text>
            </View>

            {rewardSummary.levelUps.map((levelUp) => (
              <View
                key={`${levelUp.playerId}-${levelUp.level}`}
                style={styles.levelUpDetailCard}
              >
                <Text style={styles.levelUpBigTitle}>
                  ⬆️ {levelUp.playerName}
                </Text>
                <Text style={styles.levelUpClassLine}>
                  {getClassDisplayName(levelUp.classType)} · Niveau{" "}
                  {levelUp.level}
                </Text>
                <View style={styles.levelUpStatGrid}>
                  <Text style={styles.levelUpStat}>
                    +{levelUp.growth.hp} PV
                  </Text>
                  <Text style={styles.levelUpStat}>
                    +{levelUp.growth.mana} Mana
                  </Text>
                  <Text style={styles.levelUpStat}>
                    +{levelUp.growth.strength} Force
                  </Text>
                  <Text style={styles.levelUpStat}>
                    +{levelUp.growth.magic} Magie
                  </Text>
                  <Text style={styles.levelUpStat}>
                    +{levelUp.growth.defense} Défense
                  </Text>
                  <Text style={styles.levelUpStat}>
                    +{levelUp.growth.speed} Vitesse
                  </Text>
                </View>
                <View style={styles.levelChoiceBlock}>
                  <Text style={styles.rewardTitle}>Maîtrise gagnée</Text>
                  <Text style={styles.levelChoiceHint}>
                    +1 point de maîtrise a été ajouté. Ouvre Héros pour graver
                    un talent quand tu le souhaites.
                  </Text>
                </View>
                {finalizedRun &&
                finalizedPostCombat &&
                onOpenHeroAfterLevelUp ? (
                  <Pressable
                    onPress={() =>
                      onOpenHeroAfterLevelUp(finalizedRun, finalizedPostCombat)
                    }
                    style={styles.openHeroButton}
                  >
                    <Text style={styles.openHeroButtonText}>Ouvrir Héros</Text>
                  </Pressable>
                ) : null}
                {levelUp.newSkills.length > 0 ? (
                  <View style={styles.newSkillBox}>
                    <Text style={styles.rewardTitle}>Nouvelle compétence</Text>
                    {levelUp.newSkills.map((skill) => (
                      <Text key={skill.id} style={styles.rewardLine}>
                        {skill.icon} {skill.name} · Mana {skill.manaCost}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}

            <Pressable
              onPress={() => void finishCombat()}
              disabled={saving}
              style={[
                styles.primaryButtonWide,
                saving && styles.primaryButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Sauvegarde..." : "Continuer"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        <ImageBackground
          source={backgroundSource}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.screenBackgroundImage}
        />
        <ScrollView
          contentContainerStyle={styles.resultScreenContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultHeroCard}>
            <Text style={styles.resultKicker}>
              {outcome === "victory" ? "Combat terminé" : "Run en danger"}
            </Text>
            <Text style={styles.resultTitle}>
              {outcome === "victory" ? "Victoire" : "Défaite"}
            </Text>
            <Text style={styles.resultDescription}>
              {outcome === "victory"
                ? "Le lieu est sécurisé. Les conséquences du combat sont appliquées avant le retour à la carte."
                : "Tous les héros engagés sont tombés. La run bascule vers son écran de conclusion."}
            </Text>
          </View>

          {rewardSummary && outcome === "victory" ? (
            <View style={styles.rewardBox}>
              <Text style={styles.rewardTitle}>Récompenses et progression</Text>
              {rewardHighlights.length ? (
                <View style={styles.rewardHighlightRow}>
                  {rewardHighlights.map((highlight) => (
                    <Text key={highlight} style={styles.rewardHighlightChip}>
                      {highlight}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={styles.rewardLine}>
                +{rewardSummary.xpGained} XP et +{rewardSummary.goldGained} or
                pour les héros engagés.
              </Text>
              {rewardSummary.bundle?.items?.length ? (
                <Text style={styles.rewardLine}>
                  Butin :{" "}
                  {rewardSummary.bundle.items
                    .map((item) => item.name)
                    .join(", ")}
                </Text>
              ) : null}
              {rewardProgressionCards.length ? (
                <View style={styles.progressionPreviewGrid}>
                  {rewardProgressionCards.map((card) => (
                    <View
                      key={card.playerId}
                      style={styles.progressionPreviewCard}
                    >
                      <Text
                        numberOfLines={1}
                        style={styles.progressionPreviewTitle}
                      >
                        {card.name} · Niv. {card.level}
                      </Text>
                      <Text style={styles.progressionPreviewLine}>
                        {card.xpLabel}
                      </Text>
                      <Text style={styles.progressionPreviewLine}>
                        Maîtrise disponible : {card.masteryPoints}
                      </Text>
                      <Text style={styles.progressionTalentLine}>
                        {card.nextTalentLabel}
                      </Text>
                      <Text style={styles.progressionPreviewMuted}>
                        {card.nextTalentMeta}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {rewardSummary.levelUps.length > 0 ? (
                rewardSummary.levelUps.map((levelUp) => (
                  <View
                    key={`${levelUp.playerId}-${levelUp.level}`}
                    style={styles.levelUpBox}
                  >
                    <Text style={styles.levelUpTitle}>
                      ⬆️ {levelUp.playerName} atteint le niveau {levelUp.level}
                    </Text>
                    <Text style={styles.rewardLine}>
                      +{levelUp.growth.hp} PV · +{levelUp.growth.mana} Mana · +
                      {levelUp.growth.strength} Force · +{levelUp.growth.magic}{" "}
                      Magie · +{levelUp.growth.defense} Défense · +
                      {levelUp.growth.speed} Vitesse
                    </Text>
                    {levelUp.newSkills.length > 0 ? (
                      <Text style={styles.rewardLine}>
                        Nouvelle compétence :{" "}
                        {levelUp.newSkills
                          .map((skill) => `${skill.icon} ${skill.name}`)
                          .join(", ")}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.rewardMuted}>
                  Aucun niveau gagné sur ce combat.
                </Text>
              )}
            </View>
          ) : null}

          <Pressable
            onPress={() => void finishCombat()}
            disabled={saving}
            style={styles.primaryButtonWide}
          >
            <Text style={styles.primaryButtonText}>
              {saving
                ? "Sauvegarde..."
                : rewardSummary?.levelUps.length &&
                    resultStep === "summary" &&
                    finalizedRun
                  ? "Voir niveaux"
                  : outcome === "victory" && isBossCombat
                    ? "Continuer"
                    : "Retour à la carte"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={backgroundSource}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.screenBackgroundImage}
      />
      <View style={styles.combatContent}>
        <View style={styles.topCombatHud}>
          <View style={styles.topHudPill}>
            <Text style={styles.topHudPillLabel}>Tour</Text>
            <Text style={styles.topHudPillValue}>
              {String(actionTurnNumber).padStart(2, "0")}
            </Text>
          </View>
          <View style={styles.topCombatCenter}>
            <View style={styles.topCombatTitleRow}>
              <Text numberOfLines={1} style={styles.topCombatTitle}>
                {bossInfo ? bossInfo.name : combat.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.topCombatBadge,
                  activeEnemy && !activeAlly && styles.topCombatBadgeDanger,
                ]}
              >
                {activeAlly ? "Joueur" : activeEnemy ? "Ennemi" : "Combat"}
              </Text>
            </View>
            {bossInfo ? (
              <View style={styles.topBossLineRow}>
                <View style={styles.topBossHpTrack}>
                  <View
                    style={[
                      styles.topBossHpFill,
                      { width: `${bossInfo.hpPercent}%` },
                    ]}
                  />
                </View>
                <Text numberOfLines={1} style={styles.topBossMetaText}>
                  {bossInfo.hpPercent}%
                </Text>
              </View>
            ) : (
              <Text numberOfLines={1} style={styles.topEncounterSummaryText}>
                {aliveAllyCount} héros · {aliveEnemyCount} ennemi
                {aliveEnemyCount > 1 ? "s" : ""} ·{" "}
                {canUseSelectedEnemy && selectedEnemy
                  ? selectedEnemy.enemy.name
                  : activeAlly
                    ? activeAlly.player.name
                    : activeEnemy
                      ? activeEnemy.enemy.name
                      : "Combat"}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => setExpandedCombatPanel("journal")}
            style={styles.topHudIconButton}
          >
            <Text style={styles.topHudIconButtonText}>Journal</Text>
          </Pressable>
        </View>

        {combatFeedback ? (
          <View style={styles.combatFeedback}>
            <Text numberOfLines={1} style={styles.combatFeedbackText}>
              {combatFeedback}
            </Text>
          </View>
        ) : null}

        <View style={styles.battleArena}>
          <View style={styles.turnRail}>
            {visibleTurnOrder.map((entry, index) => {
              const ally =
                entry.kind === "player"
                  ? allies.find((item) => item.playerId === entry.entityId)
                  : null;
              const enemy =
                entry.kind === "enemy"
                  ? enemies.find((item) => item.enemyId === entry.entityId)
                  : null;
              const label = ally?.player.name ?? enemy?.enemy.name ?? "?";
              const dead = ally
                ? ally.isDead || ally.stats.hp <= 0
                : enemy
                  ? enemy.isDead || enemy.stats.hp <= 0
                  : false;
              return (
                <View
                  key={`${entry.kind}-${entry.entityId}-${index}`}
                  style={[
                    styles.turnRailItem,
                    index === 0 && styles.turnRailItemActive,
                    dead && styles.turnRailItemDead,
                  ]}
                >
                  <Text style={styles.turnRailItemIcon}>
                    {entry.kind === "player" ? "◆" : "◈"}
                  </Text>
                  <Text numberOfLines={1} style={styles.turnRailItemText}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.battleStageRedesign}>
            <View style={styles.enemyStageTopRow}>
              <Text style={styles.stageOverlayLabel}>Ennemis</Text>
              <Text style={styles.stageOverlayHint}>Touchez pour cibler</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.enemyRow}
            >
              {enemies.map((enemy) => (
                <AnimatedCombatSurface
                  key={enemy.enemyId}
                  onPress={() => {
                    if (!enemy.isDead && enemy.stats.hp > 0)
                      setSelectedEnemyId(enemy.enemyId);
                  }}
                  disabled={enemy.isDead || enemy.stats.hp <= 0}
                  pulseKind={
                    combatPulse?.targetId === enemy.enemyId
                      ? combatPulse.kind
                      : undefined
                  }
                  pulseNonce={
                    combatPulse?.targetId === enemy.enemyId
                      ? combatPulse.nonce
                      : 0
                  }
                  style={[
                    styles.enemyCard,
                    selectedEnemyId === enemy.enemyId && styles.selectedCard,
                    enemy.isDead && styles.deadCard,
                  ]}
                >
                  <View style={styles.enemyImageSlot}>
                    {getEnemyImageSource(enemy.enemy) ? (
                      <Image
                        source={getEnemyImageSource(enemy.enemy)!}
                        style={styles.enemyImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.enemyImageFallback}>☠</Text>
                    )}
                    <CombatLottieOverlay
                      kind={getEnemyPulseLottieKind(
                        enemy,
                        combatPulse?.targetId === enemy.enemyId
                          ? combatPulse.kind
                          : undefined,
                        isCorruptedCombat,
                      )}
                      nonce={
                        combatPulse?.targetId === enemy.enemyId
                          ? combatPulse.nonce
                          : 0
                      }
                    />
                    <View style={styles.enemyHpOverlay}>
                      <Text style={styles.enemyHpOverlayText}>
                        {enemy.stats.hp}/{enemy.stats.maxHp}
                      </Text>
                    </View>
                    {selectedEnemyId === enemy.enemyId && !enemy.isDead ? (
                      <View style={styles.enemyTargetOverlay}>
                        <Text style={styles.enemyTargetOverlayText}>Cible</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.enemyName}>{enemy.enemy.name}</Text>
                  {buildCorruptedAffixLabels(enemy.enemy).length > 0 ? (
                    <View style={styles.affixRow}>
                      {buildCorruptedAffixLabels(enemy.enemy).map((label) => (
                        <Text key={label} style={styles.affixChip}>
                          {label}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <StatMeter
                    label="Vie"
                    value={enemy.stats.hp}
                    max={enemy.stats.maxHp}
                    tone="hp"
                  />
                  <StatusChips
                    statuses={enemy.statuses}
                    compact
                    max={2}
                    hideEmpty
                  />
                  {enemy.isDead ? (
                    <Text style={styles.statusText}>Vaincu</Text>
                  ) : null}
                </AnimatedCombatSurface>
              ))}
            </ScrollView>

            <View style={styles.partyHudSection}>
              <View style={styles.partyStageOverlayHeader}>
                <Text style={styles.stageOverlayLabel}>Groupe</Text>
                <Text style={styles.stageOverlayHint}>
                  Touchez un allié pour le viser
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.partyHudStrip}
              >
                {allies.map((ally) => (
                  <AnimatedCombatSurface
                    key={ally.playerId}
                    onPress={() => {
                      if (!ally.isDead && ally.stats.hp > 0)
                        setSelectedAllyId(ally.playerId);
                    }}
                    disabled={ally.isDead || ally.stats.hp <= 0}
                    pulseKind={
                      combatPulse?.targetId === String(ally.playerId)
                        ? combatPulse.kind
                        : undefined
                    }
                    pulseNonce={
                      combatPulse?.targetId === String(ally.playerId)
                        ? combatPulse.nonce
                        : 0
                    }
                    style={[
                      styles.partyHudCard,
                      activeAlly?.playerId === ally.playerId &&
                        styles.partyHudCardActive,
                      selectedAllyId === ally.playerId &&
                        styles.partyHudCardSelected,
                      !activeAlly &&
                        focusedAlly?.playerId === ally.playerId &&
                        styles.partyHudCardTargeted,
                    ]}
                  >
                    <View style={styles.partyHudHeader}>
                      <View style={styles.partyHudPortraitFrame}>
                        <Image
                          source={getClassPortraitSource(ally.player.classType)}
                          style={styles.partyHudPortrait}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={styles.partyHudTextBlock}>
                        <View style={styles.partyHudTitleRow}>
                          <Text numberOfLines={1} style={styles.partyHudName}>
                            {ally.player.name}
                          </Text>
                          <Text style={styles.partyHudLevel}>
                            Niv. {ally.player.level}
                          </Text>
                        </View>
                        <Text numberOfLines={1} style={styles.partyHudClassLine}>
                          {getClassPresentation(ally.player.classType).short}
                        </Text>
                        <View style={styles.partyHudBarRow}>
                          <Text style={styles.partyHudBarLabel}>PV</Text>
                          <View style={styles.partyHudBarTrack}>
                            <View
                              style={[
                                styles.partyHudHpFill,
                                {
                                  width: `${Math.max(0, Math.min(100, Math.round((ally.stats.hp / Math.max(1, ally.stats.maxHp)) * 100)))}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.partyHudBarValue}>{ally.stats.hp}</Text>
                        </View>
                        <View style={styles.partyHudBarRow}>
                          <Text style={styles.partyHudBarLabel}>PM</Text>
                          <View style={styles.partyHudBarTrack}>
                            <View
                              style={[
                                styles.partyHudManaFill,
                                {
                                  width: `${Math.max(0, Math.min(100, Math.round((ally.stats.mana / Math.max(1, ally.stats.maxMana)) * 100)))}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.partyHudBarValue}>{ally.stats.mana}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.partyHudFooterRow}>
                      <Text style={styles.partyHudStateText}>
                        {ally.isDead || ally.stats.hp <= 0
                          ? "Tombé"
                          : activeAlly?.playerId === ally.playerId
                            ? "Actif"
                            : selectedAllyId === ally.playerId
                              ? "Ciblé"
                              : ally.defending
                                ? "Garde"
                                : "Prêt"}
                      </Text>
                      <Text style={styles.partyHudMomentumText}>
                        {armedMomentumByPlayerId[ally.playerId]
                          ? "Élan actif"
                          : `Élan ${momentumByPlayerId[ally.playerId] ?? 0}/${MOMENTUM_MAX}`}
                      </Text>
                    </View>
                    {ally.statuses.length > 0 ? (
                      <StatusChips
                        statuses={ally.statuses}
                        compact
                        max={2}
                        hideEmpty
                      />
                    ) : null}
                    <CombatLottieOverlay
                      compact
                      kind={getAllyPulseLottieKind(
                        combatPulse?.targetId === String(ally.playerId)
                          ? combatPulse.kind
                          : undefined,
                      )}
                      nonce={
                        combatPulse?.targetId === String(ally.playerId)
                          ? combatPulse.nonce
                          : 0
                      }
                    />
                  </AnimatedCombatSurface>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
        {outcome ? (
          <View style={styles.actionPanel}>
            <Text style={styles.resultText}>
              {outcome === "victory"
                ? "Le lieu est sécurisé."
                : "Tous les héros engagés sont tombés."}
            </Text>
            {rewardSummary && outcome === "victory" ? (
              <View style={styles.rewardBox}>
                <Text style={styles.rewardTitle}>Récompenses</Text>
                {rewardHighlights.length ? (
                  <View style={styles.rewardHighlightRow}>
                    {rewardHighlights.map((highlight) => (
                      <Text key={highlight} style={styles.rewardHighlightChip}>
                        {highlight}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.rewardLine}>
                  +{rewardSummary.xpGained} XP et +{rewardSummary.goldGained} or
                  pour les héros engagés
                </Text>
                {rewardSummary.bundle?.items?.length ? (
                  <Text style={styles.rewardLine}>
                    Butin :{" "}
                    {rewardSummary.bundle.items
                      .map((item) => item.name)
                      .join(", ")}
                  </Text>
                ) : null}
                {rewardProgressionCards.length ? (
                  <View style={styles.progressionPreviewGrid}>
                    {rewardProgressionCards.map((card) => (
                      <View
                        key={card.playerId}
                        style={styles.progressionPreviewCard}
                      >
                        <Text
                          numberOfLines={1}
                          style={styles.progressionPreviewTitle}
                        >
                          {card.name} · Niv. {card.level}
                        </Text>
                        <Text style={styles.progressionPreviewLine}>
                          {card.xpLabel}
                        </Text>
                        <Text style={styles.progressionPreviewLine}>
                          Maîtrise disponible : {card.masteryPoints}
                        </Text>
                        <Text style={styles.progressionTalentLine}>
                          {card.nextTalentLabel}
                        </Text>
                        <Text style={styles.progressionPreviewMuted}>
                          {card.nextTalentMeta}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {rewardSummary.levelUps.length > 0 ? (
                  rewardSummary.levelUps.map((levelUp) => (
                    <View
                      key={`${levelUp.playerId}-${levelUp.level}`}
                      style={styles.levelUpBox}
                    >
                      <Text style={styles.levelUpTitle}>
                        ⬆️ {levelUp.playerName} passe niveau {levelUp.level}
                      </Text>
                      <Text style={styles.rewardLine}>
                        +{levelUp.growth.hp} PV · +{levelUp.growth.mana} Mana ·
                        +{levelUp.growth.strength} Force · +
                        {levelUp.growth.magic} Magie · +{levelUp.growth.defense}{" "}
                        Défense · +{levelUp.growth.speed} Vitesse
                      </Text>
                      {levelUp.newSkills.length > 0 ? (
                        <Text style={styles.rewardLine}>
                          Nouvelle compétence :{" "}
                          {levelUp.newSkills
                            .map((skill) => `${skill.icon} ${skill.name}`)
                            .join(", ")}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.rewardMuted}>Aucun niveau gagné.</Text>
                )}
              </View>
            ) : null}
            <Pressable
              onPress={() => void finishCombat()}
              disabled={saving}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {saving
                  ? "Sauvegarde..."
                  : rewardSummary?.levelUps.length &&
                      resultStep === "summary" &&
                      finalizedRun
                    ? "Voir niveaux"
                    : outcome === "victory" && isBossCombat
                      ? "Continuer"
                      : "Retour à la carte"}
              </Text>
            </Pressable>
          </View>
        ) : activeAlly ? (
          <View style={styles.actionPanel}>
            {!canControlActiveHero && activeActionLockMessage ? (
              <View style={styles.turnLockBanner}>
                <Text style={styles.turnLockText}>
                  🔒 {activeActionLockMessage}
                </Text>
              </View>
            ) : null}
            <View style={styles.combatOverlayHud}>
              <View style={styles.targetCommandCard}>
                <Text style={styles.targetCommandKicker}>
                  {canUseSelectedEnemy && selectedEnemy
                    ? "Cible ennemie"
                    : canUseSelectedAlly && selectedAlly
                      ? "Allié ciblé"
                      : "Cible"}
                </Text>
                <Text numberOfLines={1} style={styles.targetCommandName}>
                  {canUseSelectedEnemy && selectedEnemy
                    ? selectedEnemy.enemy.name
                    : canUseSelectedAlly && selectedAlly
                      ? selectedAlly.player.name
                      : "Touchez une cible"}
                </Text>
                <Text numberOfLines={2} style={styles.targetCommandMeta}>
                  {canUseSelectedEnemy && selectedEnemy
                    ? `PV ${selectedEnemy.stats.hp}/${selectedEnemy.stats.maxHp} · DEF ${selectedEnemy.stats.defense} · VIT ${selectedEnemy.stats.speed}`
                    : canUseSelectedAlly && selectedAlly
                      ? `PV ${selectedAlly.stats.hp}/${selectedAlly.stats.maxHp} · PM ${selectedAlly.stats.mana}/${selectedAlly.stats.maxMana}`
                      : "Choisissez un ennemi pour attaquer ou un allié pour les objets de soin."}
                </Text>
                <View style={styles.targetCommandActionRow}>
                  <Pressable
                    onPress={selectNextLivingEnemy}
                    disabled={aliveEnemyCount <= 1}
                    style={[
                      styles.changeTargetButton,
                      aliveEnemyCount <= 1 && styles.skillButtonDisabled,
                    ]}
                  >
                    <Text style={styles.changeTargetText}>Cible</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedAllyId(activeAlly.playerId)}
                    style={styles.changeTargetButton}
                  >
                    <Text style={styles.changeTargetText}>Moi</Text>
                  </Pressable>
                </View>
                <Text numberOfLines={1} style={styles.targetCommandLog}>
                  {logs[0] ?? describeClassMechanic(activeAlly, classFlow)}
                </Text>
              </View>

              <View style={styles.commandHudStack}>
                <View style={styles.commandDiamondGrid}>
                  <Pressable
                    onPress={() => setExpandedCombatPanel("skills")}
                    disabled={!canControlActiveHero}
                    style={[
                      styles.commandDiamond,
                      styles.commandDiamondTop,
                      !canControlActiveHero && styles.skillButtonDisabled,
                    ]}
                  >
                    <Text style={styles.commandDiamondIcon}>✦</Text>
                    <Text style={styles.commandDiamondLabel}>Comp.</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDefend}
                    disabled={!canControlActiveHero}
                    style={[
                      styles.commandDiamond,
                      styles.commandDiamondLeft,
                      !canControlActiveHero && styles.skillButtonDisabled,
                    ]}
                  >
                    <Text style={styles.commandDiamondIcon}>▰</Text>
                    <Text style={styles.commandDiamondLabel}>Déf.</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleBasicAttack}
                    disabled={!canUseSelectedEnemy || !canControlActiveHero}
                    style={[
                      styles.commandDiamond,
                      styles.commandDiamondCenter,
                      (!canUseSelectedEnemy || !canControlActiveHero) &&
                        styles.skillButtonDisabled,
                    ]}
                  >
                    <Text style={styles.commandDiamondIcon}>⚔</Text>
                    <Text style={styles.commandDiamondLabel}>
                      {activeMomentumRepeat ? "Att. x2" : "Attaque"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setExpandedCombatPanel("items")}
                    disabled={!canControlActiveHero}
                    style={[
                      styles.commandDiamond,
                      styles.commandDiamondRight,
                      !canControlActiveHero && styles.skillButtonDisabled,
                    ]}
                  >
                    <Text style={styles.commandDiamondIcon}>◉</Text>
                    <Text style={styles.commandDiamondLabel}>Objet</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleWait}
                    disabled={!canControlActiveHero}
                    style={[
                      styles.commandDiamond,
                      styles.commandDiamondBottom,
                      !canControlActiveHero && styles.skillButtonDisabled,
                    ]}
                  >
                    <Text style={styles.commandDiamondIcon}>⌛</Text>
                    <Text style={styles.commandDiamondLabel}>Att.</Text>
                  </Pressable>
                </View>
                <View style={styles.commandSupportRow}>
                  <Pressable
                    onPress={() =>
                      activeAlly ? armMomentum(activeAlly.playerId) : undefined
                    }
                    disabled={activeMomentum <= 0 || !canControlActiveHero}
                    style={[
                      styles.commandSupportButton,
                      activeMomentumArmed && styles.commandSupportButtonActive,
                      (activeMomentum <= 0 || !canControlActiveHero) && styles.skillButtonDisabled,
                    ]}
                  >
                    <Text style={styles.commandSupportButtonText}>
                      {activeMomentumArmed ? "Élan actif" : "Élan"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setExpandedCombatPanel("journal")}
                    style={styles.commandSupportButton}
                  >
                    <Text style={styles.commandSupportButtonText}>Journal</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.actionPanel, styles.enemyActionOverlay]}>
            <Text style={styles.resultText}>
              {activeEnemy
                ? `${activeEnemy.enemy.name} agit...`
                : "Le combat continue..."}
            </Text>
            {focusedAlly ? (
              <Text numberOfLines={1} style={styles.enemyActionMeta}>
                Cible probable · {focusedAlly.player.name} · PV {focusedAlly.stats.hp}/{focusedAlly.stats.maxHp}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <Modal
        visible={expandedCombatPanel === "skills"}
        transparent
        animationType="slide"
        onRequestClose={() => setExpandedCombatPanel(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setExpandedCombatPanel(null)}
        >
          <Pressable
            style={styles.combatSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>Compétences</Text>
              </View>
              <Pressable
                onPress={() => setExpandedCombatPanel(null)}
                style={styles.sheetCloseButton}
              >
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>
            {activeAlly ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.skillRow}
                >
                  {activeSkills.map((skill) => (
                    <Pressable
                      key={skill.id}
                      onPress={() => setSelectedSkillId(skill.id)}
                      disabled={
                        !canControlActiveHero ||
                        activeAlly.stats.mana <
                          getCombatSkillManaCost(activeAlly, skill) ||
                        !canUseSelectedEnemy
                      }
                      style={[
                        styles.skillButton,
                        selectedSkillId === skill.id &&
                          styles.skillButtonSelected,
                        (activeAlly.stats.mana <
                          getCombatSkillManaCost(activeAlly, skill) ||
                          !canUseSelectedEnemy) &&
                          styles.skillButtonDisabled,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                        style={styles.skillName}
                      >
                        {skill.icon} {skill.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                        style={styles.skillMeta}
                      >
                        Mana {getCombatSkillManaCost(activeAlly, skill)} ·{" "}
                        {getSkillRole(skill)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {selectedSkill ? (
                  <View style={styles.skillDetailPanel}>
                    <View style={styles.skillDetailHeader}>
                      <Text style={styles.skillDetailTitle}>
                        {selectedSkill.icon} {selectedSkill.name}
                      </Text>
                      <Text style={styles.skillDetailPill}>
                        {getSkillRole(selectedSkill)}
                      </Text>
                    </View>
                    <Text style={styles.skillDetailText}>
                      {selectedSkill.description}
                    </Text>
                    <Text style={styles.skillDetailMeta}>
                      Coût : {getCombatSkillManaCost(activeAlly, selectedSkill)}{" "}
                      mana · Dégâts estimés :{" "}
                      {canUseSelectedEnemy
                        ? estimateSkillDamage(
                            selectedSkill,
                            activeAlly,
                            selectedEnemy,
                          )
                        : 0}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setExpandedCombatPanel(null);
                        handleUseSkill(selectedSkill);
                      }}
                      disabled={
                        !canUseSelectedEnemy ||
                        !canControlActiveHero ||
                        activeAlly.stats.mana <
                          getCombatSkillManaCost(activeAlly, selectedSkill)
                      }
                      style={[
                        styles.primaryButtonWide,
                        (!canUseSelectedEnemy ||
                          activeAlly.stats.mana <
                            getCombatSkillManaCost(
                              activeAlly,
                              selectedSkill,
                            )) &&
                          styles.skillButtonDisabled,
                      ]}
                    >
                      <Text style={styles.primaryButtonText}>
                        Utiliser cette compétence
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.rewardMuted}>Aucun héros actif.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={expandedCombatPanel === "items"}
        transparent
        animationType="slide"
        onRequestClose={() => setExpandedCombatPanel(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setExpandedCombatPanel(null)}
        >
          <Pressable
            style={styles.combatSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetKicker}>Sac</Text>
                <Text style={styles.sheetTitle}>Objets</Text>
              </View>
              <Pressable
                onPress={() => setExpandedCombatPanel(null)}
                style={styles.sheetCloseButton}
              >
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>
            {activeCombatItems.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.skillRow}
              >
                {activeCombatItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setSelectedCombatItemId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    style={[
                      styles.skillButton,
                      selectedCombatItemId === item.id &&
                        styles.skillButtonSelected,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                      style={styles.skillName}
                    >
                      🎒 {item.name}
                      {item.quantity > 1 ? ` x${item.quantity}` : ""}
                    </Text>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      style={styles.skillMeta}
                    >
                      {getCombatItemSummary(item)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.rewardMuted}>
                Aucun consommable de combat.
              </Text>
            )}
            {selectedCombatItem ? (
              <View style={styles.skillDetailPanel}>
                <Text style={styles.skillDetailTitle}>
                  🎒 {selectedCombatItem.name}
                </Text>
                <Text style={styles.skillDetailText}>
                  {selectedCombatItem.description}
                </Text>
                <Text style={styles.skillDetailMeta}>
                  {getCombatItemSummary(selectedCombatItem)}
                </Text>
                <Pressable
                  onPress={() => {
                    setExpandedCombatPanel(null);
                    handleUseCombatItem(selectedCombatItem);
                  }}
                  disabled={
                    !canControlActiveHero ||
                    (combatItemNeedsEnemy(selectedCombatItem) &&
                      !canUseSelectedEnemy)
                  }
                  style={[
                    styles.primaryButtonWide,
                    (!canControlActiveHero ||
                      (combatItemNeedsEnemy(selectedCombatItem) &&
                        !canUseSelectedEnemy)) &&
                      styles.skillButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Utiliser l’objet</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={expandedCombatPanel === "journal"}
        transparent
        animationType="slide"
        onRequestClose={() => setExpandedCombatPanel(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setExpandedCombatPanel(null)}
        >
          <Pressable
            style={styles.combatSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetKicker}>Combat</Text>
                <Text style={styles.sheetTitle}>Journal</Text>
              </View>
              <Pressable
                onPress={() => setExpandedCombatPanel(null)}
                style={styles.sheetCloseButton}
              >
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.journalSheetList}
              showsVerticalScrollIndicator={false}
            >
              {logs.map((log, index) => (
                <Text key={`${log}-${index}`} style={styles.sheetLogLine}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  combatContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
    minHeight: 0,
  },
  topCombatHud: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  topHudPillColumn: {
    width: 58,
    gap: 5,
  },
  topHudPill: {
    width: 56,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(7,10,20,0.88)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.28)",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  topHudPillLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    includeFontPadding: false,
  },
  topHudPillValue: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: "900",
    includeFontPadding: false,
  },
  topHudPillValueSmall: {
    color: "#bfdbfe",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  topHudPillValueDanger: {
    color: "#fecaca",
  },
  topCombatCenter: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(7,10,20,0.88)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.24)",
    justifyContent: "center",
    gap: 6,
  },
  topCombatTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topCombatTitle: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  topCombatBadge: {
    color: "#1f1300",
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    includeFontPadding: false,
  },
  topBossHpTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  topBossHpFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
  topBossLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topCombatBadgeDanger: {
    color: "#fecaca",
    backgroundColor: "rgba(127,29,29,0.34)",
  },
  topBossMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  topBossMetaText: {
    color: "#fde68a",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  topEncounterSummary: {
    gap: 2,
  },
  topEncounterSummaryText: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  topEncounterSummaryMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  topHudSideButtons: {
    width: 78,
    gap: 5,
  },
  topHudIconButton: {
    width: 76,
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(7,10,20,0.88)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  topHudIconButtonText: {
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
  },
  topHudFeedbackPill: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.22)",
    justifyContent: "center",
  },
  topHudFeedbackText: {
    color: "#dbeafe",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  resultScreenContent: {
    padding: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.xl * 2,
    gap: mobileTheme.spacing.md,
  },
  screenBackgroundImage: {
    opacity: 0.11,
  },
  lottieOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  lottieOverlayCompact: {
    zIndex: 2,
  },
  lottieEffect: {
    width: "118%",
    height: "118%",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  combatQuickStatus: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(10, 12, 24, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  combatQuickStatusText: {
    flex: 1,
    color: mobileTheme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    includeFontPadding: false,
  },
  combatQuickStatusDanger: {
    color: "#fecaca",
  },
  combatQuickStatusMeta: {
    flex: 1,
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textAlign: "right",
    includeFontPadding: false,
  },
  headerCompactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  backButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerSubtext: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: "700",
  },
  headerStatusStack: {
    alignItems: "flex-end",
    gap: 6,
    maxWidth: 150,
  },
  kicker: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  headerShell: {
    padding: 9,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(10, 12, 24, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  hudSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: -2,
  },
  hudSectionLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hudSectionHint: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  turnPanel: {
    marginTop: 6,
    padding: 8,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  turnTitle: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  turnMeta: {
    color: mobileTheme.colors.muted,
    marginTop: 3,
    fontSize: 11,
  },
  tempoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  tempoChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: mobileTheme.colors.muted,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    includeFontPadding: false,
  },
  tempoChipActive: {
    color: mobileTheme.colors.text,
    backgroundColor: "rgba(246,196,83,0.16)",
    borderColor: "rgba(246,196,83,0.42)",
  },
  tempoChipDanger: {
    color: "#fecaca",
    backgroundColor: "rgba(127,29,29,0.24)",
    borderColor: "rgba(248,113,113,0.36)",
  },
  turnOrderStrip: {
    gap: 6,
    paddingRight: mobileTheme.spacing.md,
    paddingBottom: 2,
  },
  turnChip: {
    minWidth: 72,
    maxWidth: 108,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  turnChipActive: {
    backgroundColor: "rgba(246,196,83,0.16)",
    borderColor: "rgba(246,196,83,0.52)",
  },
  turnChipDead: {
    opacity: 0.35,
  },
  turnChipIcon: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
  },
  turnChipText: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  combatFeedback: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(246,196,83,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.24)",
  },
  combatFeedbackText: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  bossPanel: {
    backgroundColor: "rgba(127, 29, 29, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.md,
    gap: 8,
  },
  bossPanelCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(127, 29, 29, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.34)",
    gap: 6,
  },
  bossCompactTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bossCompactTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  bossDescriptionCompact: {
    color: "#fed7aa",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  bossHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.md,
  },
  bossKicker: {
    color: "#fecaca",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  bossTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  bossPhasePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(248, 113, 113, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.45)",
  },
  bossPhaseText: {
    color: "#fecaca",
    fontWeight: "900",
    fontSize: 12,
  },
  bossDescription: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
  },
  bossHpBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  bossHpFill: {
    height: "100%",
    backgroundColor: "#ef4444",
  },
  bossBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bossBadge: {
    color: "#fecaca",
    backgroundColor: "rgba(127, 29, 29, 0.55)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  bossWarning: {
    color: "#fed7aa",
    fontSize: 12,
    lineHeight: 18,
  },
  intentStrip: {
    gap: 8,
    paddingRight: mobileTheme.spacing.md,
  },
  intentMiniCard: {
    width: 148,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    gap: 2,
  },
  intentRowAttack: {
    backgroundColor: "rgba(15, 23, 42, 0.46)",
    borderColor: "rgba(148, 163, 184, 0.22)",
  },
  intentRowMagic: {
    backgroundColor: "rgba(59, 7, 100, 0.18)",
    borderColor: "rgba(192, 132, 252, 0.28)",
  },
  intentRowSupport: {
    backgroundColor: "rgba(20, 83, 45, 0.16)",
    borderColor: "rgba(74, 222, 128, 0.24)",
  },
  intentRowDanger: {
    backgroundColor: "rgba(127, 29, 29, 0.22)",
    borderColor: "rgba(248, 113, 113, 0.35)",
  },
  intentToneAttack: {
    color: mobileTheme.colors.text,
    backgroundColor: "rgba(148,163,184,0.14)",
  },
  intentToneMagic: {
    color: "#e9d5ff",
    backgroundColor: "rgba(147,51,234,0.24)",
  },
  intentToneSupport: {
    color: "#bbf7d0",
    backgroundColor: "rgba(22,101,52,0.28)",
  },
  intentToneDanger: {
    color: "#fecaca",
    backgroundColor: "rgba(127,29,29,0.38)",
  },
  intentMiniTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  intentMiniAction: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  intentMiniText: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
  },
  enemyRow: {
    gap: 10,
    paddingRight: mobileTheme.spacing.lg,
    alignItems: "center",
    paddingBottom: 4,
    minHeight: 228,
  },
  affixRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  affixChip: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: "#fecaca",
    backgroundColor: "rgba(127,29,29,0.24)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.34)",
    fontSize: 10,
    fontWeight: "900",
  },
  affixDetailBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(127,29,29,0.18)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.26)",
    gap: 4,
  },
  affixDetailTitle: {
    color: "#fecaca",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  affixDetailText: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  enemyCard: {
    width: 160,
    minHeight: 212,
    padding: 9,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(14,18,32,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    position: "relative",
    overflow: "hidden",
  },
  selectedCard: {
    borderColor: "rgba(246,196,83,0.72)",
    backgroundColor: "rgba(246,196,83,0.12)",
    shadowColor: mobileTheme.colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  deadCard: {
    opacity: 0.45,
  },
  enemyImageSlot: {
    position: "relative",
    height: 108,
    borderRadius: mobileTheme.radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 8,
  },
  enemyImage: {
    width: "100%",
    height: "100%",
  },
  enemyHpOverlay: {
    position: "absolute",
    left: 6,
    bottom: 6,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "rgba(7,10,20,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  enemyHpOverlayText: {
    color: "#fecaca",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    includeFontPadding: false,
  },
  enemyTargetOverlay: {
    position: "absolute",
    right: 6,
    top: 6,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "rgba(246,196,83,0.92)",
  },
  enemyTargetOverlayText: {
    color: "#1f1300",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    includeFontPadding: false,
  },
  enemyImageFallback: {
    color: mobileTheme.colors.muted,
    fontSize: 34,
    fontWeight: "900",
  },
  enemyName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 13,
    lineHeight: 16,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowRadius: 4,
  },
  enemyHp: {
    color: "#fecaca",
    marginTop: 8,
    fontWeight: "800",
  },
  targetRibbon: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(8, 12, 24, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.22)",
    gap: 3,
  },
  targetRibbonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  targetRibbonTitle: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 13,
  },
  targetRibbonMeta: {
    color: "#93c5fd",
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
  },
  targetRibbonStats: {
    color: mobileTheme.colors.muted,
    lineHeight: 16,
    fontSize: 11,
  },
  targetRibbonWarning: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(127,29,29,0.16)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.26)",
  },
  targetRibbonWarningText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  statusText: {
    color: mobileTheme.colors.muted,
    marginTop: 8,
    fontSize: 12,
  },
  battleArena: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
    marginBottom: 164,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(7,10,20,0.60)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.16)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    position: "relative",
  },
  stageLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  stageLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  stageHint: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  stageDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 2,
  },
  battleStage: {
    flex: 1,
    gap: 6,
    justifyContent: "space-between",
  },
  partyPanel: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
    minHeight: 92,
    paddingRight: mobileTheme.spacing.md,
  },
  turnRail: {
    display: "none",
  },
  turnRailItem: {
    minHeight: 54,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(7,10,20,0.88)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.20)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  turnRailItemActive: {
    borderColor: "rgba(246,196,83,0.72)",
    backgroundColor: "rgba(246,196,83,0.12)",
  },
  turnRailItemDead: {
    opacity: 0.38,
  },
  turnRailItemIcon: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
    includeFontPadding: false,
  },
  turnRailItemText: {
    color: mobileTheme.colors.text,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  battleStageRedesign: {
    flex: 1,
    minHeight: 0,
    gap: 6,
    justifyContent: "space-between",
  },
  enemyStageTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 4,
  },
  stageOverlayLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  stageOverlayHint: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  partyHudSection: {
    gap: 6,
    marginTop: 2,
  },
  partyStageOverlayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  partyHudStrip: {
    gap: 8,
    paddingRight: mobileTheme.spacing.lg,
  },
  partyHudCard: {
    width: 158,
    minHeight: 100,
    padding: 7,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(7,10,20,0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 6,
    overflow: "hidden",
  },
  partyHudCardActive: {
    borderColor: "rgba(246,196,83,0.72)",
    backgroundColor: "rgba(246,196,83,0.12)",
  },
  partyHudCardSelected: {
    borderColor: "rgba(147,197,253,0.78)",
    backgroundColor: "rgba(59,130,246,0.14)",
  },
  partyHudCardTargeted: {
    borderColor: "rgba(248,113,113,0.64)",
    backgroundColor: "rgba(127,29,29,0.20)",
  },
  partyHudHeader: {
    flexDirection: "row",
    gap: 7,
    alignItems: "flex-start",
  },
  partyHudPortraitFrame: {
    width: 44,
    height: 44,
    borderRadius: mobileTheme.radius.md,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  partyHudPortrait: {
    width: "100%",
    height: "100%",
  },
  partyHudPortraitBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
  },
  partyHudTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  partyHudTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  partyHudName: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
  },
  partyHudLevel: {
    color: mobileTheme.colors.accent,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
  },
  partyHudClassLine: {
    color: mobileTheme.colors.muted,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
  },
  partyHudBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partyHudBarLabel: {
    width: 18,
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
  },
  partyHudBarTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  partyHudHpFill: {
    height: "100%",
    backgroundColor: "#84cc16",
  },
  partyHudManaFill: {
    height: "100%",
    backgroundColor: "#38bdf8",
  },
  partyHudBarValue: {
    minWidth: 28,
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  partyHudFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  partyHudStateText: {
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
  },
  partyHudMomentumText: {
    color: "#bfdbfe",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
  },
  allyRow: {
    width: 168,
    minWidth: 168,
    position: "relative",
    overflow: "hidden",
    padding: 6,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  activeAllyRow: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.accent,
  },
  targetedAllyRow: {
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.62)",
    backgroundColor: "rgba(127,29,29,0.18)",
  },
  selectedAllyRow: {
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.75)",
    backgroundColor: "rgba(59,130,246,0.14)",
  },
  allyTargetRibbon: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.30)",
    gap: 3,
  },
  allyName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 14,
  },
  allyMeta: {
    color: mobileTheme.colors.muted,
    marginTop: 3,
  },

  allyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  allyIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  allyPortraitFrame: {
    width: 36,
    height: 36,
    borderRadius: mobileTheme.radius.md,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  allyPortrait: {
    width: "100%",
    height: "100%",
  },
  allyPortraitBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
  },
  allyNameBlock: {
    flex: 1,
  },
  allyClassLine: {
    color: mobileTheme.colors.muted,
    fontSize: 9,
    marginTop: 2,
    fontWeight: "800",
  },
  allyStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    includeFontPadding: false,
  },
  allyStateAlive: {
    color: "#bbf7d0",
    backgroundColor: "rgba(34,197,94,0.16)",
  },
  allyStateDead: {
    color: "#fecaca",
    backgroundColor: "rgba(239,68,68,0.18)",
  },
  allyPillStack: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: 72,
  },
  momentumMiniPill: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    color: mobileTheme.colors.muted,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    includeFontPadding: false,
  },
  momentumMiniPillReady: {
    color: mobileTheme.colors.accent,
    backgroundColor: "rgba(246,196,83,0.14)",
    borderColor: "rgba(246,196,83,0.36)",
  },
  classMiniPill: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    color: "#bfdbfe",
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.28)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    includeFontPadding: false,
  },
  classToneWarrior: {
    color: "#fecaca",
    backgroundColor: "rgba(185,28,28,0.16)",
    borderColor: "rgba(248,113,113,0.32)",
  },
  classToneMage: {
    color: "#e9d5ff",
    backgroundColor: "rgba(126,34,206,0.16)",
    borderColor: "rgba(192,132,252,0.32)",
  },
  classToneArcher: {
    color: "#bbf7d0",
    backgroundColor: "rgba(22,101,52,0.16)",
    borderColor: "rgba(74,222,128,0.28)",
  },
  classToneRogue: {
    color: "#fed7aa",
    backgroundColor: "rgba(154,52,18,0.16)",
    borderColor: "rgba(251,146,60,0.30)",
  },
  classToneWarlock: {
    color: "#fbcfe8",
    backgroundColor: "rgba(157,23,77,0.16)",
    borderColor: "rgba(244,114,182,0.30)",
  },
  classToneCleric: {
    color: "#fde68a",
    backgroundColor: "rgba(180,83,9,0.16)",
    borderColor: "rgba(251,191,36,0.32)",
  },
  classToneSentinel: {
    color: "#a5f3fc",
    backgroundColor: "rgba(14,116,144,0.16)",
    borderColor: "rgba(103,232,249,0.32)",
  },
  allyMeters: {
    gap: 4,
    marginTop: 6,
  },
  statMeter: {
    gap: 4,
  },
  statMeterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statMeterLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statMeterValue: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  statMeterTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  statMeterFill: {
    height: "100%",
    borderRadius: 999,
  },
  hpText: {
    color: "#fb7185",
  },
  manaText: {
    color: "#93c5fd",
  },
  hpFill: {
    backgroundColor: "#e11d48",
  },
  manaFill: {
    backgroundColor: "#2563eb",
  },
  statusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  statusChipRowCompact: {
    gap: 4,
    marginTop: 5,
  },
  statusChip: {
    borderRadius: 999,
    backgroundColor: "rgba(159,122,234,0.16)",
    borderWidth: 1,
    borderColor: "rgba(159,122,234,0.28)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  statusChipText: {
    color: "#ddd6fe",
    fontSize: 11,
    fontWeight: "800",
  },
  statusChipTextCompact: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    includeFontPadding: false,
  },
  noStatusText: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },

  allyCompactFooter: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  allyBarStack: {
    flex: 1,
    gap: 4,
  },
  allyBarLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  allyBarLabel: {
    width: 22,
    color: mobileTheme.colors.muted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
  },
  allyBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  allyHpFillMini: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#e11d48",
  },
  allyManaFillMini: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
  allyBarValue: {
    width: 24,
    textAlign: "right",
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
  },
  allyResourceText: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  allyGuardText: {
    color: "#bae6fd",
    fontSize: 10,
    fontWeight: "900",
  },
  allyStatusPreview: {
    marginTop: 2,
  },
  allyStatusLine: {
    gap: 6,
  },
  defenseActiveChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(103,232,249,0.13)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.35)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  defenseActiveChipText: {
    color: "#bae6fd",
    fontSize: 11,
    fontWeight: "900",
  },

  levelUpHeroCard: {
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(50, 28, 90, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(159,122,234,0.42)",
    gap: 8,
  },
  levelUpDetailCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(10, 12, 24, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.26)",
    gap: 10,
  },
  levelUpBigTitle: {
    color: mobileTheme.colors.accent,
    fontSize: 22,
    fontWeight: "900",
  },
  levelUpClassLine: {
    color: mobileTheme.colors.muted,
    fontWeight: "800",
  },
  levelUpStatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  levelUpStat: {
    color: mobileTheme.colors.text,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
    fontWeight: "800",
    fontSize: 12,
  },
  levelChoiceBlock: {
    gap: 8,
    paddingTop: 2,
  },
  levelChoiceHint: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  levelChoiceGrid: {
    gap: 8,
  },
  levelChoiceButton: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  levelChoiceButtonPicked: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: "rgba(246,196,83,0.18)",
  },
  levelChoiceButtonLocked: {
    opacity: 0.42,
  },
  levelChoiceToneSurvive: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.30)",
  },
  levelChoiceToneDamage: {
    backgroundColor: "rgba(248,113,113,0.10)",
    borderColor: "rgba(248,113,113,0.30)",
  },
  levelChoiceToneMagic: {
    backgroundColor: "rgba(129,140,248,0.12)",
    borderColor: "rgba(129,140,248,0.34)",
  },
  levelChoiceToneTempo: {
    backgroundColor: "rgba(45,212,191,0.10)",
    borderColor: "rgba(45,212,191,0.30)",
  },
  levelChoiceToneCleanse: {
    backgroundColor: "rgba(250,204,21,0.10)",
    borderColor: "rgba(250,204,21,0.30)",
  },
  levelChoiceToneRisk: {
    backgroundColor: "rgba(168,85,247,0.12)",
    borderColor: "rgba(168,85,247,0.34)",
  },
  levelChoiceTitle: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    includeFontPadding: false,
  },
  levelChoiceMods: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    includeFontPadding: false,
  },
  masteryGainHint: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },
  openHeroButton: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(246,196,83,0.18)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.36)",
  },
  openHeroButtonText: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
  },
  levelChoiceDescription: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  newSkillBox: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(159,122,234,0.12)",
    borderWidth: 1,
    borderColor: "rgba(159,122,234,0.24)",
    gap: 5,
  },
  actionPanel: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 12,
    zIndex: 20,
    elevation: 20,
    padding: 0,
    backgroundColor: "transparent",
    gap: 6,
  },
  enemyActionOverlay: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(10, 12, 24, 0.90)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.24)",
  },
  enemyActionMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  actionPanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  actionTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  actionKicker: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  actionHint: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  momentumText: {
    color: mobileTheme.colors.text,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  classMechanicText: {
    color: "#bfdbfe",
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  actionBadgeStack: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: 92,
  },
  classBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: "#dbeafe",
    backgroundColor: "rgba(59,130,246,0.14)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.32)",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    includeFontPadding: false,
  },
  momentumBadge: {
    minWidth: 44,
    overflow: "hidden",
    textAlign: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: mobileTheme.colors.muted,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontWeight: "900",
  },
  momentumBadgeReady: {
    color: "#1f1300",
    backgroundColor: mobileTheme.colors.accent,
    borderColor: "rgba(246,196,83,0.75)",
  },
  momentumActionButtonActive: {
    backgroundColor: "rgba(246,196,83,0.18)",
    borderColor: "rgba(246,196,83,0.55)",
  },
  enemyTurnHeroCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(15,23,42,0.76)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.26)",
    gap: mobileTheme.spacing.sm,
  },
  enemyTurnHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  enemyTurnHeroPill: {
    color: "#fecaca",
    backgroundColor: "rgba(248,113,113,0.14)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
  },
  commandGridLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  commandGridLabel: {
    color: mobileTheme.colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  commandGridHint: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  actionReadyBanner: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(127,29,29,0.14)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.24)",
  },
  actionReadyBannerOk: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(74,222,128,0.24)",
  },
  actionReadyText: {
    color: mobileTheme.colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  combatOverlayHud: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    padding: 6,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(7,10,20,0.54)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.16)",
  },
  overlayInfoRibbon: {
    display: "none",
  },
  overlayInfoTitle: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
  },
  overlayInfoMeta: {
    color: mobileTheme.colors.accent,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  targetCommandCard: {
    width: 160,
    minHeight: 112,
    padding: 9,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(7,10,20,0.94)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.34)",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.36,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  targetCommandKicker: {
    color: "#fecaca",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  targetCommandName: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
    includeFontPadding: false,
  },
  targetCommandMeta: {
    color: mobileTheme.colors.accent,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    includeFontPadding: false,
  },
  targetCommandActionRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  targetCommandLog: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
    includeFontPadding: false,
  },
  changeTargetButton: {
    flex: 1,
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(246,196,83,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.34)",
  },
  changeTargetText: {
    color: mobileTheme.colors.accent,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    includeFontPadding: false,
  },
  commandHudStack: {
    width: 166,
    alignItems: "stretch",
    gap: 6,
  },
  commandDiamondGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  commandDiamond: {
    width: 50,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(10,12,24,0.94)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.46)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  commandDiamondTop: {},
  commandDiamondLeft: {},
  commandDiamondCenter: {
    backgroundColor: "rgba(37,99,235,0.92)",
    borderColor: "rgba(147,197,253,0.88)",
  },
  commandDiamondRight: {},
  commandDiamondBottomLeft: {
    display: "none",
  },
  commandDiamondBottom: {},
  commandDiamondBottomRight: {
    display: "none",
  },
  commandDiamondArmed: {
    backgroundColor: "rgba(246,196,83,0.22)",
    borderColor: "rgba(246,196,83,0.78)",
  },
  commandDiamondIcon: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  commandDiamondLabel: {
    color: mobileTheme.colors.text,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
    marginTop: 1,
  },
  commandSupportRow: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-end",
  },
  commandSupportButton: {
    flex: 1,
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(10,12,24,0.94)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.34)",
  },
  commandSupportButtonActive: {
    backgroundColor: "rgba(246,196,83,0.20)",
    borderColor: "rgba(246,196,83,0.74)",
  },
  commandSupportButtonText: {
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  actionFooterLine: {
    alignSelf: "flex-end",
    maxWidth: "62%",
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-end",
  },
  actionFooterText: {
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(10,12,24,0.74)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    includeFontPadding: false,
  },
  mainCommandRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryCommandRow: {
    flexDirection: "row",
    gap: 6,
  },
  smallCommandButton: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  smallCommandText: {
    color: mobileTheme.colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  skillQuickSection: {
    gap: 8,
  },
  skillQuickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  skillQuickRow: {
    gap: 8,
    paddingRight: mobileTheme.spacing.md,
  },
  skillQuickButton: {
    width: 148,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.24)",
    backgroundColor: "rgba(255,255,255,0.055)",
    gap: 4,
  },
  skillQuickTitle: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  skillQuickMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  panelToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  panelToggle: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  panelToggleActive: {
    backgroundColor: "rgba(246,196,83,0.14)",
    borderColor: "rgba(246,196,83,0.38)",
  },
  panelToggleText: {
    color: mobileTheme.colors.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  turnStatePill: {
    maxWidth: 150,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#1f1300",
    backgroundColor: mobileTheme.colors.accent,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center",
    overflow: "hidden",
    includeFontPadding: false,
  },
  turnStatePillEnemy: {
    color: "#fecaca",
    backgroundColor: "rgba(127,29,29,0.34)",
  },
  targetHeaderPill: {
    maxWidth: 150,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: mobileTheme.colors.text,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    textAlign: "center",
    overflow: "hidden",
    includeFontPadding: false,
  },
  primaryButton: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.accent,
  },
  primaryButtonText: {
    color: "#1f1300",
    fontWeight: "900",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 17,
    includeFontPadding: false,
  },
  secondaryButton: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 17,
    includeFontPadding: false,
  },
  skillRow: {
    gap: mobileTheme.spacing.sm,
    paddingTop: mobileTheme.spacing.xs,
  },
  skillButton: {
    width: 144,
    minHeight: 74,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  skillButtonSelected: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: "rgba(246,196,83,0.15)",
  },
  turnLockBanner: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.26)",
    backgroundColor: "rgba(33, 24, 42, 0.82)",
  },
  turnLockText: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  skillButtonDisabled: {
    opacity: 0.42,
  },
  skillName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    lineHeight: 17,
    includeFontPadding: false,
  },
  skillMeta: {
    color: mobileTheme.colors.muted,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },
  skillDetailPanel: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(246,196,83,0.09)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.25)",
    gap: 8,
  },
  skillDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  skillDetailTitle: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  skillDetailPill: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(246,196,83,0.10)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.22)",
  },
  skillDetailText: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
  },
  skillDetailMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  resultText: {
    color: mobileTheme.colors.text,
    fontWeight: "800",
    lineHeight: 20,
  },
  rewardBox: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(246,196,83,0.10)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.22)",
    gap: 6,
  },
  rewardTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  rewardHighlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  rewardHighlightChip: {
    color: "#211405",
    backgroundColor: mobileTheme.colors.accent,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  progressionPreviewGrid: {
    gap: 6,
  },
  progressionPreviewCard: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 3,
  },
  progressionPreviewTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  progressionPreviewLine: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  progressionTalentLine: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  progressionPreviewMuted: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  rewardLine: {
    color: mobileTheme.colors.text,
    lineHeight: 19,
  },
  rewardMuted: {
    color: mobileTheme.colors.muted,
    fontStyle: "italic",
  },
  levelUpBox: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 4,
  },
  levelUpTitle: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
  },

  resultHeroCard: {
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(10, 12, 24, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.28)",
    gap: 8,
  },
  resultKicker: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  resultTitle: {
    color: mobileTheme.colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  resultDescription: {
    color: mobileTheme.colors.muted,
    lineHeight: 21,
  },
  resultStatsGrid: {
    flexDirection: "row",
    gap: mobileTheme.spacing.sm,
  },
  resultStatCard: {
    flex: 1,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  resultStatValue: {
    color: mobileTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  resultStatLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "800",
  },
  resultConsequenceCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 6,
  },
  logPanelResult: {
    minHeight: 120,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  primaryButtonWide: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.accent,
  },
  primaryButtonDisabled: {
    opacity: 0.58,
  },
  combatItemPanel: {
    gap: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.sm,
  },
  combatItemTitle: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.54)",
  },
  combatSheet: {
    maxHeight: "86%",
    padding: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.xl,
    borderTopLeftRadius: mobileTheme.radius.xl,
    borderTopRightRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(10, 12, 24, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.22)",
    gap: mobileTheme.spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.md,
  },
  sheetKicker: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sheetTitle: {
    color: mobileTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  sheetCloseButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sheetCloseText: {
    color: mobileTheme.colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  journalSheetList: {
    maxHeight: 360,
  },
  sheetLogLine: {
    color: mobileTheme.colors.text,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    lineHeight: 18,
    fontWeight: "700",
  },
  logPanel: {
    minHeight: 48,
    padding: 8,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  logHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
    marginBottom: 8,
  },
  logTitle: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
  },
  logToggleButton: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  logToggleText: {
    color: mobileTheme.colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  logLine: {
    color: mobileTheme.colors.muted,
    marginBottom: 4,
    lineHeight: 16,
    fontSize: 12,
  },
  quickDock: {
    position: "absolute",
    left: mobileTheme.spacing.sm,
    right: mobileTheme.spacing.sm,
    bottom: mobileTheme.spacing.sm,
    minHeight: 74,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(10, 12, 24, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.24)",
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  quickDockInfo: {
    flex: 1,
    minWidth: 0,
  },
  quickDockTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  quickDockMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "800",
  },
  quickDockButtonPrimary: {
    minWidth: 82,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.accent,
    paddingHorizontal: 10,
  },
  quickDockButton: {
    minWidth: 54,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    paddingHorizontal: 8,
  },
  quickDockButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    includeFontPadding: false,
  },
  quickDockPassive: {
    color: "#fecaca",
    fontWeight: "900",
    backgroundColor: "rgba(127,29,29,0.22)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
