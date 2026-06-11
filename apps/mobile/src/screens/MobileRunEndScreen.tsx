import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { buildRunSummary } from "@/shared/engine/game/runSummary";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import { mobileTheme } from "../styles/theme";
import { getClassDisplayName } from "@/shared/engine/game/displayLabels";

export type MobileRunEndOutcome = "victory" | "defeat";

function outcomeCopy(outcome: MobileRunEndOutcome) {
  if (outcome === "victory") {
    return {
      kicker: "Run terminée",
      fallbackTitle: "Victoire finale",
      fallbackText: "Ethernia est sauvée pour cette run. La sauvegarde sera effacée quand tu retourneras au lobby.",
      emoji: "🏆",
    };
  }

  return {
    kicker: "Run échouée",
    fallbackTitle: "Défaite",
    fallbackText: "La corruption engloutit le groupe. La sauvegarde sera effacée quand tu retourneras au lobby.",
    emoji: "💀",
  };
}

export function MobileRunEndScreen({
  outcome,
  run,
  title,
  text,
  onBackToLobby,
}: {
  outcome: MobileRunEndOutcome;
  run: EtherniaRunSave | null;
  title?: string;
  text?: string;
  onBackToLobby: () => void;
}) {
  const [clearingSave, setClearingSave] = useState(false);
  const copy = outcomeCopy(outcome);
  const summary = useMemo(() => (run ? buildRunSummary(run) : null), [run]);

  const clearAndReturn = async () => {
    if (clearingSave) return;

    setClearingSave(true);
    try {
      await mobileRunSaveSystem.deleteRun();
      onBackToLobby();
    } finally {
      setClearingSave(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{copy.emoji}</Text>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        <Text style={styles.title}>{title ?? copy.fallbackTitle}</Text>
        <Text style={styles.text}>{text ?? copy.fallbackText}</Text>

        {summary ? (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{summary.currentFloor}</Text>
                <Text style={styles.statLabel}>Étage</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{summary.highestLevel}</Text>
                <Text style={styles.statLabel}>Niveau max</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{summary.resolvedNodeCount}</Text>
                <Text style={styles.statLabel}>Nœuds résolus</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{summary.corruptionLevel}</Text>
                <Text style={styles.statLabel}>Corruption</Text>
              </View>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Résumé de la run</Text>
              <Text style={styles.summaryLine}>Biome final : {summary.biome}</Text>
              <Text style={styles.summaryLine}>Héros survivants : {summary.aliveHeroCount}/{summary.heroCount}</Text>
              <Text style={styles.summaryLine}>Or total restant : {summary.totalGold}</Text>
              <Text style={styles.summaryLine}>Carte révélée : {summary.discoveredNodeCount}/{run?.nodes.length ?? summary.discoveredNodeCount} nœuds</Text>
              <Text style={styles.summaryLine}>Nœuds corrompus : {summary.corruptedNodeCount}</Text>
              {summary.runSeed ? <Text style={styles.summaryLine}>Seed : {summary.runSeed}</Text> : null}
              {summary.MVP ? (
                <Text style={styles.summaryLine}>MVP : {summary.MVP.name} · {getClassDisplayName(summary.MVP.classType)} niv. {summary.MVP.level}</Text>
              ) : null}
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Héros</Text>
              {summary.heroes.map((hero) => (
                <View key={hero.id} style={styles.heroRow}>
                  <View>
                    <Text style={styles.heroName}>{hero.name}</Text>
                    <Text style={styles.heroMeta}>{getClassDisplayName(hero.classType)} · niv. {hero.level} · XP {hero.xp} · Or {hero.gold}</Text>
                  </View>
                  <Text style={[styles.heroState, hero.isDead ? styles.heroDead : styles.heroAlive]}>
                    {hero.isDead ? "Tombé" : "Survivant"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLine}>Aucun résumé de run disponible.</Text>
          </View>
        )}

        <Pressable onPress={() => void clearAndReturn()} disabled={clearingSave} style={[styles.primaryButton, clearingSave && styles.disabledButton]}>
          {clearingSave ? <ActivityIndicator color="#241108" /> : <Text style={styles.primaryButtonText}>Effacer la sauvegarde et revenir au lobby</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: mobileTheme.spacing.md,
  },
  card: {
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.colors.panelStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.md,
  },
  emoji: {
    fontSize: 42,
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
    fontSize: 30,
    fontWeight: "900",
  },
  text: {
    color: mobileTheme.colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  statCard: {
    width: "48%",
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statValue: {
    color: mobileTheme.colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  summaryBox: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 8,
  },
  summaryTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 2,
  },
  summaryLine: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
    paddingVertical: 6,
  },
  heroName: {
    color: mobileTheme.colors.text,
    fontWeight: "800",
  },
  heroMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  heroState: {
    fontSize: 12,
    fontWeight: "900",
  },
  heroAlive: {
    color: "#86efac",
  },
  heroDead: {
    color: "#fca5a5",
  },
  primaryButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.accent,
    paddingHorizontal: mobileTheme.spacing.md,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#241108",
    fontWeight: "900",
    textAlign: "center",
  },
});
