import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { buildRunSummary } from "@/shared/engine/game/runSummary";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import { MobileFeedbackBanner } from "../components/MobileFeedbackBanner";
import { MobileProgressBar } from "../components/MobileProgressBar";
import { EtherniaButton, EtherniaCard, EtherniaHeader, EtherniaScreen, EtherniaStatPill } from "../components/design";
import { ClassIcon } from "../components/ClassIcon";
import { etherniaTheme } from "../styles/etherniaTheme";
import { getVisibleLoreFragments } from "@/shared/data/loreFragments";
import { getOwnedVeilRelics } from "@/shared/engine/game/veilRelics";
import { getClassDisplayName } from "@/shared/engine/game/displayLabels";

type MobileRunMenuScreenProps = {
  run: EtherniaRunSave;
  onResume: () => void;
  onBackToLobby: () => void;
  onOpenInventory: (run: EtherniaRunSave) => void;
  onOpenTeam: (run: EtherniaRunSave) => void;
  onOpenDiagnostics: (run: EtherniaRunSave) => void;
};


export function MobileRunMenuScreen({ run, onResume, onBackToLobby, onOpenInventory, onOpenTeam, onOpenDiagnostics }: MobileRunMenuScreenProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [diagnosticsMode, setDiagnosticsMode] = useState(false);
  const summary = useMemo(() => buildRunSummary(run), [run]);
  const loreFragments = useMemo(() => getVisibleLoreFragments(run), [run]);
  const veilRelics = useMemo(() => getOwnedVeilRelics(run), [run]);
  const deleteSaveAndExit = async () => {
    setDeleting(true);
    await mobileRunSaveSystem.deleteRun();
    setDeleting(false);
    setMessage("Sauvegarde mobile supprimée.");
    onBackToLobby();
  };

  return (
    <EtherniaScreen>
      <EtherniaHeader
        eyebrow="Pause"
        title="Run en cours"
        subtitle={diagnosticsMode ? "Options avancées et sauvegarde." : "Gère ton équipe, ton sac et ta progression."}
        right={<EtherniaButton onPress={onResume} style={styles.resumeButton}>Reprendre</EtherniaButton>}
      />

      <EtherniaCard variant="raised">
        <Text style={styles.sectionTitle}>Progression</Text>
        <View style={styles.summaryGrid}>
          <EtherniaStatPill label="Étage" value={summary.currentFloor} tone="gold" />
          <EtherniaStatPill label="Biome" value={summary.biome} tone="arcane" />
          <EtherniaStatPill label="Héros" value={`${summary.aliveHeroCount}/${summary.heroCount}`} tone="success" />
          <EtherniaStatPill label="Or" value={summary.totalGold} tone="gold" />
          {diagnosticsMode ? <EtherniaStatPill label="Nœuds" value={`${summary.resolvedNodeCount}/${run.nodes.length}`} /> : null}
          {diagnosticsMode ? <EtherniaStatPill label="Corrompus" value={summary.corruptedNodeCount} tone="danger" /> : null}
        </View>
        {diagnosticsMode ? <Text style={styles.meta}>Seed : {summary.runSeed ?? "non défini"}</Text> : null}
        {diagnosticsMode ? (
          <MobileProgressBar
            label={`Corruption niveau ${summary.corruptionLevel}`}
            value={summary.corruptionCharge}
            max={100}
            tone="danger"
          />
        ) : null}
      </EtherniaCard>

      <EtherniaCard>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionGrid}>
          <EtherniaButton onPress={() => onOpenTeam(run)} tone="arcane" style={styles.actionButton}>Équipe</EtherniaButton>
          <EtherniaButton onPress={() => onOpenInventory(run)} tone="secondary" style={styles.actionButton}>Sac</EtherniaButton>
        </View>
        <EtherniaButton onPress={() => setDiagnosticsMode((value) => !value)} tone={diagnosticsMode ? "arcane" : "ghost"}>{diagnosticsMode ? "Masquer options avancées" : "Options avancées"}</EtherniaButton>
        {diagnosticsMode ? <EtherniaButton onPress={() => onOpenDiagnostics(run)} tone="ghost">Analyse de run</EtherniaButton> : null}
        {diagnosticsMode ? <Text style={styles.hint}>Vérifie la sauvegarde, la carte et la stabilité de la run.</Text> : null}
      </EtherniaCard>



      <EtherniaCard>
        <Text style={styles.sectionTitle}>Reliques du Voile</Text>
        <Text style={styles.hint}>Fragments liés à toute la run. Leurs bonus touchent chaque héros.</Text>
        {veilRelics.length ? (
          <View style={styles.relicGrid}>
            {veilRelics.map((relic) => (
              <View key={relic.id} style={styles.relicCard}>
                <Text style={styles.relicIcon}>{relic.icon}</Text>
                <View style={styles.relicTextBlock}>
                  <Text style={styles.relicName}>{relic.name}</Text>
                  <Text style={styles.relicMeta}>{relic.role} · {relic.technical}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>Aucune relique liée pour l’instant.</Text>
        )}
      </EtherniaCard>

      <EtherniaCard>
        <Text style={styles.sectionTitle}>Fragments découverts</Text>
        {loreFragments.map((fragment) => (
          <View key={fragment.id} style={styles.loreRow}>
            <Text style={styles.loreTitle}>{fragment.title}</Text>
            <Text style={styles.loreText}>{fragment.text}</Text>
          </View>
        ))}
      </EtherniaCard>

      <EtherniaCard>
        <Text style={styles.sectionTitle}>Héros</Text>
        {summary.heroes.map((hero) => (
          <View key={hero.id} style={styles.heroRow}>
            <ClassIcon classType={hero.classType} variant="portrait" size="md" active={!hero.isDead} />
            <View style={styles.heroText}>
              <Text style={styles.heroName}>{hero.name}</Text>
              <Text style={styles.heroMeta}>{getClassDisplayName(hero.classType)} · Nv {hero.level} · {hero.gold} or</Text>
            </View>
            <Text style={[styles.heroState, hero.isDead ? styles.heroDead : styles.heroAlive]}>
              {hero.isDead ? "Tombé" : "Vivant"}
            </Text>
          </View>
        ))}
      </EtherniaCard>

      {diagnosticsMode ? (
        <EtherniaCard variant="danger">
          <Text style={styles.sectionTitle}>Sauvegarde</Text>
          <Text style={styles.dangerText}>Supprime la sauvegarde mobile locale et retourne au lobby. Cette action ne peut pas être annulée.</Text>
          <EtherniaButton onPress={() => void deleteSaveAndExit()} disabled={deleting} tone="danger">
            {deleting ? "Suppression..." : "Effacer la sauvegarde"}
          </EtherniaButton>
        </EtherniaCard>
      ) : null}

      <MobileFeedbackBanner message={message} tone="success" />
    </EtherniaScreen>
  );
}
const styles = StyleSheet.create({
  resumeButton: {
    flexGrow: 0,
    minWidth: 112,
  },
  sectionTitle: {
    color: etherniaTheme.colors.text,
    fontSize: etherniaTheme.typography.section,
    fontWeight: "900",
  },
  meta: {
    color: etherniaTheme.colors.textDim,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.sm,
  },
  actionGrid: {
    flexDirection: "row",
    gap: etherniaTheme.spacing.sm,
  },
  actionButton: {
    minHeight: 78,
  },
  hint: {
    color: etherniaTheme.colors.muted,
    lineHeight: 20,
  },
  relicGrid: {
    gap: etherniaTheme.spacing.sm,
  },
  relicCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    backgroundColor: "rgba(245,197,108,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,197,108,0.18)",
  },
  relicIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    color: etherniaTheme.colors.gold,
    fontSize: 22,
    fontWeight: "900",
    backgroundColor: "rgba(245,197,108,0.10)",
  },
  relicTextBlock: {
    flex: 1,
  },
  relicName: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
  },
  relicMeta: {
    color: etherniaTheme.colors.textDim,
    marginTop: 2,
    lineHeight: 18,
    fontSize: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.md,
    paddingVertical: etherniaTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: etherniaTheme.colors.borderSoft,
  },
  heroText: {
    flex: 1,
  },
  heroName: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
  },
  heroMeta: {
    color: etherniaTheme.colors.textDim,
    marginTop: 2,
  },
  heroState: {
    fontWeight: "900",
  },
  heroAlive: {
    color: etherniaTheme.colors.success,
  },
  heroDead: {
    color: etherniaTheme.colors.danger,
  },
  loreRow: {
    paddingVertical: etherniaTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: etherniaTheme.colors.borderSoft,
    gap: 3,
  },
  loreTitle: {
    color: etherniaTheme.colors.gold,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  loreText: {
    color: etherniaTheme.colors.textDim,
    lineHeight: 19,
    fontSize: 13,
  },
  dangerText: {
    color: etherniaTheme.colors.textDim,
    lineHeight: 20,
  },
});
