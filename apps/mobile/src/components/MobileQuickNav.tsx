import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "../styles/theme";

type MobileQuickNavTarget = "map" | "team" | "inventory" | "run_menu";

type MobileQuickNavProps = {
  current: MobileQuickNavTarget;
  onNavigate: (target: MobileQuickNavTarget) => void;
};

const BASE_ITEMS: Array<{ target: MobileQuickNavTarget; label: string; icon: string }> = [
  { target: "map", label: "Carte", icon: "◇" },
  { target: "team", label: "Héros", icon: "◆" },
  { target: "inventory", label: "Sac", icon: "▣" },
  { target: "run_menu", label: "Run", icon: "☰" },
];

export function MobileQuickNav({ current, onNavigate }: MobileQuickNavProps) {
  const items = BASE_ITEMS;

  return (
    <View style={styles.shell}>
      {items.map((item) => {
        const active = current === item.target;
        return (
          <Pressable
            key={item.target}
            onPress={() => onNavigate(item.target)}
            hitSlop={6}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={[styles.icon, active && styles.textActive]}>{item.icon}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.label, active && styles.textActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "rgba(10,14,25,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(246,196,83,0.18)",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingVertical: 6,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  itemActive: {
    backgroundColor: "rgba(246,196,83,0.16)",
    borderColor: "rgba(246,196,83,0.36)",
  },
  icon: {
    color: mobileTheme.colors.muted,
    fontSize: 16,
    fontWeight: "900",
  },
  label: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
  },
  textActive: {
    color: mobileTheme.colors.accent,
  },
});
