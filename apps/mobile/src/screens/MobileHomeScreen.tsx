import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import type { SavedRunInfo } from "@/shared/engine/game/runSaveSystem";
import { EtherniaButton, EtherniaCard, EtherniaHeader, EtherniaScreen } from "../components/design";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import { isSupabaseCoopConfigured } from "../platform/supabaseCoopClient";
import { normalizePartyCode } from "@/shared/engine/game/coopParty";
import { etherniaTheme } from "../styles/etherniaTheme";

export type MobileHomeGameMode = "solo" | "host" | "join";

type MobileHomeScreenProps = {
  onSelectMode: (mode: MobileHomeGameMode, joinCode?: string) => void;
  onContinueRun: (run: EtherniaRunSave) => void;
};

function formatSavedDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const modeCards: Array<{
  mode: MobileHomeGameMode;
  title: string;
  eyebrow: string;
  text: string;
  badge: string;
}> = [
  {
    mode: "solo",
    title: "Solo",
    eyebrow: "Aventure solo",
    text: "Choisis ton groupe, ouvre une faille et progresse étage par étage.",
    badge: "Simple",
  },
  {
    mode: "host",
    title: "Hôte",
    eyebrow: "Coopération",
    text: "Crée une table et invite d’autres joueurs avec un code.",
    badge: "En ligne",
  },
  {
    mode: "join",
    title: "Invité",
    eyebrow: "Rejoindre",
    text: "Entre le code reçu et rejoins la run en cours.",
    badge: "Code",
  },
];

