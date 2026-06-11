import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { EtherniaTone, etherniaTheme } from "../../styles/etherniaTheme";

type EtherniaButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  tone?: EtherniaTone;
  style?: StyleProp<ViewStyle>;
};

export function EtherniaButton({ children, onPress, disabled = false, tone = "primary", style }: EtherniaButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        styles[tone],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, tone === "primary" ? styles.labelDark : styles.labelLight]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: etherniaTheme.touch.comfortableTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: etherniaTheme.spacing.md,
    paddingVertical: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    flexGrow: 1,
  },
  primary: {
    backgroundColor: etherniaTheme.colors.gold,
    borderColor: "rgba(255,239,188,0.75)",
  },
  secondary: {
    backgroundColor: etherniaTheme.colors.panelSoft,
    borderColor: etherniaTheme.colors.border,
  },
  danger: {
    backgroundColor: "rgba(255,100,124,0.18)",
    borderColor: "rgba(255,100,124,0.45)",
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: etherniaTheme.colors.borderSoft,
  },
  arcane: {
    backgroundColor: "rgba(159,122,234,0.18)",
    borderColor: "rgba(159,122,234,0.42)",
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.42,
  },
  label: {
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  labelDark: {
    color: "#221406",
  },
  labelLight: {
    color: etherniaTheme.colors.text,
  },
});
