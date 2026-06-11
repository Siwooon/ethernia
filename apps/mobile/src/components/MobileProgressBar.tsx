import { StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "../styles/theme";

export function MobileProgressBar({
  label,
  value,
  max,
  tone = "accent",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "accent" | "danger" | "mana" | "success";
}) {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const width = `${ratio * 100}%` as const;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{Math.max(0, value)}/{safeMax}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width, backgroundColor: toneColors[tone] }]} />
      </View>
    </View>
  );
}

const toneColors = {
  accent: mobileTheme.colors.accent,
  danger: mobileTheme.colors.danger,
  mana: "#8b5cf6",
  success: mobileTheme.colors.success,
};

const styles = StyleSheet.create({
  container: {
    gap: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  label: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  value: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  track: {
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
