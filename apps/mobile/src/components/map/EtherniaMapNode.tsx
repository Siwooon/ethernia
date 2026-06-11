import { Pressable, StyleSheet, Text, View } from "react-native";
import { ClassType, MapNode } from "@/shared/types/game";
import { getMobileMapNodeDisplay, isMapNodeRevealedForMobile } from "@/shared/engine/map/mapPresentation";
import { etherniaTheme } from "../../styles/etherniaTheme";
import { ClassIcon } from "../ClassIcon";

export const ETHERNIA_MAP_NODE_SIZE = 72;

export type EtherniaMapNodeLayout = {
  node: MapNode;
  x: number;
  y: number;
};

export type EtherniaMapHeroMarker = {
  playerId: number;
  name: string;
  classType: ClassType;
  level?: number;
  isActive: boolean;
};

type EtherniaMapNodeProps = {
  layout: EtherniaMapNodeLayout;
  selected: boolean;
  current: boolean;
  reachable: boolean;
  corrupted: boolean;
  diagnosticsMode?: boolean;
  heroMarkers?: EtherniaMapHeroMarker[];
  onPress: (node: MapNode) => void;
};

type NodeVisualTone = "camp" | "combat" | "elite" | "treasure" | "merchant" | "shrine" | "rest" | "mystery" | "boss" | "spent" | "corrupted" | "fog";

function getNodeVisualTone(node: MapNode, revealed: boolean, corrupted: boolean, consumed: boolean): NodeVisualTone {
  if (!revealed) return "fog";
  if (corrupted) return "corrupted";
  if (consumed) return "spent";
  if (node.kind === "start") return "camp";
  if (node.kind === "boss" || node.kind === "boss_prep") return "boss";
  if (node.kind === "statuette" || node.eventType === "scripted_shrine") return "shrine";

  switch (node.eventType) {
    case "battle":
      return "combat";
    case "elite":
      return "elite";
    case "treasure":
      return "treasure";
    case "rest":
      return "rest";
    case "merchant_blacksmith":
    case "merchant_alchemist":
    case "merchant_mystic":
      return "merchant";
    case "random":
      return "mystery";
    default:
      return "fog";
  }
}

function getNodeStateGlyph({ current, reachable, consumed, corrupted, revealed }: { current: boolean; reachable: boolean; consumed: boolean; corrupted: boolean; revealed: boolean }) {
  if (!revealed) return "?";
  if (current) return "◆";
  if (corrupted) return "!";
  if (reachable) return "→";
  if (consumed) return "✓";
  return "·";
}

