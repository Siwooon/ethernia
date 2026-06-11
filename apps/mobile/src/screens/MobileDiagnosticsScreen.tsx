import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import {
  buildMobileRunDiagnostics,
  MobileDiagnosticSeverity,
} from "@/shared/engine/game/mobileRunDiagnostics";
import { validateMobileRun } from "@/shared/engine/game/mobileRunValidator";
import { repairMobileRunSave } from "@/shared/engine/game/mobileRunRepair";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { MobilePressableButton } from "../components/MobilePressableButton";
import { MobileProgressBar } from "../components/MobileProgressBar";
import { mobileTheme } from "../styles/theme";

type MobileDiagnosticsScreenProps = {
  run: EtherniaRunSave;
  onClose: () => void;
  onBackToLobby?: () => void;
  onDeleteSave?: () => Promise<void> | void;
  onRepairRun?: (run: EtherniaRunSave) => Promise<void> | void;
};

function getSeverityStyle(severity: MobileDiagnosticSeverity) {
  switch (severity) {
    case "danger":
      return styles.danger;
    case "warning":
      return styles.warning;
    case "ok":
      return styles.ok;
    case "info":
    default:
      return styles.info;
  }
}

function getSeverityLabel(severity: MobileDiagnosticSeverity) {
  switch (severity) {
    case "danger":
      return "Critique";
    case "warning":
      return "Avertissement";
    case "ok":
      return "OK";
    case "info":
    default:
      return "Info";
  }
}