export function MobileHomeScreen({ onSelectMode, onContinueRun }: MobileHomeScreenProps) {
  const [savedRunInfo, setSavedRunInfo] = useState<SavedRunInfo | null>(null);
  const [loadingSave, setLoadingSave] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const supabaseReady = isSupabaseCoopConfigured();

  const refreshSave = useCallback(async () => {
    setLoadingSave(true);
    try {
      setSavedRunInfo(await mobileRunSaveSystem.getSavedRunInfo());
    } finally {
      setLoadingSave(false);
    }
  }, []);

  useEffect(() => {
    void refreshSave();
  }, [refreshSave]);

  const normalizedJoinCode = normalizePartyCode(joinCode);

  const continueRun = async () => {
    const run = await mobileRunSaveSystem.loadRun();
    if (!run) {
      setFeedback("Aucune sauvegarde valide.");
      await refreshSave();
      return;
    }
    onContinueRun(run);
  };

  return (
    <EtherniaScreen contentStyle={styles.screenContent}>
      <EtherniaHeader
        eyebrow="Roguelike mobile"
        title="Ethernia"
        subtitle="Explore les failles, renforce ton groupe et remonte vers la source."
      />

      <EtherniaCard variant="raised" style={styles.quickStartCard}>
        <Text style={styles.sectionTitle}>Objectif</Text>
        <Text style={styles.quickStartLine}>Forme ton groupe, choisis un chemin sur la carte et survis aux combats.</Text>
        <Text style={styles.quickStartLine}>Chaque victoire donne de l’or, de l’expérience et de nouvelles options.</Text>
      </EtherniaCard>

      {savedRunInfo ? (
        <EtherniaCard variant="gold" style={styles.saveCard}>
          <View style={styles.rowBetween}>
            <View style={styles.flexOne}>
              <Text style={styles.sectionTitle}>Partie en cours</Text>
              <Text style={styles.saveText}>
                Étage {savedRunInfo.currentFloor} · {savedRunInfo.heroCount} héros · {savedRunInfo.currentPlayerName ?? "tour inconnu"}
              </Text>
              <Text style={styles.saveDate}>Sauvegardée le {formatSavedDate(savedRunInfo.savedAt)}</Text>
            </View>
            {loadingSave ? <ActivityIndicator color={etherniaTheme.colors.gold} /> : null}
          </View>
          <EtherniaButton onPress={continueRun}>Continuer</EtherniaButton>
        </EtherniaCard>
      ) : null}

      <View style={styles.modeGrid}>
        {modeCards.map((card) => {
          const disabled = (card.mode === "host" || card.mode === "join") && !supabaseReady;
          return (
            <Pressable
              key={card.mode}
              disabled={disabled}
              onPress={() => {
                if (card.mode === "join") {
                  setFeedback("Entre le code de l’hôte pour rejoindre.");
                  return;
                }
                onSelectMode(card.mode);
              }}
              style={({ pressed }) => [
                styles.modeCard,
                card.mode === "solo" && styles.modeCardSolo,
                card.mode === "host" && styles.modeCardHost,
                card.mode === "join" && styles.modeCardJoin,
                disabled && styles.disabledCard,
                pressed && !disabled && styles.pressedCard,
              ]}
            >
              <View style={styles.modeHeader}>
                <Text style={styles.modeEyebrow}>{card.eyebrow}</Text>
                <Text style={styles.modeBadge}>{disabled ? "À configurer" : card.badge}</Text>
              </View>
              <Text style={styles.modeTitle}>{card.title}</Text>
              <Text style={styles.modeText}>{card.text}</Text>
            </Pressable>
          );
        })}
      </View>

      <EtherniaCard variant="raised" style={styles.joinCard}>
        <Text style={styles.sectionTitle}>Rejoindre</Text>
        <Text style={styles.modeText}>Entre le code donné par l’hôte.</Text>
        <View style={styles.joinRow}>
          <TextInput
            value={joinCode}
            onChangeText={(value) => setJoinCode(normalizePartyCode(value))}
            placeholder="CODE"
            placeholderTextColor={etherniaTheme.colors.muted}
            autoCapitalize="characters"
            maxLength={5}
            style={styles.joinInput}
          />
          <EtherniaButton
            tone="secondary"
            disabled={!supabaseReady || normalizedJoinCode.length < 5}
            onPress={() => onSelectMode("join", normalizedJoinCode)}
          >
            Entrer
          </EtherniaButton>
        </View>
        {!supabaseReady ? <Text style={styles.feedback}>Le mode en ligne n’est pas configuré sur cet appareil.</Text> : null}
      </EtherniaCard>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </EtherniaScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: "center",
  },
  quickStartCard: {
    gap: 6,
  },
  quickStartLine: {
    color: etherniaTheme.colors.textDim,
    fontWeight: "800",
    lineHeight: 18,
  },
  heroCard: {
    minHeight: 205,
    justifyContent: "center",
  },
  heroMark: {
    position: "absolute",
    right: 18,
    top: 8,
    color: "rgba(242,193,91,0.18)",
    fontSize: 86,
    fontWeight: "900",
  },
  statusRow: {
    flexDirection: "row",
    gap: etherniaTheme.spacing.sm,
    marginTop: etherniaTheme.spacing.md,
  },
  statusPill: {
    flex: 1,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  statusLabel: {
    color: etherniaTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusValue: {
    color: etherniaTheme.colors.text,
    marginTop: 3,
    fontWeight: "900",
    fontSize: 12,
  },
  statusReady: {
    color: "#58d68d",
  },
  statusWarn: {
    color: etherniaTheme.colors.gold,
  },
  saveCard: {
    gap: etherniaTheme.spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  flexOne: {
    flex: 1,
  },
  sectionTitle: {
    color: etherniaTheme.colors.text,
    fontSize: etherniaTheme.typography.section,
    fontWeight: "900",
  },
  saveText: {
    color: etherniaTheme.colors.textDim,
    marginTop: 5,
    fontWeight: "800",
  },
  saveDate: {
    color: etherniaTheme.colors.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },
  modeGrid: {
    gap: etherniaTheme.spacing.sm,
  },
  modeCard: {
    minHeight: 116,
    padding: etherniaTheme.spacing.md,
    borderRadius: etherniaTheme.radius.lg,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.055)",
    gap: 6,
  },
  modeCardSolo: {
    borderColor: "rgba(242,193,91,0.32)",
    backgroundColor: "rgba(242,193,91,0.08)",
  },
  modeCardHost: {
    borderColor: "rgba(88,214,141,0.30)",
    backgroundColor: "rgba(88,214,141,0.07)",
  },
  modeCardJoin: {
    borderColor: "rgba(159,122,234,0.34)",
    backgroundColor: "rgba(159,122,234,0.08)",
  },
  disabledCard: {
    opacity: 0.48,
  },
  pressedCard: {
    opacity: 0.86,
    transform: [{ scale: 0.988 }],
  },
  modeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  modeEyebrow: {
    color: etherniaTheme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modeBadge: {
    color: etherniaTheme.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(242,193,91,0.12)",
    overflow: "hidden",
  },
  modeTitle: {
    color: etherniaTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  modeText: {
    color: etherniaTheme.colors.textDim,
    lineHeight: 19,
    fontWeight: "700",
  },
  hubCard: {
    gap: etherniaTheme.spacing.sm,
  },
  hubLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  hubDot: {
    width: 30,
    height: 30,
    borderRadius: 999,
    overflow: "hidden",
    textAlign: "center",
    textAlignVertical: "center",
    color: etherniaTheme.colors.gold,
    backgroundColor: "rgba(242,193,91,0.12)",
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.24)",
    fontWeight: "900",
    fontSize: 11,
  },
  hubText: {
    flex: 1,
    color: etherniaTheme.colors.textDim,
    fontWeight: "800",
    lineHeight: 18,
  },
  helpText: {
    color: etherniaTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },

  joinCard: {
    gap: etherniaTheme.spacing.sm,
  },
  joinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  joinInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: etherniaTheme.spacing.md,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(0,0,0,0.24)",
    color: etherniaTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
  },
  feedback: {
    color: etherniaTheme.colors.gold,
    textAlign: "center",
    fontWeight: "900",
    paddingBottom: etherniaTheme.spacing.md,
  },
});
