import { StyleSheet, Text, View } from "react-native";
import { MobilePressableButton } from "./MobilePressableButton";
import { mobileTheme } from "../styles/theme";

export function MobileEmptyState({
  icon = "✨",
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.title}>{title}</Text>
      <Text numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.text}>{text}</Text>
      {actionLabel && onAction ? (
        <MobilePressableButton label={actionLabel} onPress={onAction} tone="secondary" style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    justifyContent: "center",
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
    gap: mobileTheme.spacing.sm,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  text: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    alignSelf: "stretch",
    marginTop: mobileTheme.spacing.sm,
  },
});
