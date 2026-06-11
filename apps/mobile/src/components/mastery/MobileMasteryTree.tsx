import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "../../styles/theme";
import {
  type TalentBranch,
  type TalentNode,
  getTalentNodeCondition,
  isTalentNodeAvailable,
  isTalentNodeUnlocked,
} from "@/shared/engine/game/classTalentTrees";
import type { ClassType, LevelUpChoiceId, PlayerBuildChoice } from "@/shared/types/game";
import { getClassDisplayName } from "@/shared/engine/game/displayLabels";

type TreeStatus = "hub" | "unlocked" | "available" | "locked";

type RenderNode = {
  key: string;
  x: number;
  y: number;
  label: string;
  icon: string;
  status: TreeStatus;
  branchId?: string;
  branchLabel?: string;
  node?: TalentNode;
  chip: string;
  subtitle?: string;
  selectable: boolean;
};

type RenderLink = {
  key: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  active: boolean;
};

type MobileMasteryTreeProps = {
  classType: ClassType;
  level: number;
  choices: PlayerBuildChoice[] | undefined;
  branches: TalentBranch[];
  availablePoints: number;
  selectedTalentKey?: string | null;
  newlyGravedTalentKey?: string | null;
  onSelectTalent: (payload: { branchId: string; branchLabel: string; node: TalentNode }) => void;
};

type TreeLayout = {
  branchX: [number, number, number];
  tierY: [number, number, number];
  tierXOffset: [number, number, number];
  rune: string;
};

const BASE_CANVAS_WIDTH = 800;
const BASE_CANVAS_HEIGHT = 1260;
const ROOT_CENTER = { x: 400, y: 160 };
const CORE_CENTER = { x: 400, y: 352 };
const BRANCH_LABEL_Y = 438;
const DEFAULT_BRANCH_X: [number, number, number] = [168, 400, 632];
const DEFAULT_TIER_Y: [number, number, number] = [574, 816, 1056];
const NODE_SIZE = 80;
const HUB_NODE_SIZE = 92;
const NODE_LABEL_WIDTH = 154;
const CONNECTOR_THICKNESS = 4;
const CONNECTOR_OVERLAP = 4;
const MIN_ZOOM = 0.72;
const MAX_ZOOM = 1.4;
const DEFAULT_ZOOM = 0.82;

const CLASS_ICONS: Record<ClassType, string> = {
  Guerrier: "⚔",
  Mage: "✦",
  Archer: "➶",
  Voleur: "◈",
  Demoniste: "☾",
  Clerc: "✚",
  Sentinelle: "◇",
};

function getClassMechanicSummary(classType: ClassType) {
  const summaries: Record<ClassType, string> = {
    Guerrier: "Défendre réduit les dégâts reçus et prépare une riposte plus forte.",
    Mage: "Lancer un sort remplit la Surcharge. Une Surcharge pleine renforce le prochain sort.",
    Archer: "La Marque augmente les dégâts sur une cible. Frapper une cible marquée exploite ce bonus.",
    Voleur: "Chaque attaque augmente le Combo. Le troisième coup inflige un bonus puis remet le Combo à zéro.",
    Demoniste: "Certains effets donnent beaucoup de dégâts, mais coûtent des PV ou augmentent la corruption.",
    Clerc: "Soigne, protège et retire les malus. Défendre aide l’allié le plus fragile.",
    Sentinelle: "Donne des boucliers d’équipe et inflige plus de dégâts aux ennemis Vulnérables ou Fragiles.",
  };

  return summaries[classType];
}

function getClassMechanicDetail(classType: ClassType) {
  const details: Record<ClassType, string> = {
    Guerrier: "Quand tu utilises Défendre, le Guerrier gagne un bouclier. Sa prochaine riposte profite davantage de sa Force.",
    Mage: "Chaque sort lancé ajoute de la Surcharge. Quand la jauge est pleine, le prochain sort inflige un gros bonus de dégâts, puis la jauge redescend.",
    Archer: "La Marque sert à choisir une cible prioritaire. Les attaques sur une cible marquée infligent plus de dégâts et certains talents améliorent cette exploitation.",
    Voleur: "Le Combo monte avec les attaques. Le troisième coup est le coup fort : il gagne un bonus de dégâts puis le compteur repart de zéro.",
    Demoniste: "Le Démoniste échange de la sécurité contre des dégâts. Certains bonus coûtent des PV ou augmentent la corruption : à utiliser quand le gain vaut le risque.",
    Clerc: "Le Clerc sert à garder l’équipe debout : soins, boucliers et retrait de malus. Défendre protège surtout l’allié le plus en danger.",
    Sentinelle: "La Sentinelle protège toute l’équipe avec des boucliers. Elle devient plus offensive quand la cible est Vulnérable ou Fragile.",
  };

  return details[classType];
}

