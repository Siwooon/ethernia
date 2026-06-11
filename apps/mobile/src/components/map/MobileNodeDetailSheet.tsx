import { Pressable, StyleSheet, Text, View } from "react-native";
import { getMobileMapNodeDescription, getMobileMapNodeDisplay, getMapNodeStateLabel, isMapNodeRevealedForMobile } from "@/shared/engine/map/mapPresentation";
import { MapNode } from "@/shared/types/game";
import { EtherniaButton, EtherniaCard } from "../design";
import { etherniaTheme } from "../../styles/etherniaTheme";

type MobileNodeDetailSheetProps = {
  node: MapNode | null;
  isCurrent: boolean;
  isReachable: boolean;
  isCorrupted: boolean;
  canMove: boolean;
  diagnosticsMode?: boolean;
  onMove: () => void;
  onExamine: () => void;
  onClose?: () => void;
};

function getNarrativeStatus({ node, isCurrent, isReachable, isCorrupted, revealed }: { node: MapNode; isCurrent: boolean; isReachable: boolean; isCorrupted: boolean; revealed: boolean }) {
  if (!revealed) return "Non découvert";
  if (isCurrent) return "Position actuelle";
  if (isCorrupted) return "Corruption active";
  if (node.isConsumed) return "Lieu traversé";
  if (isReachable) return "Accessible";
  return "Inaccessible";
}

export function MobileNodeDetailSheet({ node, isCurrent, isReachable, isCorrupted, canMove, diagnosticsMode = false, onMove, onExamine, onClose }: MobileNodeDetailSheetProps) {
  if (!node) {
    return null;
  }

  const revealed = isMapNodeRevealedForMobile(node);
  const display = getMobileMapNodeDisplay(node, isCorrupted ? [node.id] : []);
  const status = getNarrativeStatus({ node, isCurrent, isReachable, isCorrupted, revealed });
  return (
    <EtherniaCard variant={isCorrupted && revealed ? "danger" : isReachable ? "gold" : "raised"} style={styles.sheet}>
      <View style={styles.headerRow}>
        <View style={[styles.iconFrame, isCorrupted && revealed && styles.iconFrameDanger]}>
          <Text style={styles.icon}>{display.icon}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.kicker}>{status}</Text>
          <Text style={styles.title}>{display.label}</Text>
          {diagnosticsMode ? (
            <Text style={styles.state}>
              {getMapNodeStateLabel({
                isCurrent,
                isReachable,
                isCorrupted,
                isConsumed: Boolean(node.isConsumed),
                bossLocked: false,
              })}
            </Text>
          ) : null}
        </View>
        {onClose ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer le détail du lieu" onPress={onClose} hitSlop={6} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {diagnosticsMode ? <Text style={styles.description}>{getMobileMapNodeDescription(node, isCorrupted ? [node.id] : [])}</Text> : null}

      <View style={styles.actions}>
        {isCurrent && node.type !== "start" ? (
          <EtherniaButton tone={isCorrupted && node.isConsumed ? "danger" : "primary"} onPress={onExamine}>
            {node.isConsumed ? (isCorrupted ? "Fouiller" : "Observer") : "Résoudre"}
          </EtherniaButton>
        ) : null}
        {!isCurrent ? (
          <EtherniaButton disabled={!canMove} onPress={onMove} tone={canMove ? "primary" : "ghost"}>
            {isReachable ? "Avancer" : "Route fermée"}
          </EtherniaButton>
        ) : null}
      </View>
    </EtherniaCard>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: etherniaTheme.spacing.xs,
    paddingVertical: etherniaTheme.spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  iconFrame: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.26)",
  },
  iconFrameDanger: {
    backgroundColor: "rgba(255,94,115,0.12)",
    borderColor: "rgba(255,94,115,0.48)",
  },
  icon: {
    fontSize: 25,
  },
  titleBlock: {
    flex: 1,
  },
  kicker: {
    color: etherniaTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: etherniaTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  state: {
    color: etherniaTheme.colors.textDim,
    marginTop: 3,
    lineHeight: 18,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  closeText: {
    color: etherniaTheme.colors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },
  description: {
    color: etherniaTheme.colors.textDim,
    lineHeight: 17,
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.xs,
  },
});
