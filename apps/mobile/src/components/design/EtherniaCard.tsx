import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { etherniaTheme } from "../../styles/etherniaTheme";

type EtherniaCardProps = {
  children: ReactNode;
  variant?: "default" | "raised" | "danger" | "gold";
  style?: StyleProp<ViewStyle>;
};

export function EtherniaCard({ children, variant = "default", style }: EtherniaCardProps) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: etherniaTheme.radius.lg,
    padding: etherniaTheme.spacing.md,
    borderWidth: 1,
    gap: etherniaTheme.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  default: {
    backgroundColor: etherniaTheme.colors.panel,
    borderColor: etherniaTheme.colors.borderSoft,
  },
  raised: {
    backgroundColor: etherniaTheme.colors.panelRaised,
    borderColor: etherniaTheme.colors.border,
  },
  danger: {
    backgroundColor: "rgba(255,100,124,0.12)",
    borderColor: "rgba(255,100,124,0.36)",
  },
  gold: {
    backgroundColor: "rgba(242,193,91,0.13)",
    borderColor: "rgba(242,193,91,0.38)",
  },
});