function buildMechanicNode(classType: ClassType): TalentNode {
  return {
    id: `mechanic-${classType}`,
    label: getClassDisplayName(classType),
    icon: CLASS_ICONS[classType] ?? "✦",
    hint: getClassMechanicSummary(classType),
    effect: getClassMechanicDetail(classType),
    change: "Active dès le début de la run.",
    technical: getClassMechanicDetail(classType),
    milestone: "Toujours actif. Aucun point requis.",
    role: "Rythme",
    tier: 0,
    choiceId: "vitalite" as LevelUpChoiceId,
    cost: 0,
    requiredLevel: 1,
  };
}

const TALENT_ICON_OVERRIDES: Partial<Record<LevelUpChoiceId, string>> = {
  vitalite: "♥",
  tempo: "➶",
  puissance: "⚔",
  arcane: "✦",
  warrior_garde: "▰",
  warrior_riposte: "⛨",
  warrior_commandement: "⚑",
  warrior_stalwart: "▣",
  warrior_riposte_master: "⚔",
  warrior_battle_line: "☗",
  mage_feu: "✹",
  mage_voile: "☽",
  mage_surcharge: "✧",
  mage_inferno: "♨",
  mage_void_reading: "◌",
  mage_overcharge: "✦",
  archer_marque: "⌖",
  archer_execution: "✷",
  archer_piste: "➴",
  archer_hunters_mark: "◎",
  archer_finisher: "➹",
  archer_momentum: "➶",
  rogue_combo: "⛓",
  rogue_ombre: "☾",
  rogue_butin: "◈",
  rogue_chain_finish: "⛓",
  rogue_first_shadow: "†",
  rogue_quick_loot: "◇",
  warlock_sang: "◆",
  warlock_abime: "☗",
  warlock_faim: "✹",
  warlock_blood_price: "♦",
  warlock_black_tide: "☊",
  warlock_last_hunger: "☍",
  cleric_foi: "✚",
  cleric_sceau: "◇",
  cleric_jugement: "✷",
  cleric_wide_faith: "✚",
  cleric_guardian_seal: "▣",
  cleric_sentence: "⚖",
  sentinel_ancrage: "◇",
  sentinel_egide: "⛨",
  sentinel_faille: "☽",
  sentinel_anchor_pulse: "◉",
  sentinel_veil_guard: "▣",
  sentinel_second_veil: "🌌",
  sentinel_anchor_relay: "◎",
};

function getClassLayout(classType: ClassType): TreeLayout {
  const layouts: Record<ClassType, TreeLayout> = {
    Guerrier: {
      branchX: [158, 400, 642],
      tierY: [572, 814, 1052],
      tierXOffset: [-40, 0, 40],
      rune: "⚔",
    },
    Mage: {
      branchX: [170, 400, 630],
      tierY: [568, 816, 1062],
      tierXOffset: [-58, 0, 58],
      rune: "✦",
    },
    Archer: {
      branchX: [150, 400, 650],
      tierY: [580, 818, 1054],
      tierXOffset: [-72, 0, 72],
      rune: "⌖",
    },
    Voleur: {
      branchX: [178, 400, 622],
      tierY: [572, 806, 1048],
      tierXOffset: [-86, 0, 86],
      rune: "◈",
    },
    Demoniste: {
      branchX: [160, 400, 640],
      tierY: [582, 828, 1078],
      tierXOffset: [-68, 0, 68],
      rune: "☾",
    },
    Clerc: {
      branchX: [166, 400, 634],
      tierY: [570, 812, 1058],
      tierXOffset: [-44, 0, 44],
      rune: "✚",
    },
    Sentinelle: {
      branchX: [172, 400, 628],
      tierY: [572, 822, 1070],
      tierXOffset: [-52, 0, 52],
      rune: "◇",
    },
  };

  return layouts[classType] ?? {
    branchX: DEFAULT_BRANCH_X,
    tierY: DEFAULT_TIER_Y,
    tierXOffset: [-60, 0, 60],
    rune: "✦",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) return null;
  const [first, second] = touches;
  const dx = first.pageX - second.pageX;
  const dy = first.pageY - second.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTalentIcon(node: TalentNode) {
  return TALENT_ICON_OVERRIDES[node.choiceId] ?? node.icon;
}

function statusColor(status: TreeStatus, active: boolean) {
  if (status === "hub") {
    return {
      fill: "rgba(246,196,83,0.14)",
      border: "rgba(246,196,83,0.40)",
      glow: "rgba(246,196,83,0.28)",
      text: mobileTheme.colors.accent,
      shadow: active ? 0.52 : 0.26,
      chipFill: "rgba(11,18,32,0.88)",
    };
  }

  if (status === "unlocked") {
    return {
      fill: "rgba(83,246,149,0.13)",
      border: "rgba(83,246,149,0.48)",
      glow: "rgba(83,246,149,0.22)",
      text: "#d7ffe3",
      shadow: active ? 0.46 : 0.22,
      chipFill: "rgba(8,19,14,0.88)",
    };
  }

  if (status === "available") {
    return {
      fill: "rgba(103,232,249,0.12)",
      border: "rgba(103,232,249,0.48)",
      glow: "rgba(103,232,249,0.18)",
      text: "#e4fdff",
      shadow: active ? 0.42 : 0.18,
      chipFill: "rgba(8,18,22,0.88)",
    };
  }

  return {
    fill: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.16)",
    glow: "rgba(255,255,255,0.035)",
    text: "rgba(226,232,240,0.76)",
    shadow: 0,
    chipFill: "rgba(16,20,28,0.88)",
  };
}

