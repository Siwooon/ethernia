import { StyleSheet, View } from "react-native";
import { etherniaTheme } from "../../styles/etherniaTheme";

export type EtherniaMapLinkLayout = {
  id: string;
  x: number;
  y: number;
  length: number;
  angle: number;
  active?: boolean;
  corrupted?: boolean;
  resolved?: boolean;
};

type EtherniaMapLinkProps = {
  link: EtherniaMapLinkLayout;
};

export function EtherniaMapLink({ link }: EtherniaMapLinkProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.linkShell,
        {
          left: link.x,
          top: link.y,
          width: link.length,
          transform: [{ rotate: `${link.angle}rad` }],
        },
      ]}
    >
      <View style={[styles.linkGlow, link.active && styles.linkGlowActive, link.corrupted && styles.linkGlowCorrupted]} />
      <View style={[styles.link, link.active && styles.linkActive, link.resolved && styles.linkResolved, link.corrupted && styles.linkCorrupted]} />
      <View style={[styles.linkCore, link.active && styles.linkCoreActive, link.corrupted && styles.linkCoreCorrupted]} />
    </View>
  );
}

const styles = StyleSheet.create({
  linkShell: {
    position: "absolute",
    height: 16,
    justifyContent: "center",
  },
  linkGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 10,
    borderRadius: 99,
    backgroundColor: "rgba(246, 231, 200, 0.08)",
  },
  linkGlowActive: {
    backgroundColor: "rgba(242, 193, 91, 0.18)",
  },
  linkGlowCorrupted: {
    backgroundColor: "rgba(255, 94, 115, 0.18)",
  },
  link: {
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(246, 231, 200, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(242, 193, 91, 0.12)",
  },
  linkActive: {
    backgroundColor: "rgba(242, 193, 91, 0.58)",
    borderColor: "rgba(242, 193, 91, 0.72)",
  },
  linkResolved: {
    backgroundColor: "rgba(215, 198, 170, 0.13)",
    borderColor: "rgba(215, 198, 170, 0.10)",
  },
  linkCorrupted: {
    backgroundColor: "rgba(255, 94, 115, 0.46)",
    borderColor: "rgba(255, 94, 115, 0.60)",
  },
  linkCore: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 1,
    borderRadius: 99,
    backgroundColor: "rgba(255,247,232,0.16)",
  },
  linkCoreActive: {
    backgroundColor: etherniaTheme.colors.gold,
  },
  linkCoreCorrupted: {
    backgroundColor: etherniaTheme.colors.crimson,
  },
});
