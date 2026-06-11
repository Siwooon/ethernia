import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FLOORS } from "@/shared/data/floors";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { applyPostBossChoice, POST_BOSS_CHOICES, PostBossChoiceId } from "@/shared/engine/game/postBossChoices";
import { getNextVeilRelicCandidate, getOwnedVeilRelics } from "@/shared/engine/game/veilRelics";
import { mobileTheme } from "../styles/theme";

const BIOME_LABELS: Record<EtherniaRunSave["currentFloorBiome"], string> = {
  forest: "Forêt",
  ruins: "Ruines",
  swamp: "Marais",
  crypt: "Crypte",
  mountain: "Montagne",
  cathedral: "Cathédrale",
  cavern: "Caverne",
  ashlands: "Cendres",
};

export function MobileFloorTransitionScreen({
  run,
  title,
  text,
  onContinue,
  onOpenTeam,
}: {
  run: EtherniaRunSave;
  title: string;
  text: string;
  onContinue: (run: EtherniaRunSave) => void;
  onOpenTeam: () => void;
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<PostBossChoiceId>("seal");
  const selectedChoice = useMemo(() => POST_BOSS_CHOICES.find((choice) => choice.id === selectedChoiceId) ?? POST_BOSS_CHOICES[0], [selectedChoiceId]);
  const previewRelic = useMemo(() => getNextVeilRelicCandidate(run, selectedChoiceId), [run, selectedChoiceId]);
  const ownedRelics = useMemo(() => getOwnedVeilRelics(run), [run]);
  const floorDefinition = FLOORS.find((floor) => floor.floor === run.currentFloor);
  const livingHeroes = run.players.filter((player) => !player.isDead && player.stats.hp > 0).length;
  const totalGold = run.players.reduce((sum, player) => sum + player.gold, 0);
  const highestLevel = run.players.reduce((highest, player) => Math.max(highest, player.level), 1);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Passage</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.floor}>{floorDefinition?.label ?? `Étage ${run.currentFloor}`}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{run.currentFloor}</Text>
          <Text style={styles.statLabel}>Étage</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{BIOME_LABELS[run.currentFloorBiome]}</Text>
          <Text style={styles.statLabel}>Zone</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{livingHeroes}/{run.players.length}</Text>
          <Text style={styles.statLabel}>Groupe</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{highestLevel}</Text>
          <Text style={styles.statLabel}>Niveau</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reprise</Text>
        <Text style={styles.cardText}>Les héros tombés reviennent. PV et Mana sont partiellement restaurés.</Text>
        <Text style={styles.cardText}>Or du groupe : {totalGold}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trace du gardien</Text>
        <Text style={styles.cardText}>Choisis ce que le groupe emporte avant la prochaine carte.</Text>
        <View style={styles.choiceGrid}>
          {POST_BOSS_CHOICES.map((choice) => {
            const selected = choice.id === selectedChoiceId;
            return (
              <Pressable
                key={choice.id}
                onPress={() => setSelectedChoiceId(choice.id)}
                style={[styles.choiceCard, selected && styles.choiceCardSelected, styles[`choiceTone_${choice.tone}`]]}
              >
                <Text style={styles.choiceLabel}>{choice.label}</Text>
                <Text style={styles.choiceShort}>{choice.shortText}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.choiceDetail}>{selectedChoice.detail}</Text>
        {previewRelic ? (
          <View style={styles.relicPreviewCard}>
            <View style={styles.relicPreviewHeader}>
              <Text style={styles.relicIcon}>{previewRelic.icon}</Text>
              <View style={styles.relicTextBlock}>
                <Text style={styles.relicName}>{previewRelic.name}</Text>
                <Text style={styles.relicRole}>{previewRelic.role}</Text>
              </View>
            </View>
            <Text style={styles.relicText}>{previewRelic.technical}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reliques du Voile</Text>
        {ownedRelics.length ? (
          <View style={styles.relicList}>
            {ownedRelics.map((relic) => (
              <View key={relic.id} style={styles.ownedRelicPill}>
                <Text style={styles.ownedRelicText}>{relic.icon} {relic.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.cardText}>Aucune relique liée à cette run.</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onOpenTeam} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Équipe</Text>
        </Pressable>
        <Pressable onPress={() => onContinue(applyPostBossChoice(run, selectedChoiceId))} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Continuer</Text>
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
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: "rgba(18, 14, 32, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(245, 197, 108, 0.28)",
  },
  kicker: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },
  floor: {
    color: mobileTheme.colors.muted,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 6,
  },
  text: {
    color: mobileTheme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  statValue: {
    color: mobileTheme.colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  statLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  cardTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  cardText: {
    color: mobileTheme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },

  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  choiceCard: {
    width: "48%",
    minHeight: 82,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  choiceCardSelected: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: "rgba(245,197,108,0.13)",
  },
  choiceTone_safe: {
    borderColor: "rgba(125,211,252,0.34)",
  },
  choiceTone_reward: {
    borderColor: "rgba(245,197,108,0.34)",
  },
  choiceTone_mystery: {
    borderColor: "rgba(196,181,253,0.36)",
  },
  choiceTone_risk: {
    borderColor: "rgba(248,113,113,0.36)",
  },
  choiceLabel: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  choiceShort: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  choiceDetail: {
    color: mobileTheme.colors.accent,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 12,
  },
  relicPreviewCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(125,211,252,0.08)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.24)",
    gap: 8,
  },
  relicPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  relicIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    color: mobileTheme.colors.accent,
    fontSize: 22,
    fontWeight: "900",
    backgroundColor: "rgba(245,197,108,0.12)",
  },
  relicTextBlock: { flex: 1 },
  relicName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  relicRole: {
    color: mobileTheme.colors.muted,
    fontWeight: "800",
    fontSize: 12,
    marginTop: 2,
  },
  relicText: {
    color: mobileTheme.colors.muted,
    lineHeight: 18,
    fontSize: 13,
  },
  relicList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  ownedRelicPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(245,197,108,0.10)",
    borderWidth: 1,
    borderColor: "rgba(245,197,108,0.20)",
  },
  ownedRelicText: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: mobileTheme.colors.accent,
  },
  primaryButtonText: {
    color: "#20130A",
    fontWeight: "900",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
});
