import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { etherniaTheme } from "../../styles/etherniaTheme";

type EtherniaHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function EtherniaHeader({ eyebrow, title, subtitle, right }: EtherniaHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.md,
  },
  textBlock: {
    flex: 1,
  },
  eyebrow: {
    color: etherniaTheme.colors.gold,
    fontSize: etherniaTheme.typography.caption,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: etherniaTheme.colors.text,
    fontSize: etherniaTheme.typography.title,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: etherniaTheme.colors.textDim,
    marginTop: 4,
    lineHeight: 20,
  },
  right: {
    flexShrink: 0,
  },
});
