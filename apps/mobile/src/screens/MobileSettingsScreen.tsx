import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MobilePreferences, toggleMobilePreference } from "@/shared/engine/game/mobilePreferences";
import { MobileFeedbackBanner } from "../components/MobileFeedbackBanner";
import { mobilePreferencesStorage } from "../platform/mobilePreferencesStorage";
import { mobileTheme } from "../styles/theme";

type MobileSettingsScreenProps = {
  preferences: MobilePreferences;
  onPreferencesChanged: (preferences: MobilePreferences) => void;
  onClose: () => void;
};

type ToggleKey = keyof Omit<MobilePreferences, "mapDensity">;

const SETTINGS: Array<{
  key: ToggleKey;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    key: "compactMap",
    title: "Carte compacte",
    description: "Réduit les nœuds de la carte pour afficher plus de chemins sur petit écran.",
    icon: "🗺️",
  },
  {
    key: "reduceMotion",
    title: "Réduire les animations",
    description: "Prépare un mode plus sobre pour les téléphones moins puissants ou sensibles aux animations.",
    icon: "🌙",
  },
  {
    key: "showSaveFeedback",
    title: "Feedback de sauvegarde",
    description: "Affiche les messages de sauvegarde et de résolution sur la carte.",
    icon: "💾",
  },
  {
    key: "showDetailedCombatLog",
    title: "Journal de combat détaillé",
    description: "Conserve les détails du combat dans le log mobile. Tu pourras le réduire plus tard pour gagner de la place.",
    icon: "📜",
  },
];

export function MobileSettingsScreen({ preferences, onPreferencesChanged, onClose }: MobileSettingsScreenProps) {
  const [current, setCurrent] = useState(preferences);
  const [message, setMessage] = useState<string | null>(null);

  const persist = async (next: MobilePreferences, feedback: string) => {
    const saved = await mobilePreferencesStorage.save(next);
    setCurrent(saved);
    onPreferencesChanged(saved);
    setMessage(feedback);
  };

  const toggle = async (key: ToggleKey) => {
    const next = toggleMobilePreference(current, key);
    await persist(next, "Préférences mobiles mises à jour.");
  };

  const reset = async () => {
    const restored = await mobilePreferencesStorage.reset();
    setCurrent(restored);
    onPreferencesChanged(restored);
    setMessage("Préférences mobiles réinitialisées.");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Réglages mobile</Text>
          <Text style={styles.title}>Confort & performance</Text>
          <Text style={styles.subtitle}>Ces options sont sauvegardées localement avec AsyncStorage.</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Fermer</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Affichage actuel</Text>
          <Text style={styles.meta}>Densité carte : {current.mapDensity === "compact" ? "compacte" : "confort"}</Text>
          <Text style={styles.meta}>Animations : {current.reduceMotion ? "réduites" : "normales"}</Text>
        </View>

        {SETTINGS.map((setting) => {
          const enabled = Boolean(current[setting.key]);
          return (
            <Pressable key={setting.key} onPress={() => void toggle(setting.key)} style={styles.settingCard}>
              <Text style={styles.settingIcon}>{setting.icon}</Text>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <View style={[styles.toggleTrack, enabled && styles.toggleTrackEnabled]}>
                <View style={[styles.toggleKnob, enabled && styles.toggleKnobEnabled]} />
              </View>
            </Pressable>
          );
        })}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Note</Text>
          <Text style={styles.meta}>
            Cette couche prépare les paramètres partagés web/mobile. Les prochains écrans pourront lire ces préférences sans dépendre de Next.js.
          </Text>
          <Pressable onPress={() => void reset()} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Réinitialiser les préférences</Text>
          </Pressable>
        </View>
      </ScrollView>

      <MobileFeedbackBanner message={message} tone="success" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
    padding: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 3,
  },
  subtitle: {
    color: mobileTheme.colors.muted,
    marginTop: 3,
    lineHeight: 19,
  },
  closeButton: {
    minHeight: mobileTheme.touch.comfortableTarget,
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.accent,
  },
  closeButtonText: {
    color: "#211300",
    fontWeight: "900",
  },
  content: {
    gap: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.xl,
  },
  card: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
    gap: mobileTheme.spacing.sm,
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  meta: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
    minHeight: 92,
  },
  settingIcon: {
    fontSize: 24,
  },
  settingText: {
    flex: 1,
    gap: 3,
  },
  settingTitle: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  settingDescription: {
    color: mobileTheme.colors.muted,
    lineHeight: 19,
  },
  toggleTrack: {
    width: 54,
    height: 30,
    borderRadius: 20,
    padding: 3,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
  },
  toggleTrackEnabled: {
    backgroundColor: "rgba(246,196,83,0.30)",
    borderColor: mobileTheme.colors.border,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.muted,
  },
  toggleKnobEnabled: {
    alignSelf: "flex-end",
    backgroundColor: mobileTheme.colors.accent,
  },
  resetButton: {
    minHeight: mobileTheme.touch.comfortableTarget,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
  },
  resetButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
});