function ConnectorSegment({
  x,
  y,
  width,
  height,
  active,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.connector,
        {
          left: x,
          top: y,
          width,
          height,
          backgroundColor: active ? "rgba(127,255,175,0.76)" : "rgba(255,255,255,0.18)",
          shadowOpacity: active ? 0.32 : 0,
        },
      ]}
    />
  );
}

function Connector({ from, to, active, zoom }: { from: RenderLink["from"]; to: RenderLink["to"]; active: boolean; zoom: number }) {
  const x1 = from.x * zoom;
  const y1 = from.y * zoom;
  const x2 = to.x * zoom;
  const y2 = to.y * zoom;
  const thickness = CONNECTOR_THICKNESS * zoom;
  const overlap = CONNECTOR_OVERLAP * zoom;
  const midY = Math.round((y1 + y2) / 2);
  const verticalStartTop = Math.min(y1, midY) - overlap;
  const verticalStartHeight = Math.abs(midY - y1) + overlap * 2;
  const horizontalLeft = Math.min(x1, x2) - overlap;
  const horizontalWidth = Math.abs(x2 - x1) + overlap * 2;
  const verticalEndTop = Math.min(midY, y2) - overlap;
  const verticalEndHeight = Math.abs(y2 - midY) + overlap * 2;

  return (
    <>
      <ConnectorSegment
        x={x1 - thickness / 2}
        y={verticalStartTop}
        width={thickness}
        height={Math.max(thickness, verticalStartHeight)}
        active={active}
      />
      <ConnectorSegment
        x={horizontalLeft}
        y={midY - thickness / 2}
        width={Math.max(thickness, horizontalWidth)}
        height={thickness}
        active={active}
      />
      <ConnectorSegment
        x={x2 - thickness / 2}
        y={verticalEndTop}
        width={thickness}
        height={Math.max(thickness, verticalEndHeight)}
        active={active}
      />
    </>
  );
}

