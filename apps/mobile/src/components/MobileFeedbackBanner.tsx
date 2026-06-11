import { StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "../styles/theme";

export type MobileFeedbackTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<MobileFeedbackTone, { borderColor: string; backgroundColor: string; icon: string }> = {
  info: {
    borderColor: mobileTheme.colors.border,
    backgroundColor: "rgba(246, 196, 83, 0.10)",
    icon: "✦",
  },
  success: {
    borderColor: "rgba(74, 222, 128, 0.38)",
    backgroundColor: "rgba(74, 222, 128, 0.10)",
    icon: "✓",
  },
  warning: {
    borderColor: "rgba(251, 191, 36, 0.42)",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    icon: "!",
  },
  danger: {
    borderColor: "rgba(248, 113, 113, 0.42)",
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    icon: "×",
  },
};

export function MobileFeedbackBanner({
  message,
  tone = "info",
}: {
  message?: string | null;
  tone?: MobileFeedbackTone;
}) {
  if (!message) return null;

  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.container, { borderColor: toneStyle.borderColor, backgroundColor: toneStyle.backgroundColor }]}>
      <Text style={styles.icon}>{toneStyle.icon}</Text>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: mobileTheme.touch.minimumTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    textAlignVertical: "center",
    color: mobileTheme.colors.text,
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  message: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontWeight: "700",
    lineHeight: 18,
  },
});
