import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { etherniaTheme } from "../../styles/etherniaTheme";
import { attributeColors, getAttributeTone, type AttributeTone } from "../../styles/statColors";

type LegacyTone = "default" | "gold" | "danger" | "arcane" | "success";
type EtherniaStatPillProps = {
  label: string;
  value: string | number;
  tone?: LegacyTone | AttributeTone;
  style?: StyleProp<ViewStyle>;
};

function resolveTone(label: string, tone: EtherniaStatPillProps["tone"]) {
  if (tone && tone in attributeColors) return attributeColors[tone as AttributeTone];
  const inferred = getAttributeTone(label);
  return inferred ? attributeColors[inferred] : null;
}

export function EtherniaStatPill({ label, value, tone = "default", style }: EtherniaStatPillProps) {
  const attributeTone = resolveTone(label, tone);
  const legacyTone = attributeTone ? "default" : tone;

  return (
    <View
      style={[
        styles.base,
        styles[legacyTone as LegacyTone],
        attributeTone && { backgroundColor: attributeTone.soft, borderColor: attributeTone.border },
        style,
      ]}
    >
      <Text style={[styles.label, attributeTone && { color: attributeTone.color }]}>
        {attributeTone ? `${attributeTone.icon} ` : ""}{label}
      </Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 92,
    paddingHorizontal: etherniaTheme.spacing.sm,
    paddingVertical: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    backgroundColor: etherniaTheme.colors.panelSoft,
    borderColor: etherniaTheme.colors.borderSoft,
  },
  default: {},
  gold: {
    backgroundColor: "rgba(242,193,91,0.13)",
    borderColor: "rgba(242,193,91,0.34)",
  },
  danger: {
    backgroundColor: "rgba(255,100,124,0.12)",
    borderColor: "rgba(255,100,124,0.34)",
  },
  arcane: {
    backgroundColor: "rgba(159,122,234,0.14)",
    borderColor: "rgba(159,122,234,0.34)",
  },
  success: {
    backgroundColor: "rgba(74,222,128,0.12)",
    borderColor: "rgba(74,222,128,0.30)",
  },
  label: {
    color: etherniaTheme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  value: {
    color: etherniaTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
});