function buildTree(
  classType: ClassType,
  level: number,
  choices: PlayerBuildChoice[] | undefined,
  branches: TalentBranch[],
): { nodes: RenderNode[]; links: RenderLink[]; layout: TreeLayout } {
  const layout = getClassLayout(classType);
  const nodes: RenderNode[] = [
    {
      key: `hub:${classType}`,
      x: ROOT_CENTER.x,
      y: ROOT_CENTER.y,
      label: getClassDisplayName(classType),
      icon: CLASS_ICONS[classType] ?? "✦",
      status: "hub",
      chip: "Mécanique",
      subtitle: getClassMechanicSummary(classType),
      branchId: "mechanic",
      branchLabel: "Mécanique de classe",
      node: buildMechanicNode(classType),
      selectable: true,
    },
  ];

  const links: RenderLink[] = [];

  branches.slice(0, 3).forEach((branch, branchIndex) => {
    const x = layout.branchX[branchIndex] ?? CORE_CENTER.x;
    const branchNodes = branch.nodes.slice(0, 3);
    const tierCenters = [
      { x, y: layout.tierY[0] },
      { x: x + (branchIndex === 0 ? layout.tierXOffset[0] : branchIndex === 2 ? layout.tierXOffset[2] : layout.tierXOffset[1]), y: layout.tierY[1] },
      { x: x + (branchIndex === 0 ? layout.tierXOffset[0] * 1.45 : branchIndex === 2 ? layout.tierXOffset[2] * 1.45 : layout.tierXOffset[1]), y: layout.tierY[2] },
    ];

    branchNodes.forEach((node, nodeIndex) => {
      const center = tierCenters[nodeIndex];
      const unlocked = isTalentNodeUnlocked(node, choices);
      const available = isTalentNodeAvailable(node, classType, level, choices);
      const status: TreeStatus = unlocked ? "unlocked" : available ? "available" : "locked";

      nodes.push({
        key: `${branch.id}:${node.id}`,
        x: center.x,
        y: center.y,
        label: node.label,
        icon: getTalentIcon(node),
        status,
        branchId: branch.id,
        branchLabel: branch.label,
        node,
        chip: unlocked ? "Pris" : available ? "Prêt" : "Scellé",
        subtitle: node.tier ? `Palier ${node.tier}` : `Niv. ${node.requiredLevel}`,
        selectable: true,
      });

      if (nodeIndex === 0) {
        links.push({
          key: `link:hub:${branch.id}:${node.id}`,
          from: { x: ROOT_CENTER.x, y: ROOT_CENTER.y + HUB_NODE_SIZE / 2 },
          to: { x: center.x, y: center.y - NODE_SIZE / 2 },
          active: unlocked || available,
        });
      } else {
        const previousNode = branchNodes[nodeIndex - 1];
        const previousCenter = tierCenters[nodeIndex - 1];
        const previousUnlocked = isTalentNodeUnlocked(previousNode, choices);
        links.push({
          key: `link:${branch.id}:${previousNode.id}:${node.id}`,
          from: { x: previousCenter.x, y: previousCenter.y + NODE_SIZE / 2 },
          to: { x: center.x, y: center.y - NODE_SIZE / 2 },
          active: previousUnlocked && (unlocked || available),
        });
      }
    });
  });

  return { nodes, links, layout };
}

