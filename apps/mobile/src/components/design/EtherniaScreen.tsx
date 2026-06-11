import { ReactNode } from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { etherniaTheme } from "../../styles/etherniaTheme";

type EtherniaScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function EtherniaScreen({ children, scroll = true, contentStyle }: EtherniaScreenProps) {
  const content = (
    <View style={[styles.content, contentStyle]}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={styles.screen}>{content}</View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: etherniaTheme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: etherniaTheme.spacing.md,
    gap: etherniaTheme.spacing.md,
    overflow: "hidden",
  },
  glowTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(159,122,234,0.18)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(242,193,91,0.10)",
  },
});