export function EtherniaMapNode({ layout, selected, current, reachable, corrupted, diagnosticsMode = false, heroMarkers = [], onPress }: EtherniaMapNodeProps) {
  const display = getMobileMapNodeDisplay(layout.node, corrupted ? [layout.node.id] : []);
  const consumed = Boolean(layout.node.isConsumed);
  const revealed = isMapNodeRevealedForMobile(layout.node);
  const tone = getNodeVisualTone(layout.node, revealed, corrupted && revealed, consumed);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={display.label}
      onPress={() => onPress(layout.node)}
      hitSlop={4}
      style={({ pressed }) => [
        styles.node,
        styles[`${tone}Node`],
        reachable && !current && styles.reachable,
        current && styles.current,
        selected && styles.selected,
        consumed && revealed && styles.consumed,
        pressed && styles.pressed,
        { left: layout.x, top: layout.y },
      ]}
    >
      <View style={[styles.outerAura, styles[`${tone}Aura`], selected && styles.selectedAura]} />
      <View style={[styles.innerHalo, styles[`${tone}Halo`], current && styles.innerHaloCurrent]} />
      <Text style={[styles.icon, !revealed && styles.concealedIcon]}>{display.icon}</Text>

      <View style={[styles.stateBadge, styles[`${tone}Badge`], current && styles.currentBadge]}>
        <Text style={styles.stateBadgeText}>{getNodeStateGlyph({ current, reachable, consumed, corrupted, revealed })}</Text>
      </View>

      {diagnosticsMode && revealed ? <Text style={styles.label} numberOfLines={1}>{display.label}</Text> : null}
      {heroMarkers.length > 0 ? (
        <View style={styles.heroMarkerRow}>
          {heroMarkers.slice(0, 3).map((marker) => (
            <View key={marker.playerId} style={styles.heroMarkerWrap}>
              <ClassIcon classType={marker.classType} variant="map" size="sm" active={marker.isActive} style={styles.heroMarker} />
            </View>
          ))}
          {heroMarkers.length > 3 ? <Text style={styles.heroMarkerMore}>+{heroMarkers.length - 3}</Text> : null}
        </View>
      ) : null}
      {diagnosticsMode ? (
        <Text style={styles.state} numberOfLines={1}>
          {current ? "Ici" : reachable ? "Route" : consumed ? "Trace" : layout.node.visibility}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    position: "absolute",
    width: ETHERNIA_MAP_NODE_SIZE,
    height: ETHERNIA_MAP_NODE_SIZE,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderWidth: 2,
    borderColor: "rgba(246, 231, 200, 0.16)",
    backgroundColor: "rgba(19, 13, 34, 0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.44,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
    overflow: "visible",
  },
  outerAura: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    opacity: 0.28,
  },
  selectedAura: {
    opacity: 0.56,
  },
  innerHalo: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  innerHaloCurrent: {
    borderColor: "rgba(255,247,232,0.54)",
    backgroundColor: "rgba(159,122,234,0.24)",
  },
  current: {
    borderColor: etherniaTheme.colors.arcane,
    backgroundColor: "rgba(43, 30, 70, 0.99)",
    transform: [{ scale: 1.08 }],
  },
  reachable: {
    borderColor: etherniaTheme.colors.gold,
  },
  consumed: {
    opacity: 0.72,
  },
  selected: {
    borderColor: etherniaTheme.colors.arcane,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    fontSize: 25,
    zIndex: 2,
  },
  concealedIcon: {
    color: etherniaTheme.colors.textDim,
    fontSize: 26,
  },
  label: {
    color: etherniaTheme.colors.text,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
    zIndex: 2,
    textAlign: "center",
  },
  stateBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,247,232,0.24)",
    backgroundColor: "rgba(5,3,10,0.92)",
    zIndex: 5,
  },
  stateBadgeText: {
    color: etherniaTheme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  currentBadge: {
    backgroundColor: "rgba(103,232,249,0.26)",
    borderColor: etherniaTheme.colors.arcane,
  },
  heroMarkerRow: {
    position: "absolute",
    bottom: -8,
    left: -5,
    right: -5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    zIndex: 6,
  },
  heroMarkerWrap: {
    position: "relative",
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMarker: {
    transform: [{ scale: 0.72 }],
  },
  heroMarkerMore: {
    color: etherniaTheme.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderRadius: 999,
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  state: {
    color: etherniaTheme.colors.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
    zIndex: 2,
  },
  campNode: { borderColor: "rgba(117,215,118,0.72)", backgroundColor: "rgba(16, 44, 31, 0.98)" },
  combatNode: { borderColor: "rgba(246,231,200,0.52)", backgroundColor: "rgba(38, 31, 42, 0.98)" },
  eliteNode: { borderColor: "rgba(255,94,115,0.72)", backgroundColor: "rgba(54, 22, 34, 0.98)" },
  treasureNode: { borderColor: "rgba(242,193,91,0.78)", backgroundColor: "rgba(55, 38, 18, 0.98)" },
  merchantNode: { borderColor: "rgba(249,115,69,0.72)", backgroundColor: "rgba(55, 34, 23, 0.98)" },
  shrineNode: { borderColor: "rgba(103,232,249,0.72)", backgroundColor: "rgba(22, 41, 52, 0.98)" },
  restNode: { borderColor: "rgba(159,122,234,0.72)", backgroundColor: "rgba(35, 30, 58, 0.98)" },
  mysteryNode: { borderColor: "rgba(167,139,250,0.72)", backgroundColor: "rgba(42, 28, 62, 0.98)" },
  bossNode: { borderColor: "rgba(255,94,115,0.95)", backgroundColor: "rgba(70, 18, 31, 0.98)" },
  spentNode: { borderColor: "rgba(215,198,170,0.24)", backgroundColor: "rgba(21, 19, 27, 0.98)" },
  corruptedNode: { borderColor: etherniaTheme.colors.crimson, backgroundColor: "rgba(60, 18, 34, 0.99)" },
  fogNode: { borderColor: "rgba(215,198,170,0.20)", backgroundColor: "rgba(9, 7, 18, 0.99)" },
  campAura: { backgroundColor: "rgba(74,222,128,0.38)" },
  combatAura: { backgroundColor: "rgba(246,231,200,0.20)" },
  eliteAura: { backgroundColor: "rgba(255,94,115,0.40)" },
  treasureAura: { backgroundColor: "rgba(242,193,91,0.42)" },
  merchantAura: { backgroundColor: "rgba(249,115,69,0.35)" },
  shrineAura: { backgroundColor: "rgba(103,232,249,0.34)" },
  restAura: { backgroundColor: "rgba(159,122,234,0.34)" },
  mysteryAura: { backgroundColor: "rgba(167,139,250,0.35)" },
  bossAura: { backgroundColor: "rgba(255,94,115,0.52)" },
  spentAura: { backgroundColor: "rgba(215,198,170,0.10)" },
  corruptedAura: { backgroundColor: "rgba(255,94,115,0.48)" },
  fogAura: { backgroundColor: "rgba(11, 8, 25, 0.46)" },
  campHalo: { backgroundColor: "rgba(74,222,128,0.12)" },
  combatHalo: { backgroundColor: "rgba(246,231,200,0.06)" },
  eliteHalo: { backgroundColor: "rgba(255,94,115,0.16)" },
  treasureHalo: { backgroundColor: "rgba(242,193,91,0.17)" },
  merchantHalo: { backgroundColor: "rgba(249,115,69,0.14)" },
  shrineHalo: { backgroundColor: "rgba(103,232,249,0.13)" },
  restHalo: { backgroundColor: "rgba(159,122,234,0.13)" },
  mysteryHalo: { backgroundColor: "rgba(167,139,250,0.14)" },
  bossHalo: { backgroundColor: "rgba(255,94,115,0.18)" },
  spentHalo: { backgroundColor: "rgba(255,255,255,0.03)" },
  corruptedHalo: { backgroundColor: "rgba(255,94,115,0.18)" },
  fogHalo: { backgroundColor: "rgba(140,126,166,0.08)" },
  campBadge: { borderColor: "rgba(74,222,128,0.72)" },
  combatBadge: { borderColor: "rgba(246,231,200,0.34)" },
  eliteBadge: { borderColor: "rgba(255,94,115,0.72)" },
  treasureBadge: { borderColor: "rgba(242,193,91,0.72)" },
  merchantBadge: { borderColor: "rgba(249,115,69,0.72)" },
  shrineBadge: { borderColor: "rgba(103,232,249,0.72)" },
  restBadge: { borderColor: "rgba(159,122,234,0.72)" },
  mysteryBadge: { borderColor: "rgba(167,139,250,0.72)" },
  bossBadge: { borderColor: "rgba(255,94,115,0.88)" },
  spentBadge: { borderColor: "rgba(215,198,170,0.24)" },
  corruptedBadge: { borderColor: etherniaTheme.colors.crimson },
  fogBadge: { borderColor: "rgba(215,198,170,0.22)" },
});