export function MobileMasteryTree({
  classType,
  level,
  choices,
  branches,
  availablePoints: _availablePoints,
  selectedTalentKey,
  newlyGravedTalentKey,
  onSelectTalent,
}: MobileMasteryTreeProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchZoomRef = useRef(DEFAULT_ZOOM);
  const initialScrollKeyRef = useRef<string | null>(null);
  const { nodes, links, layout } = useMemo(
    () => buildTree(classType, level, choices, branches),
    [classType, level, choices, branches],
  );

  const canvasWidth = Math.round(BASE_CANVAS_WIDTH * zoom);
  const canvasHeight = Math.round(BASE_CANVAS_HEIGHT * zoom);
  const labelWidth = NODE_LABEL_WIDTH * zoom;

  useEffect(() => {
    const key = `${classType}:${level}`;
    if (initialScrollKeyRef.current === key) return;
    initialScrollKeyRef.current = key;

    const timeoutId = setTimeout(() => {
      horizontalScrollRef.current?.scrollTo({ x: Math.max(0, CORE_CENTER.x * DEFAULT_ZOOM - 170), animated: false });
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 120);

    return () => clearTimeout(timeoutId);
  }, [classType, level]);

  return (
    <View style={styles.wrapper}>
      <ScrollView ref={horizontalScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroller}>
        <ScrollView ref={verticalScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.verticalScroller}>
          <View
            style={[styles.canvas, { width: canvasWidth, minHeight: canvasHeight }]}
            onTouchStart={(event) => {
              const distance = getTouchDistance(event.nativeEvent.touches);
              if (distance !== null) {
                pinchDistanceRef.current = distance;
                pinchZoomRef.current = zoom;
              }
            }}
            onTouchMove={(event) => {
              const distance = getTouchDistance(event.nativeEvent.touches);
              if (distance !== null && pinchDistanceRef.current) {
                const nextZoom = clamp(pinchZoomRef.current * (distance / pinchDistanceRef.current), MIN_ZOOM, MAX_ZOOM);
                setZoom(Number(nextZoom.toFixed(2)));
              }
            }}
            onTouchEnd={(event) => {
              if (event.nativeEvent.touches.length < 2) {
                pinchDistanceRef.current = null;
                pinchZoomRef.current = zoom;
              }
            }}
          >
            <View style={[styles.backgroundGlow, { left: 118 * zoom, top: 128 * zoom, width: 564 * zoom, height: 564 * zoom }]} />
            <View style={[styles.backRingLarge, { left: 78 * zoom, top: 116 * zoom, width: 644 * zoom, height: 644 * zoom }]} />
            <View style={[styles.backRingSmall, { left: 220 * zoom, top: 258 * zoom, width: 360 * zoom, height: 360 * zoom }]} />
            <Text style={[styles.centerRune, { left: 318 * zoom, top: 454 * zoom, width: 164 * zoom, fontSize: 104 * zoom }]}>
              {layout.rune}
            </Text>
            {layout.branchX.map((x, index) => (
              <View
                key={`branch-lane-${index}`}
                pointerEvents="none"
                style={[
                  styles.branchLane,
                  {
                    left: x * zoom - 72 * zoom,
                    top: 418 * zoom,
                    width: 144 * zoom,
                    height: 706 * zoom,
                    borderRadius: 72 * zoom,
                  },
                ]}
              />
            ))}
            {[0, 1, 2, 3, 4].map((index) => (
              <Text
                key={`dust-rune-${index}`}
                pointerEvents="none"
                style={[
                  styles.dustRune,
                  {
                    left: (104 + index * 142) * zoom,
                    top: (234 + (index % 2) * 540) * zoom,
                    fontSize: 22 * zoom,
                  },
                ]}
              >
                {index % 2 === 0 ? "✦" : "◇"}
              </Text>
            ))}

            {branches.slice(0, 3).map((branch, index) => (
              <View
                key={`branch-banner-${branch.id}`}
                style={[
                  styles.branchBanner,
                  {
                    left: layout.branchX[index] * zoom - 72 * zoom,
                    top: BRANCH_LABEL_Y * zoom,
                    width: 144 * zoom,
                    minHeight: 60 * zoom,
                    paddingHorizontal: 8 * zoom,
                    paddingVertical: 7 * zoom,
                  },
                ]}
              >
                <Text style={[styles.branchBannerTitle, { fontSize: 12 * zoom }]} numberOfLines={1}>
                  {branch.label}
                </Text>
                <Text style={[styles.branchBannerText, { fontSize: 10 * zoom, lineHeight: 12 * zoom }]} numberOfLines={2}>
                  {branch.summary}
                </Text>
              </View>
            ))}

            {links.map((link) => (
              <Connector key={link.key} from={link.from} to={link.to} active={link.active} zoom={zoom} />
            ))}

            {nodes.map((entry) => {
              const active = selectedTalentKey === entry.key;
              const justGraved = newlyGravedTalentKey === entry.key;
              const palette = statusColor(entry.status, active || justGraved);
              const isHub = entry.status === "hub";
              const buttonSize = (isHub ? HUB_NODE_SIZE : NODE_SIZE) * zoom;
              const chipMaxWidth = (isHub ? 96 : 92) * zoom;

              return (
                <View
                  key={entry.key}
                  style={[
                    styles.nodeWrap,
                    {
                      width: labelWidth,
                      left: entry.x * zoom - labelWidth / 2,
                      top: entry.y * zoom - buttonSize / 2,
                    },
                  ]}
                >
                  {justGraved ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.nodeValidationAura,
                        {
                          width: buttonSize + 22 * zoom,
                          height: buttonSize + 22 * zoom,
                          borderRadius: (buttonSize + 22 * zoom) / 2,
                          top: -11 * zoom,
                          borderColor: palette.border,
                        },
                      ]}
                    />
                  ) : null}
                  {justGraved ? (
                    <Text
                      pointerEvents="none"
                      style={[
                        styles.nodeValidationSpark,
                        {
                          top: -20 * zoom,
                          fontSize: 17 * zoom,
                          color: palette.text,
                        },
                      ]}
                    >
                      ✦
                    </Text>
                  ) : null}
                  <Pressable
                    disabled={!entry.selectable}
                    onPress={() => {
                      if (entry.node && entry.branchId && entry.branchLabel) {
                        onSelectTalent({ branchId: entry.branchId, branchLabel: entry.branchLabel, node: entry.node });
                      }
                    }}
                    style={[
                      styles.nodeButton,
                      {
                        width: buttonSize,
                        height: buttonSize,
                        borderRadius: (isHub ? 30 : 23) * zoom,
                        backgroundColor: palette.fill,
                        borderColor: active ? mobileTheme.colors.text : palette.border,
                        shadowColor: palette.border,
                        shadowOpacity: palette.shadow,
                      },
                    ]}
                  >
                    <View style={[styles.nodeGlow, { backgroundColor: palette.glow }]} />
                    <View style={[styles.nodeInnerRing, { borderRadius: (isHub ? 24 : 19) * zoom, borderColor: palette.border }]} />
                    <Text style={[styles.nodeIcon, { color: palette.text, fontSize: (isHub ? 34 : 29) * zoom }]}>
                      {entry.icon}
                    </Text>
                  </Pressable>

                  <View
                    style={[
                      styles.nodeChip,
                      {
                        minWidth: 60 * zoom,
                        maxWidth: chipMaxWidth,
                        marginTop: -8 * zoom,
                        paddingHorizontal: 8 * zoom,
                        paddingVertical: 4 * zoom,
                        borderRadius: 999,
                        borderColor: palette.border,
                        backgroundColor: palette.chipFill,
                      },
                    ]}
                  >
                    <Text style={[styles.nodeChipText, { color: palette.text, fontSize: 10 * zoom, lineHeight: 12 * zoom }]} numberOfLines={1}>
                      {entry.chip}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.nodeTextCard,
                      {
                        minHeight: 54 * zoom,
                        marginTop: 7 * zoom,
                        paddingHorizontal: 7 * zoom,
                        paddingVertical: 6 * zoom,
                        borderRadius: 12 * zoom,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nodeLabel,
                        { fontSize: 12 * zoom, lineHeight: 15 * zoom },
                        entry.status === "locked" && styles.nodeLabelLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {entry.label}
                    </Text>
                    {entry.subtitle ? (
                      <Text style={[styles.nodeSubLabel, { fontSize: 10 * zoom, lineHeight: 12 * zoom }]} numberOfLines={2}>
                        {entry.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(3, 9, 18, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  horizontalScroller: {
    paddingHorizontal: 22,
    paddingBottom: 2,
  },
  verticalScroller: {
    paddingTop: 16,
    paddingBottom: 28,
  },
  canvas: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#07101a",
    overflow: "hidden",
    marginRight: 22,
  },
  backgroundGlow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(246,196,83,0.025)",
  },
  backRingLarge: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.075)",
  },
  backRingSmall: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.055)",
  },
  centerRune: {
    position: "absolute",
    color: "rgba(246,196,83,0.045)",
    textAlign: "center",
    fontWeight: "900",
  },
  branchLane: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.018)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.035)",
  },
  dustRune: {
    position: "absolute",
    color: "rgba(246,196,83,0.10)",
    fontWeight: "900",
  },
  branchBanner: {
    position: "absolute",
    borderRadius: 14,
    backgroundColor: "rgba(9,17,29,0.82)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  branchBannerTitle: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
    textAlign: "center",
  },
  branchBannerText: {
    color: mobileTheme.colors.muted,
    textAlign: "center",
    marginTop: 2,
  },
  connector: {
    position: "absolute",
    borderRadius: 999,
    shadowRadius: 7,
  },
  nodeWrap: {
    position: "absolute",
    alignItems: "center",
  },
  nodeValidationAura: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: "rgba(246,196,83,0.08)",
    opacity: 0.9,
  },
  nodeValidationSpark: {
    position: "absolute",
    fontWeight: "900",
    textAlign: "center",
  },
  nodeButton: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowRadius: 11,
    elevation: 2,
  },
  nodeGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
  },
  nodeInnerRing: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 8,
    bottom: 8,
    borderWidth: 1,
    opacity: 0.45,
  },
  nodeIcon: {
    fontWeight: "900",
    includeFontPadding: false,
  },
  nodeChip: {
    borderWidth: 1,
    alignItems: "center",
  },
  nodeChipText: {
    fontWeight: "900",
    includeFontPadding: false,
    textAlign: "center",
  },
  nodeTextCard: {
    width: "100%",
    backgroundColor: "rgba(7,12,19,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  nodeLabel: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    textAlign: "center",
  },
  nodeLabelLocked: {
    color: "rgba(226,232,240,0.76)",
  },
  nodeSubLabel: {
    marginTop: 2,
    color: mobileTheme.colors.muted,
    textAlign: "center",
  },
});

export function getSelectedTalentStatusText(
  node: TalentNode,
  classType: ClassType,
  level: number,
  choices: PlayerBuildChoice[] | undefined,
) {
  return getTalentNodeCondition(node, classType, level, choices);
}
