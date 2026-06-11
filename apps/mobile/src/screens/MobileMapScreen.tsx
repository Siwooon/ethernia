import { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { applyGameAction } from "@/shared/engine/game/gameCommand";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { buildMobileNodeEventPanel, finishMobileTurn, MobileNodeEventPanel, resolveMobileImmediateEvent, resolveMobileNodeChoice } from "@/shared/engine/game/nodeEventEngine";
import { getMapNodeDisplay } from "@/shared/engine/map/mapPresentation";
import { applyCorruptionMutations, expandCorruptionFront, isNodeCorrupted } from "@/shared/engine/map/mapEngine";
import { EventChoiceAction, MapNode } from "@/shared/types/game";
import { getMobileChoiceImpact, getMobileEventKindLabel, MobileChoiceImpactTone } from "@/shared/engine/game/mobileEventPresentation";
import { getCorruptionStage } from "@/shared/engine/game/corruptionEngine";
import { canLocalDeviceControlPlayer, getCoopActionLockMessage, getCoopTurnOwnerLabel } from "@/shared/engine/game/coopParty";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import { MobileCombatLaunch } from "./MobileCombatScreen";
import { MobileMerchantLaunch } from "./MobileMerchantScreen";
import { finishMobileMerchantVisit } from "@/shared/engine/game/mobileMerchantEngine";
import { ClassIcon } from "../components/ClassIcon";
import { getClassPortraitSource } from "../assets/mobileAssets";
import { getBiomeDisplayName, getClassDisplayName } from "@/shared/engine/game/displayLabels";
import { EtherniaButton, EtherniaCard, EtherniaHeader, EtherniaScreen, EtherniaStatPill } from "../components/design";
import { EtherniaMobileMap, MobileNodeDetailSheet } from "../components/map";
import { etherniaTheme } from "../styles/etherniaTheme";
import { mobileTheme } from "../styles/theme";

type MobileMapScreenProps = {
  initialRun: EtherniaRunSave;
  onBackToLobby: () => void;
  onRunChanged?: (run: EtherniaRunSave) => void;
  onStartCombat?: (run: EtherniaRunSave, combat: MobileCombatLaunch) => void;
  onOpenMerchant?: (run: EtherniaRunSave, merchant: MobileMerchantLaunch) => void;
  onOpenInventory?: (run: EtherniaRunSave) => void;
  onOpenTeam?: (run: EtherniaRunSave) => void;
  onOpenRunMenu?: () => void;
};

const GRAPH_NODE_SIZE = 68;

function getChoiceToneStyle(tone: MobileChoiceImpactTone) {
  switch (tone) {
    case "safe":
      return styles.choiceSafe;
    case "reward":
      return styles.choiceReward;
    case "risk":
      return styles.choiceRisk;
    case "danger":
      return styles.choiceDanger;
    case "neutral":
    default:
      return styles.choiceNeutral;
  }
}

export function MobileMapScreen({ initialRun, onBackToLobby, onRunChanged, onStartCombat, onOpenMerchant, onOpenInventory, onOpenTeam, onOpenRunMenu }: MobileMapScreenProps) {
  const [run, setRun] = useState(initialRun);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [eventPanel, setEventPanel] = useState<MobileNodeEventPanel | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [diagnosticsMode, setDiagnosticsMode] = useState(false);

  const currentPlayer = run.players[run.currentPlayerIndex] ?? run.players[0];
  const currentNode = run.nodes.find((node) => node.id === currentPlayer?.currentNode);
  const activeSeatLabel = getCoopTurnOwnerLabel(run.coopSession, currentPlayer?.id);
  const canControlActiveHero = canLocalDeviceControlPlayer(run.coopSession, currentPlayer?.id);
  const actionLockMessage = getCoopActionLockMessage(run.coopSession, currentPlayer?.id);
  const selectedNode = selectedNodeId !== null ? run.nodes.find((node) => node.id === selectedNodeId) ?? null : null;

  const reachableNodeIds = useMemo(() => new Set(currentNode?.neighbors ?? []), [currentNode]);
  const visibleNodeCount = useMemo(
    () => run.nodes.filter((node) => node.visibility !== "hidden").length,
    [run.nodes]
  );
  const currentNodeRequiresAction = Boolean(
    currentNode &&
    currentNode.type !== "start" &&
    !currentNode.isConsumed
  );

  const persistRun = async (nextRun: EtherniaRunSave) => {
    await mobileRunSaveSystem.saveRun(nextRun);
    setRun(nextRun);
    onRunChanged?.(nextRun);
  };

  const moveToNode = async (node: MapNode) => {
    if (!currentPlayer || !currentNode) return;
    if (!canControlActiveHero) {
      setFeedback(actionLockMessage ?? "Ce n’est pas ton tour.");
      return;
    }

    const isCurrent = node.id === currentPlayer.currentNode;
    const isReachable = reachableNodeIds.has(node.id);

    if (isCurrent) {
      setSelectedNodeId(node.id);
      setEventPanel(buildMobileNodeEventPanel(run, node.id));
      return;
    }

    if (currentNodeRequiresAction && currentNode) {
      setSelectedNodeId(currentNode.id);
      setEventPanel(buildMobileNodeEventPanel(run, currentNode.id));
      setFeedback("Résous le lieu actuel avant de prendre une autre route.");
      return;
    }

    if (!isReachable) {
      setSelectedNodeId(node.id);
      setFeedback("Ce nœud n’est pas accessible depuis la position actuelle.");
      return;
    }

    const result = applyGameAction(run, {
      type: "MOVE_PLAYER",
      playerId: currentPlayer.id,
      nodeId: node.id,
      previousNode: currentPlayer.currentNode ?? null,
      revealAroundTarget: true,
    });

    const panel = buildMobileNodeEventPanel(result.state, node.id);
    await persistRun(result.state);
    setSelectedNodeId(node.id);
    setEventPanel(panel);
    setFeedback(null);

    if (panel?.kind === "combat" && panel.autoStart && panel.enemies?.length) {
      onStartCombat?.(result.state, {
        nodeId: panel.nodeId,
        title: panel.title,
        enemies: panel.enemies,
        participantIndexes: panel.participantIndexes,
      });
    }
  };

  const closeEventPanel = () => {
    setEventPanel(null);
  };

  const saveResolution = async (nextRun: EtherniaRunSave, logs: string[] = []) => {
    await persistRun(nextRun);
    if (logs.length > 0) {
      setFeedback(logs.slice(-2).join(" · "));
    }
  };

  const resolveCurrentNodeEvent = async () => {
    if (!selectedNode) return;
    if (!canControlActiveHero) {
      setFeedback(actionLockMessage ?? "Ce n’est pas ton tour.");
      return;
    }
    const resolution = resolveMobileImmediateEvent(run, selectedNode.id);
    setEventPanel(resolution.panel);
    await saveResolution(resolution.state, resolution.logs);

    if (resolution.panel?.kind === "combat" && resolution.panel.autoStart && resolution.panel.enemies?.length) {
      onStartCombat?.(resolution.state, {
        nodeId: resolution.panel.nodeId,
        title: resolution.panel.title,
        enemies: resolution.panel.enemies,
        participantIndexes: resolution.panel.participantIndexes,
      });
    }
  };

  const chooseEventAction = async (choiceId: EventChoiceAction) => {
    if (!eventPanel) return;
    if (!canControlActiveHero) {
      setFeedback(actionLockMessage ?? "Ce n’est pas ton tour.");
      return;
    }
    const resolution = resolveMobileNodeChoice(run, eventPanel, choiceId);
    const nextActivePlayer = resolution.state.players[resolution.state.currentPlayerIndex];

    setEventPanel(resolution.panel);
    if (choiceId === "retreat" && nextActivePlayer?.currentNode !== undefined) {
      setSelectedNodeId(nextActivePlayer.currentNode);
    }
    await saveResolution(resolution.state, resolution.logs);

    if (resolution.panel?.kind === "combat" && resolution.panel.autoStart && resolution.panel.enemies?.length) {
      onStartCombat?.(resolution.state, {
        nodeId: resolution.panel.nodeId,
        title: resolution.panel.title,
        enemies: resolution.panel.enemies,
        participantIndexes: resolution.panel.participantIndexes,
      });
    }
  };

  const skipMerchantVisit = async () => {
    if (!eventPanel || eventPanel.kind !== "merchant") return;
    if (!canControlActiveHero) {
      setFeedback(actionLockMessage ?? "Ce n’est pas ton tour.");
      return;
    }
    const result = finishMobileMerchantVisit(run, eventPanel.nodeId);
    setEventPanel(null);
    await saveResolution(result.state, result.logs.length > 0 ? result.logs : ["Le marchand plie camp."]);
  };

  const endTurnFromMessage = async () => {
    if (!currentPlayer) return;
    if (!canControlActiveHero) {
      setFeedback(actionLockMessage ?? "Ce n’est pas ton tour.");
      return;
    }
    const ended = finishMobileTurn(run, currentPlayer.currentNode);
    setEventPanel(null);
    await saveResolution(ended.state, ended.logs.length > 0 ? ended.logs : ["Tour terminé."]);
  };

  const selectedNodeCorrupted = selectedNode ? isNodeCorrupted(selectedNode, run.corruptedNodeIds) : false;
  const selectedNodeReachable = selectedNode ? reachableNodeIds.has(selectedNode.id) : false;
  const selectedNodeCurrent = selectedNode?.id === currentPlayer?.currentNode;
  const canMoveToSelectedNode = Boolean(selectedNode && !selectedNodeCurrent && selectedNodeReachable && !currentNodeRequiresAction);
  const hasDeadAlly = run.players.some((player) => player.isDead || player.stats.hp <= 0);
  const corruptedVisibleCount = useMemo(
    () => run.nodes.filter((node) => node.visibility !== "hidden" && isNodeCorrupted(node, run.corruptedNodeIds)).length,
    [run.nodes, run.corruptedNodeIds]
  );
  const runObjective = useMemo(() => {
    if (!currentPlayer || !currentNode) {
      return { title: "Objectif", detail: "Reprends ou lance une run depuis le menu." };
    }

    if (currentNodeRequiresAction && currentNode.type !== "start") {
      return {
        title: "Objectif actuel",
        detail: "Résous ce lieu avant de choisir une nouvelle route.",
      };
    }

    const hasReachableBoss = run.nodes.some((node) => reachableNodeIds.has(node.id) && (node.kind === "boss" || node.eventType === "boss"));
    if (hasReachableBoss) {
      return { title: "Objectif actuel", detail: "Prépare-toi, puis affronte le gardien de l’étage." };
    }

    if (run.currentFloorStatues > 0) {
      return {
        title: "Objectif actuel",
        detail: `${run.currentFloorStatues} statuette${run.currentFloorStatues > 1 ? "s" : ""} récupérée${run.currentFloorStatues > 1 ? "s" : ""}. Avance vers le boss.`,
      };
    }

    return { title: "Objectif actuel", detail: "Choisis une route ouverte. Cherche butin, repos ou statuette avant le boss." };
  }, [currentNode, currentNodeRequiresAction, currentPlayer, reachableNodeIds, run.currentFloorStatues, run.nodes]);
  const corruptionCoverage = run.nodes.length > 0 ? Math.round((run.corruptedNodeIds.length / run.nodes.length) * 100) : 0;
  const corruptionStage = getCorruptionStage(run.corruptionLevel, run.corruptionCharge);
  const setDiagnosticsCorruption = async (params: { level?: number; charge?: number; corruptedNodeIds?: number[]; message: string }) => {
    const nextLevel = Math.max(0, params.level ?? run.corruptionLevel);
    const nextCharge = Math.max(0, Math.min(99, params.charge ?? run.corruptionCharge));
    const nextCorruptedNodeIds = Array.from(new Set(params.corruptedNodeIds ?? run.corruptedNodeIds));
    const nextRun: EtherniaRunSave = {
      ...run,
      corruptionLevel: nextLevel,
      corruptionCharge: nextCharge,
      corruptedNodeIds: nextCorruptedNodeIds,
      nodes: applyCorruptionMutations({
        nodes: run.nodes,
        corruptedNodeIds: nextCorruptedNodeIds,
        corruptionLevel: nextLevel,
        corruptionCharge: nextCharge,
      }),
    };
    await persistRun(nextRun);
    setFeedback(params.message);
  };

  const addDiagnosticsCorruptionCharge = async (amount: number) => {
    const total = run.corruptionCharge + amount;
    const nextLevel = Math.max(0, run.corruptionLevel + Math.floor(total / 100));
    const nextCharge = ((total % 100) + 100) % 100;
    await setDiagnosticsCorruption({
      level: nextLevel,
      charge: nextCharge,
      message: amount >= 0 ? `Contrôle : +${amount} corruption.` : `Contrôle : ${amount} corruption.`,
    });
  };

  const expandDiagnosticsCorruption = async (steps: number) => {
    const seedIds = run.corruptedNodeIds.length > 0
      ? run.corruptedNodeIds
      : currentNode && currentNode.type !== "start"
        ? [currentNode.id]
        : run.nodes.filter((node) => node.type !== "start").slice(0, 1).map((node) => node.id);
    await setDiagnosticsCorruption({
      corruptedNodeIds: expandCorruptionFront(run.nodes, seedIds, steps),
      message: `Contrôle : front de corruption étendu de ${steps} cran${steps > 1 ? "s" : ""}.`,
    });
  };

  const toggleDiagnosticsSelectedCorruption = async () => {
    if (!selectedNode || selectedNode.type === "start") {
      setFeedback("Contrôle : sélectionne un nœud non départ à corrompre ou purifier.");
      return;
    }
    const corrupted = isNodeCorrupted(selectedNode, run.corruptedNodeIds);
    await setDiagnosticsCorruption({
      corruptedNodeIds: corrupted
        ? run.corruptedNodeIds.filter((nodeId) => nodeId !== selectedNode.id)
        : [...run.corruptedNodeIds, selectedNode.id],
      message: corrupted ? "Contrôle : nœud sélectionné purifié." : "Contrôle : nœud sélectionné corrompu.",
    });
  };

  return (
    <EtherniaScreen scroll={false} contentStyle={styles.screenContent}>
      <EtherniaHeader
        title={`Étage ${run.currentFloor} · ${getBiomeDisplayName(run.currentFloorBiome)}`}
        right={
          <Pressable onPress={onOpenRunMenu ?? onBackToLobby} style={styles.menuOrb}>
            <Text style={styles.menuOrbText}>☰</Text>
          </Pressable>
        }
      />

      <EtherniaCard variant="raised" style={styles.heroPanelV2}>
        <View style={styles.heroTitleRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroKicker}>Tour actif</Text>
            <Text style={styles.heroNameV2}>{currentPlayer?.name ?? "Héros inconnu"}</Text>
            <Text style={styles.heroMetaV2}>{currentPlayer ? getClassDisplayName(currentPlayer.classType) : "Classe ?"} · {currentNode ? getMapNodeDisplay(currentNode).label : "Position inconnue"}</Text>
            <Text style={styles.heroMetaV2}>Tour : {activeSeatLabel}</Text>
          </View>
          <View style={styles.heroRightBlock}>
            {currentPlayer ? (
              <View style={styles.heroPortraitFrame}>
                <Image
                  source={getClassPortraitSource(currentPlayer.classType)}
                  style={styles.heroPortraitImage}
                  resizeMode="cover"
                />
                <View style={styles.heroPortraitShade} />
                <View style={styles.heroPortraitBadge}>
                  <ClassIcon classType={currentPlayer.classType} variant="state" size="sm" active />
                </View>
              </View>
            ) : (
              <Text style={styles.heroIconV2}>✦</Text>
            )}
          </View>
        </View>
        {diagnosticsMode ? (
          <View style={styles.statGrid}>
            <EtherniaStatPill label="Carte" value={`${visibleNodeCount}/${run.nodes.length}`} tone="gold" />
            <EtherniaStatPill label="Corr." value={`N${run.corruptionLevel} · ${run.corruptionCharge}/100`} tone="danger" />
          </View>
        ) : null}
      </EtherniaCard>

      <View style={styles.objectiveBanner}>
        <Text style={styles.objectiveKicker}>{runObjective.title}</Text>
        <Text style={styles.objectiveText}>{runObjective.detail}</Text>
      </View>

      {feedback ? (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      {!canControlActiveHero && actionLockMessage ? (
        <View style={styles.turnLockBanner}>
          <Text style={styles.turnLockText}>🔒 {actionLockMessage}</Text>
        </View>
      ) : null}

      {diagnosticsMode ? (
        <EtherniaCard style={styles.diagnosticsPanel}>
          <Text style={styles.diagnosticsTitle}>Contrôles de corruption</Text>
          <Text style={styles.diagnosticsMeta}>{corruptionStage.shortLabel} · niveau {run.corruptionLevel} · charge {run.corruptionCharge}/100 · {run.corruptedNodeIds.length}/{run.nodes.length} nœuds ({corruptionCoverage}%) · visibles {corruptedVisibleCount}</Text>
          <Text style={styles.diagnosticsMeta}>{corruptionStage.description}</Text>
          <View style={styles.diagnosticsGrid}>
            <EtherniaButton tone="ghost" onPress={() => void addDiagnosticsCorruptionCharge(10)}>+10 charge</EtherniaButton>
            <EtherniaButton tone="ghost" onPress={() => void addDiagnosticsCorruptionCharge(25)}>+25 charge</EtherniaButton>
            <EtherniaButton tone="ghost" onPress={() => void addDiagnosticsCorruptionCharge(-10)}>-10 charge</EtherniaButton>
            <EtherniaButton tone="secondary" onPress={() => void setDiagnosticsCorruption({ level: 0, charge: 0, corruptedNodeIds: [], message: "Contrôle : corruption remise à zéro." })}>Reset</EtherniaButton>
            <EtherniaButton tone="arcane" onPress={() => void setDiagnosticsCorruption({ charge: 99, message: "Contrôle : charge placée à 99/100." })}>Charge 99</EtherniaButton>
            <EtherniaButton tone="arcane" onPress={() => void setDiagnosticsCorruption({ level: 1, charge: 50, message: "Contrôle : palier Souillure." })}>Souillure</EtherniaButton>
            <EtherniaButton tone="arcane" onPress={() => void setDiagnosticsCorruption({ level: 3, charge: 0, message: "Contrôle : palier Rupture." })}>Rupture</EtherniaButton>
            <EtherniaButton tone="danger" onPress={() => void expandDiagnosticsCorruption(1)}>Étendre x1</EtherniaButton>
            <EtherniaButton tone="danger" onPress={() => void expandDiagnosticsCorruption(2)}>Étendre x2</EtherniaButton>
            <EtherniaButton tone="secondary" onPress={() => void toggleDiagnosticsSelectedCorruption()}>Nœud sélectionné</EtherniaButton>
          </View>
        </EtherniaCard>
      ) : null}

      <View style={styles.mapAndActions}>
        <View style={styles.mapViewport}>
          <EtherniaMobileMap
            nodes={run.nodes}
            currentNodeId={currentPlayer?.currentNode ?? null}
            selectedNodeId={selectedNodeId}
            reachableNodeIds={reachableNodeIds}
            corruptedNodeIds={run.corruptedNodeIds}
            onSelectNode={(node) => {
              if (currentNodeRequiresAction && currentNode && node.id !== currentNode.id) {
                setSelectedNodeId(currentNode.id);
                setEventPanel(buildMobileNodeEventPanel(run, currentNode.id));
                setFeedback("Résous le lieu actuel avant de prendre une autre route.");
                return;
              }
              setSelectedNodeId(node.id);
            }}
            biome={run.currentFloorBiome}
            diagnosticsMode={diagnosticsMode}
            heroes={run.players.map((player) => ({ playerId: player.id, name: player.name, classType: player.classType, currentNode: player.currentNode }))}
            activePlayerId={currentPlayer?.id ?? null}
          />

          <View style={styles.mapActionDock}>
      {!eventPanel ? (
        <MobileNodeDetailSheet
          node={selectedNode}
          isCurrent={Boolean(selectedNodeCurrent)}
          isReachable={selectedNodeReachable}
          isCorrupted={selectedNodeCorrupted}
          canMove={canMoveToSelectedNode}
          onMove={() => selectedNode ? void moveToNode(selectedNode) : undefined}
          onExamine={() => void resolveCurrentNodeEvent()}
          diagnosticsMode={diagnosticsMode}
          onClose={() => setSelectedNodeId(null)}
        />
      ) : null}

          </View>
        </View>
      </View>

      <Modal transparent visible={Boolean(eventPanel)} animationType="slide" onRequestClose={closeEventPanel}>
        <View style={styles.eventModalBackdrop}>
          <Pressable style={styles.eventModalScrim} onPress={closeEventPanel} />
          {eventPanel ? (
            <View style={styles.eventSheet}>
          <View style={styles.eventHeader}>
            <View style={styles.eventHeaderText}>
              <Text style={styles.eventKicker}>{getMobileEventKindLabel(eventPanel)}</Text>
              <Text style={styles.eventTitle}>{eventPanel.title}</Text>
            </View>
            <Pressable onPress={closeEventPanel} style={styles.smallGhostButton}>
              <Text style={styles.smallGhostButtonText}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.eventPanelBody} contentContainerStyle={styles.eventPanelBodyContent} showsVerticalScrollIndicator={diagnosticsMode}>
          <Text style={styles.eventText}>{eventPanel.text}</Text>

          {eventPanel.kind === "combat" ? (
            <View style={styles.eventBox}>
              <Text style={styles.eventBoxTitle}>Combat</Text>
              {diagnosticsMode ? (
                <Text style={styles.eventText}>
                  Participants : {(eventPanel.participantIndexes?.length ?? 0) || 1} · Ennemis : {eventPanel.enemies?.map((enemy) => enemy.name).join(", ") || "?"}
                </Text>
              ) : null}
              <Pressable
                disabled={!canControlActiveHero}
                onPress={() => {
                  if (!canControlActiveHero) {
                    setFeedback(actionLockMessage ?? "Ce n’est pas ton tour.");
                    return;
                  }
                  if (!eventPanel.enemies?.length) return;
                  onStartCombat?.(run, {
                    nodeId: eventPanel.nodeId,
                    title: eventPanel.title,
                    enemies: eventPanel.enemies,
                    participantIndexes: eventPanel.participantIndexes,
                  });
                }}
                style={[styles.primaryButton, !canControlActiveHero && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>Lancer le combat</Text>
              </Pressable>
            </View>
          ) : null}

          {eventPanel.kind === "merchant" ? (
            <View style={styles.eventBox}>
              <Text style={styles.eventBoxTitle}>Marchand</Text>
              {diagnosticsMode ? <Text style={styles.eventText}>Marchand : {eventPanel.merchantType ?? "inconnu"}</Text> : null}
              <View style={styles.merchantActionRow}>
                <Pressable
                  disabled={!canControlActiveHero}
                  onPress={() => {
                    if (!canControlActiveHero) {
                      setFeedback(actionLockMessage ?? "Ce n’est pas ton tour.");
                      return;
                    }
                    onOpenMerchant?.(run, {
                    nodeId: eventPanel.nodeId,
                    title: eventPanel.title,
                    merchantType: eventPanel.merchantType,
                  });
                  }}
                  style={[styles.primaryButton, !canControlActiveHero && styles.disabledButton]}
                >
                  <Text style={styles.primaryButtonText}>Boutique</Text>
                </Pressable>
                <Pressable disabled={!canControlActiveHero} onPress={() => void skipMerchantVisit()} style={[styles.secondaryButton, !canControlActiveHero && styles.disabledButton]}>
                  <Text style={styles.secondaryButtonText}>Passer</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {eventPanel.choices?.length ? (
            <View style={styles.choiceList}>
              {eventPanel.choices.map((choice) => {
                const impact = getMobileChoiceImpact({ choice, panel: eventPanel, player: currentPlayer, hasDeadAlly });
                const disabled = Boolean(impact.disabledReason);

                return (
                  <Pressable
                    key={choice.id}
                    onPress={() => void chooseEventAction(choice.id)}
                    disabled={disabled || !canControlActiveHero}
                    style={[
                      styles.choiceButton,
                      getChoiceToneStyle(impact.tone),
                      (disabled || !canControlActiveHero) && styles.choiceButtonDisabled,
                    ]}
                  >
                    <View style={styles.choiceHeaderRow}>
                      <Text style={styles.choiceIcon}>{impact.icon}</Text>
                      <View style={styles.choiceHeaderText}>
                        <Text style={styles.choiceLabel}>{choice.label}</Text>
                        <Text style={styles.choiceSummary}>{impact.summary}</Text>
                      </View>
                    </View>
                    <Text style={styles.choiceDescription}>{choice.description}</Text>
                    {diagnosticsMode && impact.details.length > 0 ? (
                      <View style={styles.impactList}>
                        {impact.details.map((detail) => (
                          <Text key={detail} style={styles.impactText}>• {detail}</Text>
                        ))}
                      </View>
                    ) : null}
                    {impact.disabledReason ? <Text style={styles.choiceDisabledText}>{impact.disabledReason}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {eventPanel.kind === "message" ? (
            <Pressable
              onPress={() => eventPanel.turnResolved ? closeEventPanel() : void endTurnFromMessage()}
              disabled={!eventPanel.turnResolved && !canControlActiveHero}
              style={[styles.secondaryButton, !eventPanel.turnResolved && !canControlActiveHero && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>{eventPanel.turnResolved ? "Continuer" : "Terminer le tour"}</Text>
            </Pressable>
          ) : null}
          </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

    </EtherniaScreen>
  );
}

const styles = StyleSheet.create({

  menuOrb: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,193,91,0.14)",
    borderWidth: 1,
    borderColor: etherniaTheme.colors.border,
  },
  menuOrbText: {
    color: etherniaTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.sm,
  },
  quickActionsCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: etherniaTheme.spacing.sm,
  },
  quickHint: {
    flex: 1,
    color: etherniaTheme.colors.textDim,
    fontSize: 12,
    fontWeight: "800",
  },
  heroPanelV2: {
    gap: 4,
    paddingVertical: 10,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.md,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroKicker: {
    color: etherniaTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroNameV2: {
    color: etherniaTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  heroMetaV2: {
    color: etherniaTheme.colors.textDim,
    lineHeight: 17,
    marginTop: 2,
    fontSize: 12,
  },
  heroIconV2: {
    color: etherniaTheme.colors.gold,
    fontSize: 34,
    fontWeight: "900",
  },
  heroPortraitFrame: {
    width: 66,
    height: 66,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.34)",
  },
  heroPortraitImage: {
    width: "100%",
    height: "100%",
  },
  heroPortraitShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
    backgroundColor: "rgba(7,10,18,0.26)",
  },
  heroPortraitBadge: {
    position: "absolute",
    right: 3,
    bottom: 3,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.xs,
  },
  heroRightBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  mapAndActions: {
    flex: 1,
    flexBasis: 0,
    minHeight: 0,
  },
  mapViewport: {
    flex: 1,
    minHeight: 0,
    alignSelf: "stretch",
    position: "relative",
  },
  mapActionDock: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    justifyContent: "flex-end",
  },
  diagnosticsPanel: {
    gap: etherniaTheme.spacing.xs,
    borderColor: "rgba(103,232,249,0.35)",
    maxHeight: 130,
  },
  diagnosticsTitle: {
    color: etherniaTheme.colors.arcane,
    fontSize: 15,
    fontWeight: "900",
  },
  diagnosticsMeta: {
    color: etherniaTheme.colors.textDim,
    lineHeight: 16,
    fontSize: 11,
  },
  diagnosticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.sm,
  },
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  screenContent: {
    paddingHorizontal: mobileTheme.spacing.sm,
    paddingTop: mobileTheme.spacing.sm,
    paddingBottom: 10,
    gap: 8,
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  headerActions: {
    gap: mobileTheme.spacing.xs,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  backButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  inventoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(246,196,83,0.16)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  inventoryButtonText: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
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
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3,
  },
  heroPanel: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panelStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: 5,
  },
  heroName: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  heroMeta: {
    color: mobileTheme.colors.muted,
    lineHeight: 19,
  },
  mapFrame: {
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: "rgba(8,12,24,0.76)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.20)",
    padding: mobileTheme.spacing.sm,
    gap: mobileTheme.spacing.xs,
  },
  mapHint: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  mapScroll: {
    flexGrow: 0,
    maxHeight: 430,
    borderRadius: mobileTheme.radius.lg,
  },
  graphScrollContent: {
    paddingRight: mobileTheme.spacing.md,
  },
  graphVerticalContent: {
    paddingBottom: mobileTheme.spacing.sm,
  },
  graphCanvas: {
    position: "relative",
    minWidth: 320,
    minHeight: 260,
  },
  graphEdge: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(246,196,83,0.28)",
  },
  graphNode: {
    position: "absolute",
    width: GRAPH_NODE_SIZE,
    height: GRAPH_NODE_SIZE,
    borderRadius: 18,
  },
  mapContent: {
    paddingVertical: mobileTheme.spacing.sm,
    paddingRight: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.sm,
  },
  column: {
    gap: mobileTheme.spacing.sm,
    justifyContent: "center",
  },
  emptyLane: {
    width: GRAPH_NODE_SIZE,
    height: GRAPH_NODE_SIZE,
  },
  node: {
    width: GRAPH_NODE_SIZE,
    height: GRAPH_NODE_SIZE,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    padding: 6,
  },
  nodeDefault: {
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  nodeCurrent: {
    borderColor: "#c084fc",
    backgroundColor: "rgba(192,132,252,0.22)",
  },
  nodeReachable: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: "rgba(246,196,83,0.16)",
  },
  nodeCorrupted: {
    borderColor: "#f87171",
    backgroundColor: "rgba(248,113,113,0.18)",
  },
  nodeConsumed: {
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
    opacity: 0.72,
  },
  nodeSelected: {
    transform: [{ scale: 1.05 }],
  },
  nodeIcon: {
    fontSize: 24,
  },
  nodeLabel: {
    color: mobileTheme.colors.text,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
  },
  nodeState: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  legendText: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  detailPanel: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(22, 16, 34, 0.92)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  detailIcon: {
    fontSize: 34,
  },
  detailTitleBlock: {
    flex: 1,
  },
  detailTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  detailSubtitle: {
    color: mobileTheme.colors.muted,
    marginTop: 3,
  },
  detailDescription: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
  },
  warningText: {
    color: "#fecaca",
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  eventModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  eventModalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(2, 1, 8, 0.46)",
  },
  eventSheet: {
    maxHeight: "82%",
    marginHorizontal: 10,
    marginBottom: 14,
    padding: mobileTheme.spacing.md,
    paddingBottom: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: "rgba(25, 17, 39, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.26)",
    gap: mobileTheme.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  eventHeaderText: {
    flex: 1,
  },
  eventPanelBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  eventPanelBodyContent: {
    gap: mobileTheme.spacing.sm,
    paddingBottom: 24,
  },
  eventKicker: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  eventTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 1,
  },
  eventText: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
    fontSize: 14,
  },
  smallGhostButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  smallGhostButtonText: {
    color: mobileTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  eventBox: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 5,
  },
  eventBoxTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  merchantActionRow: {
    flexDirection: "row",
    gap: mobileTheme.spacing.sm,
  },
  choiceList: {
    gap: mobileTheme.spacing.sm,
  },
  choiceButton: {
    minHeight: 58,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(246,196,83,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.24)",
  },

  choiceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
    marginBottom: 4,
  },
  choiceIcon: {
    fontSize: 22,
  },
  choiceHeaderText: {
    flex: 1,
  },
  choiceSummary: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  impactList: {
    marginTop: 6,
    gap: 2,
  },
  impactText: {
    color: mobileTheme.colors.muted,
    lineHeight: 18,
    fontSize: 12,
  },
  choiceSafe: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.24)",
  },
  choiceReward: {
    backgroundColor: "rgba(246,196,83,0.13)",
    borderColor: "rgba(246,196,83,0.28)",
  },
  choiceRisk: {
    backgroundColor: "rgba(251,146,60,0.13)",
    borderColor: "rgba(251,146,60,0.28)",
  },
  choiceDanger: {
    backgroundColor: "rgba(248,113,113,0.13)",
    borderColor: "rgba(248,113,113,0.30)",
  },
  choiceNeutral: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  choiceButtonDisabled: {
    opacity: 0.45,
  },
  choiceDisabledText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  choiceLabel: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    marginBottom: 3,
  },
  choiceDescription: {
    color: mobileTheme.colors.muted,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.accent,
  },
  primaryButtonText: {
    color: "#211405",
    fontWeight: "900",
  },
  objectiveBanner: {
    marginTop: -2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.28)",
    backgroundColor: "rgba(18, 22, 35, 0.86)",
    gap: 2,
  },
  objectiveKicker: {
    color: etherniaTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  objectiveText: {
    color: etherniaTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  feedbackBanner: {
    marginTop: -2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.25)",
    backgroundColor: "rgba(8, 18, 28, 0.82)",
  },
  feedbackText: {
    color: etherniaTheme.colors.arcane,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
  turnLockBanner: {
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.26)",
    backgroundColor: "rgba(33, 24, 42, 0.82)",
  },
  turnLockText: {
    color: etherniaTheme.colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.45,
  },
  emptyText: {
    color: mobileTheme.colors.muted,
    fontStyle: "italic",
  },
  feedback: {
    color: mobileTheme.colors.accent,
    textAlign: "center",
    fontWeight: "800",
    paddingBottom: mobileTheme.spacing.sm,
  },
});
