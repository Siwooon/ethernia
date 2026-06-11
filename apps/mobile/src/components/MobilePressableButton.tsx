import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { mobileTheme } from "../styles/theme";

export type MobileButtonTone = "primary" | "secondary" | "ghost" | "danger";

export function MobilePressableButton({
  label,
  onPress,
  disabled = false,
  tone = "primary",
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: MobileButtonTone;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        tone === "primary" && styles.primary,
        tone === "secondary" && styles.secondary,
        tone === "ghost" && styles.ghost,
        tone === "danger" && styles.danger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.74}
        style={[styles.text, tone === "primary" && styles.primaryText, disabled && styles.disabledText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: mobileTheme.touch.minimumTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  primary: {
    backgroundColor: mobileTheme.colors.accent,
    borderColor: "rgba(246, 196, 83, 0.70)",
  },
  secondary: {
    backgroundColor: mobileTheme.colors.panelStrong,
    borderColor: mobileTheme.colors.border,
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  danger: {
    backgroundColor: "rgba(248, 113, 113, 0.16)",
    borderColor: "rgba(248, 113, 113, 0.36)",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.44,
  },
  text: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 18,
    includeFontPadding: false,
  },
  primaryText: {
    color: "#241108",
  },
  disabledText: {
    color: mobileTheme.colors.muted,
  },
});