export function MobileDiagnosticsScreen({
  run,
  onClose,
  onBackToLobby,
  onDeleteSave,
  onRepairRun,
}: MobileDiagnosticsScreenProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);
  const diagnostics = useMemo(() => buildMobileRunDiagnostics(run), [run]);
  const validation = useMemo(() => validateMobileRun(run), [run]);
  const progressTone =
    diagnostics.status === "danger"
      ? "danger"
      : diagnostics.status === "warning"
        ? "accent"
        : "success";

  const repairRun = async () => {
    if (!onRepairRun) return;

    const repair = repairMobileRunSave(run);
    await onRepairRun(repair.state);
    setRepairMessage(
      repair.changed ? repair.logs.join(" ") : "Aucune correction nécessaire.",
    );
  };

  const deleteSave = async () => {
    if (!onDeleteSave) return;

    setIsDeleting(true);
    try {
      await onDeleteSave();
      onBackToLobby?.();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Diagnostic mobile</Text>
          <Text style={styles.title}>{diagnostics.headline}</Text>
          <Text style={styles.subtitle}>
            Contrôle de sauvegarde, carte, équipe, inventaires et cohérence de
            run.
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Retour</Text>
        </Pressable>
      </View>

      <View style={styles.scoreCard}>
        <MobileProgressBar
          label={`Score de stabilité · ${diagnostics.score}/100`}
          value={diagnostics.score}
          max={100}
          tone={progressTone}
        />
        <Text style={styles.scoreHint}>
          Ce score aide à repérer les problèmes avant de préparer une preview
          Android.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.validationCard}>
          <Text style={styles.validationTitle}>Validation avancée</Text>
          <Text style={styles.validationText}>
            {validation.isPlayable
              ? "Aucun blocage critique détecté. La run peut continuer."
              : "La run contient au moins un problème critique."}
          </Text>
          <View style={styles.pillsRow}>
            <View
              style={[
                styles.smallPill,
                validation.criticalCount > 0 ? styles.danger : styles.ok,
              ]}
            >
              <Text style={styles.badgeText}>
                {validation.criticalCount} critique(s)
              </Text>
            </View>
            <View
              style={[
                styles.smallPill,
                validation.warningCount > 0 ? styles.warning : styles.ok,
              ]}
            >
              <Text style={styles.badgeText}>
                {validation.warningCount} avertissement(s)
              </Text>
            </View>
          </View>
          {validation.recommendations.map((recommendation) => (
            <Text key={recommendation} style={styles.recommendation}>
              • {recommendation}
            </Text>
          ))}
          {repairMessage ? (
            <Text style={styles.repairMessage}>{repairMessage}</Text>
          ) : null}
          {onRepairRun && validation.issues.length > 0 ? (
            <MobilePressableButton
              label="Réparer la sauvegarde"
              onPress={repairRun}
              tone="primary"
              style={styles.deleteButton}
            />
          ) : null}
          {!validation.isPlayable && onDeleteSave ? (
            <MobilePressableButton
              label={
                isDeleting ? "Suppression..." : "Effacer la sauvegarde cassée"
              }
              onPress={deleteSave}
              disabled={isDeleting}
              tone="danger"
              style={styles.deleteButton}
            />
          ) : null}
        </View>

        {validation.issues.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Problèmes détectés</Text>
            {validation.issues.map((issue) => (
              <View key={issue.id} style={styles.issueCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleBlock}>
                    <Text style={styles.itemLabel}>{issue.title}</Text>
                    <Text style={styles.itemValue}>
                      {issue.severity === "critical"
                        ? "Critique"
                        : issue.severity === "warning"
                          ? "Avertissement"
                          : "Info"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      issue.severity === "critical"
                        ? styles.danger
                        : issue.severity === "warning"
                          ? styles.warning
                          : styles.info,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {issue.severity === "critical"
                        ? "CRIT"
                        : issue.severity === "warning"
                          ? "WARN"
                          : "INFO"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemDetail}>{issue.detail}</Text>
                {issue.fixHint ? (
                  <Text style={styles.fixHint}>Solution : {issue.fixHint}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <MobileEmptyState
            icon="✅"
            title="Aucun problème avancé"
            text="Les contrôles de sauvegarde, d’équipe, de carte et d’inventaire sont bons."
          />
        )}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Contrôles rapides</Text>
          {diagnostics.items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleBlock}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemValue}>{item.value}</Text>
                </View>
                <View style={[styles.badge, getSeverityStyle(item.severity)]}>
                  <Text style={styles.badgeText}>
                    {getSeverityLabel(item.severity)}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemDetail}>{item.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Prochaine utilisation</Text>
          <Text style={styles.noteText}>
            Garde cet écran pour les contrôles sur téléphone : il permet de
            vérifier rapidement qu’une sauvegarde ou une transition d’étage n’a
            pas cassé la run.
          </Text>
        </View>
      </ScrollView>
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
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },
  subtitle: {
    color: mobileTheme.colors.muted,
    marginTop: 4,
    lineHeight: 20,
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
  scoreCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panelStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
  },
  scoreHint: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
  },
  content: {
    gap: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.xl,
  },
  validationCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panelStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
  },
  validationTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  validationText: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  smallPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  recommendation: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
  },
  repairMessage: {
    color: mobileTheme.colors.accent,
    lineHeight: 20,
    fontWeight: "800",
  },
  deleteButton: {
    marginTop: mobileTheme.spacing.xs,
  },
  sectionBlock: {
    gap: mobileTheme.spacing.sm,
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  itemCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
    gap: mobileTheme.spacing.sm,
  },
  issueCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
    gap: mobileTheme.spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  itemTitleBlock: {
    flex: 1,
  },
  itemLabel: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  itemValue: {
    color: mobileTheme.colors.muted,
    marginTop: 3,
  },
  itemDetail: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
  },
  fixHint: {
    color: mobileTheme.colors.accent,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: "#120a1f",
    fontSize: 12,
    fontWeight: "900",
  },
  ok: {
    backgroundColor: mobileTheme.colors.success,
  },
  warning: {
    backgroundColor: mobileTheme.colors.warning,
  },
  danger: {
    backgroundColor: mobileTheme.colors.danger,
  },
  info: {
    backgroundColor: mobileTheme.colors.mana,
  },
  noteCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderSoft,
    gap: mobileTheme.spacing.xs,
  },
  noteTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  noteText: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
  },
});
