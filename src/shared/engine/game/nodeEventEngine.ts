import { EventResult, resolveNodeEvent } from "@/shared/lib/eventSystem";
import { addMapEffect, applyEndTurnMapEffects, removeMapEffect } from "@/shared/lib/mapEffects";
import { buffPlayerStats } from "@/shared/lib/gameProgression";
import { EtherniaRunSave } from "./gameTypes";
import { CORRUPTION_CHARGE_MAX, REQUIRED_STATUES, shouldExpandFloorCorruption } from "./gameState";
import { applyCorruptionChargeToState, getCorruptionStage } from "./corruptionEngine";
import { getNextActivePlayerIndex } from "./turnEngine";
import { reviveDeadAllyFromShrine } from "./playerLifecycle";
import { createEnemiesForInteractionNode, getAlivePlayerIndexesAtNode, getNodeInteractionPrompt } from "./nodeInteractionEngine";
import { applyCorruptionMutations, canOfferCorruptedReturnEvent, expandCorruptionFront, isMerchantNode, isNodeCorrupted, markNodeResolved, markNodeRevisited, purifyNode, requiresNodeInteractionChoice } from "@/shared/engine/map/mapEngine";
import { createEnemyFromNode } from "@/shared/lib/enemies";
import { createScopedRandom, randomChance } from "@/shared/platform/random";
import { buildMobileCombatEncounter } from "./mobileCombatEncounterEngine";
import { getMobileForgePreview, upgradeMobileEquipmentAtForge } from "./mobileInventoryEngine";
import { applyVeilRelicToRun, getNextVeilRelicCandidate } from "./veilRelics";
import { Enemy, EquipmentSlot, EventChoice, EventChoiceAction, MapEffectType, MapNode, Player, Stats } from "@/shared/types/game";
import { applyRewardBundleToPlayer, buildRandomSearchReward, buildTreasureForcedReward, buildTreasureSafeReward, describeRewardBundle } from "@/shared/engine/rewards/rewardEngine";
import { getCorruptionStepPressure } from "./mobileRunBalance";

export type MobileNodeEventKind = "message" | "choice" | "combat" | "merchant" | "empty" | "game_over";

export type MobileNodeEventPanel = {
  kind: MobileNodeEventKind;
  nodeId: number;
  title: string;
  text: string;
  choices?: EventChoice[];
  choiceType?: "statuette" | "rest" | "treasure" | "shrine" | "random";
  corrupted?: boolean;
  enemies?: Enemy[];
  participantIndexes?: number[];
  merchantType?: string;
  autoStart?: boolean;
  turnResolved?: boolean;
};

export type MobileNodeEventResolution = {
  state: EtherniaRunSave;
  panel: MobileNodeEventPanel | null;
  logs: string[];
};

function updateCurrentPlayer(state: EtherniaRunSave, nextPlayer: Player): EtherniaRunSave {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.currentPlayerIndex ? nextPlayer : player
    ),
  };
}

function updatePlayers(state: EtherniaRunSave, players: Player[]): EtherniaRunSave {
  return {
    ...state,
    players,
    currentPlayerIndex: Math.min(state.currentPlayerIndex, Math.max(players.length - 1, 0)),
  };
}

function addCorruptionCharge(state: EtherniaRunSave, amount: number): EtherniaRunSave {
  const result = applyCorruptionChargeToState({
    currentCharge: state.corruptionCharge,
    currentLevel: state.corruptionLevel,
    amount,
    chargeMax: CORRUPTION_CHARGE_MAX,
  });

  return {
    ...state,
    corruptionCharge: result.nextCharge,
    corruptionLevel: result.nextLevel,
    nodes: applyCorruptionMutations({
      nodes: state.nodes,
      corruptedNodeIds: state.corruptedNodeIds,
      corruptionLevel: result.nextLevel,
      corruptionCharge: result.nextCharge,
    }),
  };
}

function reduceCorruptionCharge(state: EtherniaRunSave, amount: number): EtherniaRunSave {
  return addCorruptionCharge(state, -Math.abs(amount));
}

function purifyNodeInState(state: EtherniaRunSave, nodeId: number, label = "Apaisé"): EtherniaRunSave {
  return {
    ...state,
    corruptedNodeIds: state.corruptedNodeIds.filter((id) => id !== nodeId),
    nodes: purifyNode(state.nodes, nodeId, label),
  };
}


function resolveNodeLabel(choiceId: EventChoiceAction): string {
  switch (choiceId) {
    case "take_statue":
      return "Gardien réveillé";
    case "purify_statue":
      return "Statuette purifiée";
    case "absorb_statue":
      return "Statuette absorbée";
    case "rest_sleep":
      return "Repos";
    case "rest_focus":
      return "Méditation";
    case "rest_cleanse":
      return "Purification";
    case "treasure_open_safe":
      return "Coffre ouvert";
    case "treasure_force":
      return "Coffre forcé";
    case "treasure_leave":
      return "Trésor ignoré";
    case "shrine_bless":
      return "Autel";
    case "shrine_offer":
      return "Offrande de sang";
    case "shrine_revive":
      return "Rituel";
    case "shrine_leave":
      return "Parti";
    case "random_help":
      return "Réglé";
    case "random_search":
      return "Fouillé";
    case "random_ignore":
      return "Ignoré";
    case "event_forge_temper":
      return "Forge éveillée";
    case "event_veil_relic":
      return "Relique liée";
    case "event_anchor_cleanse":
      return "Ancre stabilisée";
    case "class_force":
      return "Forcé";
    case "class_analyze":
      return "Lu";
    case "class_finesse":
      return "Prélevé";
    case "class_purify":
      return "Apaisé";
    case "class_pact":
      return "Pacte";
    case "retreat":
      return "Sanctuaire ignorée";
    default:
      return "Lieu résolu";
  }
}

function makeMessage(nodeId: number, title: string, text: string, turnResolved = false): MobileNodeEventPanel {
  return { kind: "message", nodeId, title, text, turnResolved };
}

function makeCombatPanel(params: {
  nodeId: number;
  title: string;
  text: string;
  enemies: Enemy[];
  participantIndexes?: number[];
  autoStart?: boolean;
}): MobileNodeEventPanel {
  return {
    kind: "combat",
    nodeId: params.nodeId,
    title: params.title,
    text: params.text,
    enemies: params.enemies,
    participantIndexes: params.participantIndexes,
    autoStart: params.autoStart,
  };
}


function getRicherEventFlavor(node: MapNode): "forge" | "veil" | "anchor" {
  const value = Math.abs((node.id * 7 + (node.depth ?? 0) * 3) % 3);
  return value === 0 ? "forge" : value === 1 ? "veil" : "anchor";
}

function addChoiceIfMissing(panel: MobileNodeEventPanel, choice: EventChoice): MobileNodeEventPanel {
  if (panel.kind !== "choice") return panel;
  if (panel.choices?.some((candidate) => candidate.id === choice.id)) return panel;
  return { ...panel, choices: [...(panel.choices ?? []), choice] };
}

function enrichMobileMapEventPanel(state: EtherniaRunSave, node: MapNode, panel: MobileNodeEventPanel): MobileNodeEventPanel {
  if (panel.kind !== "choice") return panel;

  const flavor = getRicherEventFlavor(node);
  const relicCount = state.veilRelics?.length ?? 0;

  if (panel.choiceType === "random") {
    if (flavor === "forge") {
      return addChoiceIfMissing(
        {
          ...panel,
          title: "Forge de terrain",
          text: panel.corrupted
            ? "La forge peut renforcer une pièce équipée. Le héros paie de l’or. Le lieu instable ajoute de la corruption."
            : "La forge peut renforcer une pièce équipée. Le héros paie de l’or.",
        },
        {
          id: "event_forge_temper",
          label: "Améliorer",
          description: "Renforce une pièce équipée. Le héros paie de l’or.",
          style: panel.corrupted ? "danger" : "power",
        },
      );
    }

    if (flavor === "veil") {
      return addChoiceIfMissing(
        {
          ...panel,
          title: "Relique de run",
          text: relicCount
            ? "Prends une relique active pour toute la run. Son effet reste jusqu’à la fin de la run."
            : "Prends une relique active pour toute la run. Son effet reste jusqu’à la fin de la run.",
        },
        {
          id: "event_veil_relic",
          label: "Prendre",
          description: "Ajoute une relique à la run. Si le lieu est instable, la corruption peut augmenter.",
          style: "power",
        },
      );
    }

    return addChoiceIfMissing(
      {
        ...panel,
        title: "Stabilisation",
        text: panel.corrupted
          ? "Stabilise le lieu, réduit la corruption et rend un peu de PV/Mana au groupe."
          : "Stabilise le lieu, réduit la corruption et rend un peu de PV/Mana au groupe.",
      },
      {
        id: "event_anchor_cleanse",
        label: "Stabiliser",
        description: "Réduit la corruption, soigne un peu le groupe et retire certains malus.",
        style: "sacrifice",
      },
    );
  }

  if (panel.choiceType === "treasure" && flavor === "forge") {
    return addChoiceIfMissing(
      {
        ...panel,
        title: "Coffre de forge",
        text: panel.corrupted
          ? "Renforce une pièce équipée au lieu de prendre un butin. Le lieu instable ajoute de la corruption."
          : "Renforce une pièce équipée au lieu de prendre un butin.",
      },
      {
        id: "event_forge_temper",
        label: "Forger",
        description: "Renforce une pièce équipée. Le héros paie de l’or.",
        style: "power",
      },
    );
  }

  if (panel.choiceType === "shrine" && flavor !== "forge") {
    return addChoiceIfMissing(
      {
        ...panel,
        title: flavor === "veil" ? "Relique de run" : "Stabilisation",
        text: flavor === "veil"
          ? "Prends une relique active pour toute la run. Si le sanctuaire est instable, la corruption peut augmenter."
          : "Réduit la corruption et retire certains malus du groupe.",
      },
      flavor === "veil"
        ? {
            id: "event_veil_relic",
            label: "Prendre",
            description: "Ajoute une relique à la run. La corruption peut augmenter.",
            style: "power",
          }
        : {
            id: "event_anchor_cleanse",
            label: "Stabiliser",
            description: "Réduit la corruption et retire certains malus.",
            style: "sacrifice",
          },
    );
  }

  if (panel.choiceType === "rest" && flavor === "anchor") {
    return addChoiceIfMissing(
      {
        ...panel,
        title: "Refuge stabilisable",
        text: panel.corrupted
          ? "Réduit la corruption, retire certains malus et rend un peu de PV/Mana."
          : "Réduit un peu la corruption et rend des ressources au groupe.",
      },
      {
        id: "event_anchor_cleanse",
        label: "Stabiliser",
        description: "Réduit la corruption et retire certains malus.",
        style: "sacrifice",
      },
    );
  }

  return panel;
}

function findForgeableSlot(player: Player): EquipmentSlot | null {
  const slots: EquipmentSlot[] = ["weapon", "armor", "offhand", "amulet", "ring", "relic"];
  const previews = slots
    .map((slot) => ({ slot, preview: getMobileForgePreview(player, slot) }))
    .filter((entry): entry is { slot: EquipmentSlot; preview: NonNullable<ReturnType<typeof getMobileForgePreview>> } => Boolean(entry.preview));

  const affordable = previews.find((entry) => entry.preview.canUpgrade);
  if (affordable) return affordable.slot;

  return previews.find((entry) => entry.preview.currentLevel < entry.preview.maxLevel)?.slot ?? null;
}

function mapEventResultToPanel(
  node: MapNode,
  result: EventResult,
  participants: number[] = []
): MobileNodeEventPanel {
  if (result.type === "combat") {
    return makeCombatPanel({
      nodeId: node.id,
      title: result.message?.title ?? "Combat",
      text: result.message?.text ?? "Un combat va commencer.",
      enemies: result.enemies ?? [result.enemy],
      participantIndexes: participants,
    });
  }

  if (result.type === "choice") {
    return {
      kind: "choice",
      nodeId: node.id,
      title: result.message.title,
      text: result.message.text,
      choices: result.message.choices,
      choiceType: result.choiceType,
      corrupted: result.corrupted,
    };
  }

  if (result.type === "merchant") {
    return {
      kind: "merchant",
      nodeId: node.id,
      title: result.message?.title ?? "Marchand",
      text: result.message?.text ?? "Un marchand vous attend. Ouvre la boutique native pour acheter ou vendre.",
      merchantType: result.merchantType,
    };
  }

  if (result.type === "player_update") {
    return makeMessage(node.id, result.message.title, result.message.text);
  }

  return makeMessage(
    node.id,
    result.message?.title ?? "Rien à signaler",
    result.message?.text ?? "Vous traversez le lieu sans incident."
  );
}



function getClassChoiceForEvent(player: Player, panel: MobileNodeEventPanel): EventChoice | null {
  if (panel.kind !== "choice") return null;
  const choiceIds = new Set(panel.choices?.map((choice) => choice.id) ?? []);

  switch (player.classType) {
    case "Guerrier":
      if (panel.choiceType === "treasure" || panel.choiceType === "random" || panel.choiceType === "statuette") {
        return { id: "class_force", label: "Forcer", description: "Le héros perd des PV pour obtenir une récompense immédiate.", style: "danger" };
      }
      return null;

    case "Mage":
      if (panel.choiceType === "treasure" || panel.choiceType === "random" || panel.choiceType === "shrine") {
        return { id: "class_analyze", label: "Analyser", description: "Le héros dépense du Mana pour obtenir un petit gain et réduire le risque du lieu.", style: "power" };
      }
      return null;

    case "Archer":
    case "Voleur":
      if (panel.choiceType === "treasure" || panel.choiceType === "random") {
        return { id: "class_finesse", label: player.classType === "Voleur" ? "Dérober" : "Pister", description: "Le héros récupère de l’or et gagne +1 Vitesse. Le risque reste faible.", style: "power" };
      }
      return null;

    case "Clerc":
      if (panel.corrupted || panel.choiceType === "shrine" || panel.choiceType === "statuette" || panel.choiceType === "rest") {
        return { id: "class_purify", label: "Purifier", description: "Le héros dépense du Mana pour soigner le groupe et réduire la corruption.", style: "sacrifice" };
      }
      return null;

    case "Demoniste":
      if (panel.choiceType === "shrine" || panel.choiceType === "random" || panel.choiceType === "statuette") {
        return { id: "class_pact", label: "Pacte", description: "Le héros perd des PV et augmente la corruption pour gagner un gros bonus.", style: "danger" };
      }
      return null;

    default:
      return null;
  }
}

function addClassChoiceToPanel(panel: MobileNodeEventPanel, player: Player): MobileNodeEventPanel {
  const classChoice = getClassChoiceForEvent(player, panel);
  if (!classChoice || panel.choices?.some((choice) => choice.id === classChoice.id)) return panel;
  return { ...panel, choices: [...(panel.choices ?? []), classChoice] };
}

function getResolvedReturnText(node: MapNode) {
  switch (node.eventType) {
    case "battle":
    case "elite":
      return {
        title: "Restes du combat",
        text: "Le passage est libre.",
      };
    case "treasure":
      return {
        title: "Coffre pillé",
        text: "Le coffre est vide.",
      };
    case "rest":
      return {
        title: "Abri froid",
        text: "L’abri est vide.",
      };
    case "scripted_shrine":
      return {
        title: "Sanctuaire épuisé",
        text: "Le sanctuaire est éteint.",
      };
    case "merchant_blacksmith":
    case "merchant_alchemist":
    case "merchant_mystic":
      return {
        title: "Camp abandonné",
        text: "Le camp est vide.",
      };
    case "statuette":
      return {
        title: "Relique arrachée",
        text: "La niche est vide.",
      };
    default:
      return {
        title: node.label ?? "Passage ouvert",
        text: "Passage libre.",
      };
  }
}

function buildConsumedNodeReturnPanel(state: EtherniaRunSave, node: MapNode): MobileNodeEventPanel {
  if (canOfferCorruptedReturnEvent(node, state.corruptedNodeIds)) {
    const isBattlefield = node.eventType === "battle" || node.eventType === "elite";
    const isTreasure = node.eventType === "treasure";

    return {
      kind: "choice",
      nodeId: node.id,
      title: isBattlefield ? "Restes" : isTreasure ? "Coffre" : "Trouble",
      text: isBattlefield
        ? "Le lieu est déjà terminé, mais la corruption peut encore cacher un danger."
        : isTreasure
        ? "Le coffre est déjà ouvert, mais la corruption peut encore cacher quelque chose."
        : "Le lieu est déjà terminé, mais la corruption a laissé une trace.",
      choiceType: "random",
      corrupted: true,
      choices: [
        {
          id: "random_search",
          label: isBattlefield ? "Fouiller" : "Inspecter",
          description: "Tu peux trouver un petit butin, mais une embuscade peut surgir.",
          style: "danger",
        },
        {
          id: "random_ignore",
          label: "Partir",
          description: "Tu repars sans rien déclencher.",
        },
      ],
    };
  }

  const message = getResolvedReturnText(node);
  return makeMessage(node.id, message.title, message.text, true);
}

export function buildMobileNodeEventPanel(state: EtherniaRunSave, nodeId: number): MobileNodeEventPanel | null {
  const node = state.nodes.find((candidate) => candidate.id === nodeId);
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (!node || !currentPlayer) return null;

  if (node.isConsumed) {
    return addClassChoiceToPanel(buildConsumedNodeReturnPanel(state, node), currentPlayer);
  }

  if (requiresNodeInteractionChoice(node)) {
    const encounter = buildMobileCombatEncounter(state, node);
    const participants = getAlivePlayerIndexesAtNode(state.players, node.id);

    if (encounter.startsImmediately) {
      return makeCombatPanel({
        nodeId: node.id,
        title: encounter.title,
        text: encounter.text,
        enemies: createEnemiesForInteractionNode(node),
        participantIndexes: participants.length ? participants : [state.currentPlayerIndex],
        autoStart: true,
      });
    }

    const prompt = getNodeInteractionPrompt(node, state.currentFloorStatues, "first_contact");
    return addClassChoiceToPanel({
      kind: "choice",
      nodeId: node.id,
      title: encounter.title,
      text: encounter.text,
      choices: prompt.choices,
    }, currentPlayer);
  }

  const eventResult = resolveNodeEvent(
    node,
    currentPlayer,
    isNodeCorrupted(node, state.corruptedNodeIds),
    state.currentFloorStatues
  );

  return addClassChoiceToPanel(enrichMobileMapEventPanel(state, node, mapEventResultToPanel(node, eventResult, [state.currentPlayerIndex])), currentPlayer);
}

export function finishMobileTurn(
  state: EtherniaRunSave,
  resolvedNodeId?: number
): { state: EtherniaRunSave; logs: string[] } {
  let nextState: EtherniaRunSave = { ...state, previousNode: null };
  const logs: string[] = [];
  const activePlayer = nextState.players[nextState.currentPlayerIndex];
  const effectiveNodeId = resolvedNodeId ?? activePlayer?.currentNode;
  const currentNode = nextState.nodes.find((node) => node.id === effectiveNodeId);

  if (activePlayer) {
    const mapEffectResult = applyEndTurnMapEffects(activePlayer);
    if (mapEffectResult.logs.length > 0) {
      nextState = updateCurrentPlayer(nextState, mapEffectResult.player);
      logs.push(...mapEffectResult.logs);
    }
  }

  const playerAfterMapEffects = nextState.players[nextState.currentPlayerIndex];
  if (playerAfterMapEffects && currentNode && isNodeCorrupted(currentNode, nextState.corruptedNodeIds)) {
    const pressure = getCorruptionStepPressure({
      currentFloor: nextState.currentFloor,
      corruptionLevel: nextState.corruptionLevel,
      node: currentNode,
    });
    const damagedPlayer = {
      ...playerAfterMapEffects,
      stats: {
        ...playerAfterMapEffects.stats,
        hp: Math.max(1, playerAfterMapEffects.stats.hp - pressure.mapDamage),
      },
    };
    nextState = updateCurrentPlayer(nextState, damagedPlayer);
    nextState = addCorruptionCharge(nextState, pressure.chargeGain);
    logs.push(`Zone corrompue : -${pressure.mapDamage} PV et +${pressure.chargeGain} corruption.`);
  }

  const nextFloorTurn = nextState.floorCorruptionTurn + 1;
  const stage = getCorruptionStage(nextState.corruptionLevel, nextState.corruptionCharge);
  const shouldExpand = shouldExpandFloorCorruption(nextFloorTurn);
  const nextCorruptedNodeIds = shouldExpand
    ? expandCorruptionFront(nextState.nodes, nextState.corruptedNodeIds, stage.spreadSteps)
    : nextState.corruptedNodeIds;

  nextState = {
    ...nextState,
    floorCorruptionTurn: nextFloorTurn,
    corruptedNodeIds: nextCorruptedNodeIds,
    nodes: applyCorruptionMutations({
      nodes: nextState.nodes,
      corruptedNodeIds: nextCorruptedNodeIds,
      corruptionLevel: nextState.corruptionLevel,
      corruptionCharge: nextState.corruptionCharge,
    }),
  };

  if (shouldExpand) {
    logs.push(stage.id === "murmur" ? "La corruption gagne du terrain." : `La corruption s’étend : ${stage.shortLabel}.`);
  }

  const nextPlayerIndex = getNextActivePlayerIndex(nextState.players, nextState.currentPlayerIndex);
  if (nextPlayerIndex === null) {
    return {
      state: nextState,
      logs: [...logs, "Tous les héros sont tombés."],
    };
  }

  return {
    state: {
      ...nextState,
      currentPlayerIndex: nextPlayerIndex,
    },
    logs,
  };
}

function applyPartyBuff(state: EtherniaRunSave, bonuses: Partial<Pick<Stats, "strength" | "magic" | "defense">>) {
  return updatePlayers(
    state,
    state.players.map((player) => (player.isDead ? player : buffPlayerStats(player, bonuses)))
  );
}

export function resolveMobileNodeChoice(
  state: EtherniaRunSave,
  panel: MobileNodeEventPanel,
  choiceId: EventChoiceAction
): MobileNodeEventResolution {
  const node = state.nodes.find((candidate) => candidate.id === panel.nodeId);
  const player = state.players[state.currentPlayerIndex];
  if (!node || !player) {
    return { state, panel: null, logs: ["Impossible de résoudre cette interaction."] };
  }

  if (choiceId === "engage_battle") {
    const participants = getAlivePlayerIndexesAtNode(state.players, node.id);
    const enemies = createEnemiesForInteractionNode(node);
    return {
      state,
      panel: makeCombatPanel({
        nodeId: node.id,
        title: node.type === "boss" ? "Boss prêt" : "Combat prêt",
        text: "Le combat démarre.",
        enemies,
        participantIndexes: participants,
      }),
      logs: [],
    };
  }

  if (choiceId === "wait_for_party") {
    const ended = finishMobileTurn(state, node.id);
    return {
      state: ended.state,
      panel: null,
      logs: ended.logs.length > 0 ? ended.logs : [`${player.name} attend.`],
    };
  }


  if (choiceId === "retreat") {
    const previousNodeId = state.previousNode;
    const canRetreat = typeof previousNodeId === "number" && node.neighbors.includes(previousNodeId);

    if (!canRetreat) {
      return {
        state,
        panel: makeMessage(
          node.id,
          "Sanctuaire ignorée impossible",
          "Aucun chemin de retour sûr n’est disponible depuis ce lieu.",
          true
        ),
        logs: ["Aucun chemin de retour sûr."],
      };
    }

    const nextPlayers = state.players.map((candidate, index) =>
      index === state.currentPlayerIndex ? { ...candidate, currentNode: previousNodeId } : candidate
    );

    return {
      state: {
        ...state,
        players: nextPlayers,
        previousNode: node.id,
      },
      panel: null,
      logs: ["Le groupe repart en arrière."],
    };
  }

  const corrupted = Boolean(panel.corrupted);
  let nextState = state;
  let nextPlayer = player;
  let title = panel.title;
  let text = "Interaction résolue.";
  let shouldEndTurn = true;

  switch (choiceId) {
    case "take_statue": {
      const guardian = createEnemyFromNode({ ...node, eventType: "battle", label: "Gardien" });
      return {
        state,
        panel: makeCombatPanel({
          nodeId: node.id,
          title: "Gardien",
          text: "Le gardien s’éveille.",
          enemies: [
            {
              ...guardian,
              name: "⭐ Gardien",
              hp: Math.floor(guardian.hp * 1.45),
              maxHp: Math.floor(guardian.maxHp * 1.45),
              strength: Math.floor(guardian.strength * 1.2),
              magic: Math.floor(guardian.magic * 1.15),
              defense: Math.floor(guardian.defense * 1.15),
              sourceTag: "statue_guardian",
              grantsStatueOnWin: true,
            },
          ],
          participantIndexes: [state.currentPlayerIndex],
        }),
        logs: [],
      };
    }

    case "purify_statue":
      nextPlayer = {
        ...player,
        stats: {
          ...player.stats,
          hp: Math.max(1, player.stats.hp - 18),
          mana: Math.max(0, player.stats.mana - 12),
        },
        mapEffects: addMapEffect(player.mapEffects, {
          type: "infection",
          value: 3,
          duration: 3,
          source: "statue_purification",
        }),
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      nextState = { ...nextState, currentFloorStatues: Math.min(REQUIRED_STATUES, nextState.currentFloorStatues + 1) };
      title = "Purifiée";
      text = "-18 PV, -12 Mana, Infection.";
      break;

    case "absorb_statue":
      nextPlayer = buffPlayerStats(player, { strength: 1, magic: 1, defense: 1 });
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      nextState = applyPartyBuff(nextState, { strength: 1 });
      nextState = addCorruptionCharge(nextState, 35);
      nextState = { ...nextState, currentFloorStatues: Math.min(REQUIRED_STATUES, nextState.currentFloorStatues + 1) };
      title = "Absorbé";
      text = "+stats, équipe +Force, +35 corruption.";
      break;

    case "rest_sleep":
      nextPlayer = {
        ...player,
        stats: { ...player.stats, hp: Math.min(player.stats.maxHp, player.stats.hp + (corrupted ? 22 : 32)) },
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) nextState = addCorruptionCharge(nextState, 10);
      title = "Repos";
      text = corrupted ? "+22 PV. La corruption augmente de 10." : "+32 PV.";
      break;

    case "rest_focus":
      nextPlayer = corrupted ? buffPlayerStats(player, { magic: 1 }) : player;
      nextPlayer = {
        ...nextPlayer,
        stats: { ...nextPlayer.stats, mana: Math.min(nextPlayer.stats.maxMana, nextPlayer.stats.mana + (corrupted ? 24 : 30)) },
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) nextState = addCorruptionCharge(nextState, 12);
      title = "Méditation";
      text = corrupted ? "+22 Mana et +1 Magie. La corruption augmente de 12." : "+32 Mana.";
      break;

    case "rest_cleanse":
      nextPlayer = {
        ...player,
        statuses: [],
        mapEffects: (["infection", "wound", "fatigue", "hex", "corruption_mark"] as MapEffectType[]).reduce(
          (effects, type) => removeMapEffect(effects, type),
          player.mapEffects
        ),
        stats: {
          ...player.stats,
          hp: Math.min(player.stats.maxHp, player.stats.hp + (corrupted ? 8 : 18)),
          mana: Math.min(player.stats.maxMana, player.stats.mana + (corrupted ? 4 : 10)),
        },
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) {
        nextState = reduceCorruptionCharge(nextState, 18);
        nextState = purifyNodeInState(nextState, node.id, "Refuge");
      }
      title = "Purification";
      text = corrupted ? "Malus retirés, +8 PV, +4 Mana, corruption réduite." : "Malus retirés, +18 PV, +10 Mana.";
      break;

    case "treasure_open_safe": {
      const rng = createScopedRandom(state.runSeed ?? "mobile", `node:${node.id}:safe`);
      const reward = buildTreasureSafeReward({ rng, corrupted });
      nextPlayer = applyRewardBundleToPlayer(player, reward).player;
      text = corrupted
        ? `${describeRewardBundle(reward)} récupéré dans le coffre instable.`
        : `${describeRewardBundle(reward)} récupéré dans le coffre.`;
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      title = reward.title;
      break;
    }

    case "treasure_force": {
      const rng = createScopedRandom(state.runSeed ?? "mobile", `node:${node.id}:force:${state.corruptionCharge}`);
      const mimicChance = corrupted ? 0.4 : 0.18;
      if (randomChance(rng, mimicChance)) {
        const mimic = createEnemyFromNode({ ...node, eventType: "battle", label: "Mimique" });
        return {
          state,
          panel: makeCombatPanel({
            nodeId: node.id,
            title: corrupted ? "Mimique corrompue" : "Mimique",
            text: "Le coffre était vivant. Vaincs la mimique pour récupérer le butin.",
            enemies: [{
              ...mimic,
              name: corrupted ? "☠️ Mimique corrompue" : "🧰 Mimique",
              hp: Math.floor(mimic.hp * (corrupted ? 1.3 : 1.05)),
              maxHp: Math.floor(mimic.maxHp * (corrupted ? 1.3 : 1.05)),
              sourceTag: "treasure_mimic",
            }],
            participantIndexes: [state.currentPlayerIndex],
          }),
          logs: [],
        };
      }
      const reward = buildTreasureForcedReward({ rng, corrupted });
      nextPlayer = applyRewardBundleToPlayer(player, reward).player;
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) nextState = addCorruptionCharge(nextState, 18);
      title = reward.title;
      text = corrupted
        ? `${describeRewardBundle(reward)}. La corruption augmente de 18.`
        : `${describeRewardBundle(reward)}. Aucun piège ne se déclenche.`;
      break;
    }

    case "treasure_leave":
      if (corrupted) {
        nextState = reduceCorruptionCharge(nextState, 12);
        nextState = purifyNodeInState(nextState, node.id, "Coffre");
        title = "Scellé";
        text = "Le coffre est laissé fermé. La corruption locale recule légèrement.";
      } else {
        title = "Prudence";
        text = "Aucun gain. Aucun piège.";
      }
      break;

    case "shrine_bless":
      nextPlayer = buffPlayerStats(player, corrupted ? { magic: 2, strength: 1 } : { defense: 1, magic: 1 });
      nextPlayer = {
        ...nextPlayer,
        mapEffects: addMapEffect(nextPlayer.mapEffects, {
          type: corrupted ? "blessing" : "protection",
          value: corrupted ? 3 : 2,
          duration: 2,
          source: corrupted ? "forbidden_shrine" : "shrine_blessing",
        }),
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) {
        nextState = applyPartyBuff(nextState, { magic: 1 });
        nextState = addCorruptionCharge(nextState, 15);
      }
      title = corrupted ? "Pouvoir instable" : "Protection du sanctuaire";
      text = corrupted ? "+2 Magie, +1 Force et bonus court. Le groupe gagne +1 Magie. La corruption augmente de 15." : "+1 Défense, +1 Magie et protection pendant 2 combats.";
      break;

    case "shrine_offer":
      nextPlayer = buffPlayerStats(player, corrupted ? { strength: 2, magic: 2 } : { defense: 2 });
      nextPlayer = {
        ...nextPlayer,
        stats: { ...nextPlayer.stats, hp: Math.max(1, nextPlayer.stats.hp - (corrupted ? 14 : 8)) },
        mapEffects: addMapEffect(nextPlayer.mapEffects, {
          type: corrupted ? "blessing" : "protection",
          value: corrupted ? 4 : 2,
          duration: corrupted ? 1 : 2,
          source: "shrine_offer",
        }),
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) {
        nextState = applyPartyBuff(nextState, { strength: 1, magic: 1 });
        nextState = addCorruptionCharge(nextState, 24);
      }
      title = corrupted ? "Offrande de sang risquée" : "Offrande de sang";
      text = corrupted ? "-14 PV. Gros bonus au prochain combat. Le groupe gagne Force/Magie. La corruption augmente de 24." : "-8 PV. +2 Défense et protection pendant 2 combats.";
      break;

    case "shrine_revive": {
      const revival = reviveDeadAllyFromShrine(state.players, state.currentPlayerIndex, corrupted);
      if (!revival.revivedPlayerName) {
        return {
          state: nextState,
          panel: makeMessage(node.id, "Aucun allié à relever", "Aucun allié tombé ne peut être relevé."),
          logs: [],
        };
      } else {
        nextState = updatePlayers(nextState, revival.nextPlayers);
        title = "Allié relevé";
        if (corrupted) nextState = addCorruptionCharge(nextState, 18);
        text = corrupted
          ? `${revival.revivedPlayerName} revient avec assez de PV pour continuer. Le héros actif perd 20 PV max et la corruption augmente de 18.`
          : `${revival.revivedPlayerName} revient avec assez de PV pour continuer. Le héros actif perd 12 PV max.`;
      }
      break;
    }

    case "shrine_leave":
      if (corrupted) {
        nextState = reduceCorruptionCharge(nextState, 16);
        nextState = purifyNodeInState(nextState, node.id, "Autel");
        title = "Sanctuaire ignoré";
        text = "Aucun bonus. La corruption locale baisse.";
      } else {
        title = "Sanctuaire ignoré";
        text = "Aucun bonus. Rien ne se déclenche.";
      }
      break;

    case "random_help":
      nextPlayer = corrupted
        ? {
            ...player,
            stats: { ...player.stats, hp: Math.max(1, player.stats.hp - 10) },
            gold: player.gold + 22,
            mapEffects: addMapEffect(player.mapEffects, {
              type: "infection",
              value: 1,
              duration: 2,
              source: "corrupted_stranger",
            }),
          }
        : { ...player, gold: player.gold + 14 };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      title = "Rencontre";
      text = corrupted ? "+22 or. -10 PV et infection légère." : "+14 or.";
      break;

    case "random_search": {
      const rng = createScopedRandom(state.runSeed ?? "mobile", `node:${node.id}:search`);
      const ambushChance = corrupted ? 0.28 : 0.14;
      if (randomChance(rng, ambushChance)) {
        const ambusher = createEnemyFromNode({ ...node, eventType: "battle", label: "Embuscade" });
        return {
          state,
          panel: makeCombatPanel({
            nodeId: node.id,
            title: corrupted ? "Embuscade corrompue" : "Embuscade",
            text: corrupted
              ? "La fouille attire une créature tapie dans la corruption."
              : "La fouille fait du bruit. Une créature approche.",
            enemies: [{ ...ambusher, name: corrupted ? "🌫️ Embusqué corrompu" : "Embusqué", sourceTag: "random_ambush" }],
            participantIndexes: [state.currentPlayerIndex],
          }),
          logs: [],
        };
      }

      const searchReward = buildRandomSearchReward({ rng });
      nextPlayer = searchReward.items?.length
        ? applyRewardBundleToPlayer(player, searchReward).player
        : buffPlayerStats(player, { magic: 1 });
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) {
        nextState = applyPartyBuff(nextState, { defense: 1 });
        nextState = addCorruptionCharge(nextState, 10);
      }
      title = corrupted ? "Découverte instable" : "Découverte";
      text = corrupted ? "Récompense obtenue. Le groupe gagne +1 Défense. La corruption augmente de 10." : "Récompense obtenue sans embuscade.";
      break;
    }

    case "random_ignore":
      if (corrupted) {
        nextState = reduceCorruptionCharge(nextState, 8);
        nextState = purifyNodeInState(nextState, node.id, "Trouble");
        title = "Écarté";
        text = "Aucun gain. La corruption locale baisse.";
      } else {
        title = "Passé";
        text = "Aucun gain. Rien ne se déclenche.";
      }
      break;

    case "event_forge_temper": {
      const slot = findForgeableSlot(player);
      if (!slot) {
        title = "Forge froide";
        text = "Aucune pièce portée ne peut recevoir la trempe.";
        break;
      }

      const preview = getMobileForgePreview(player, slot);
      if (!preview?.canUpgrade) {
        title = "Forge incomplète";
        text = preview?.reason ?? "La forge réclame une pièce portée et assez d'or.";
        break;
      }

      const forged = upgradeMobileEquipmentAtForge(nextState, state.currentPlayerIndex, slot);
      nextState = forged.state;
      if (corrupted) nextState = addCorruptionCharge(nextState, 8);
      title = "Trempe réussie";
      text = `${forged.message} ${preview.gainedLines.join(" · ") || "Bonus renforcé"}.${corrupted ? " +8 corruption." : ""}`;
      break;
    }

    case "event_veil_relic": {
      const relic = getNextVeilRelicCandidate(nextState, corrupted ? "pact" : "echo");
      if (!relic) {
        title = "Aucune relique disponible";
        text = "Tu as déjà récupéré les reliques disponibles pour cette run.";
        break;
      }

      nextState = applyVeilRelicToRun(nextState, relic);
      if (corrupted && relic.role !== "Risque") nextState = addCorruptionCharge(nextState, 6);
      title = `Relique · ${relic.name}`;
      text = `${relic.technical}${relic.role === "Risque" ? " Cette relique ajoute un risque." : corrupted ? " La corruption augmente de 6." : ""}`;
      break;
    }

    case "event_anchor_cleanse": {
      const cleanseValue = corrupted ? 18 : 10;
      const healedPlayers = nextState.players.map((candidate) => {
        if (candidate.isDead) return candidate;
        return {
          ...candidate,
          statuses: (candidate.statuses ?? []).filter((status) => status.type !== "poison" && status.type !== "frailty"),
          mapEffects: removeMapEffect(removeMapEffect(candidate.mapEffects ?? [], "infection"), "corruption_mark"),
          stats: {
            ...candidate.stats,
            hp: Math.min(candidate.stats.maxHp, candidate.stats.hp + (corrupted ? 8 : 5)),
            mana: Math.min(candidate.stats.maxMana, candidate.stats.mana + (corrupted ? 5 : 3)),
          },
        };
      });
      nextState = updatePlayers(nextState, healedPlayers);
      nextState = reduceCorruptionCharge(nextState, cleanseValue);
      if (corrupted) nextState = purifyNodeInState(nextState, node.id, "Ancre");
      title = "Ancre stabilisée";
      text = corrupted
        ? `Corruption -${cleanseValue}, équipe +8 PV, +5 Mana, marques retirées.`
        : `Corruption -${cleanseValue}, équipe +5 PV, +3 Mana.`;
      break;
    }

    case "class_force": {
      const cost = corrupted ? 10 : 7;
      nextPlayer = {
        ...player,
        gold: player.gold + (corrupted ? 26 : 18),
        stats: { ...player.stats, hp: Math.max(1, player.stats.hp - cost) },
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) nextState = addCorruptionCharge(nextState, 10);
      title = "Forcé";
      text = `+${corrupted ? 26 : 18} or, -${cost} PV${corrupted ? ", +10 corruption" : ""}.`;
      break;
    }

    case "class_analyze": {
      const manaCost = 10;
      nextPlayer = buffPlayerStats({
        ...player,
        stats: { ...player.stats, mana: Math.max(0, player.stats.mana - manaCost) },
        gold: player.gold + 8,
      }, { magic: 1 });
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) {
        nextState = reduceCorruptionCharge(nextState, 10);
        nextState = purifyNodeInState(nextState, node.id, node.label ?? "Lu");
      }
      title = "Lu";
      text = corrupted ? "+1 Magie, +8 or, corruption réduite." : "+1 Magie, +8 or.";
      break;
    }

    case "class_finesse": {
      const isRogue = player.classType === "Voleur";
      nextPlayer = {
        ...player,
        gold: player.gold + (isRogue ? 22 : 16),
        stats: { ...player.stats, speed: player.stats.speed + 1 },
      };
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      if (corrupted) nextState = addCorruptionCharge(nextState, 6);
      title = isRogue ? "Prélevé" : "Pisté";
      text = `+${isRogue ? 22 : 16} or, +1 Vitesse${corrupted ? ", +6 corruption" : ""}.`;
      break;
    }

    case "class_purify": {
      const manaCost = 14;
      const healedPlayers = state.players.map((candidate, index) => {
        if (candidate.isDead) return candidate;
        const base = index === state.currentPlayerIndex
          ? { ...candidate, stats: { ...candidate.stats, mana: Math.max(0, candidate.stats.mana - manaCost) } }
          : candidate;
        return {
          ...base,
          stats: { ...base.stats, hp: Math.min(base.stats.maxHp, base.stats.hp + 10) },
          mapEffects: removeMapEffect(removeMapEffect(base.mapEffects, "infection"), "corruption_mark"),
        };
      });
      nextState = updatePlayers(nextState, healedPlayers);
      nextState = reduceCorruptionCharge(nextState, corrupted ? 18 : 8);
      if (corrupted) nextState = purifyNodeInState(nextState, node.id, node.label ?? "Apaisé");
      title = "Apaisé";
      text = corrupted ? "+10 PV équipe, corruption réduite." : "+10 PV équipe.";
      break;
    }

    case "class_pact": {
      const cost = 12;
      nextPlayer = buffPlayerStats({
        ...player,
        stats: { ...player.stats, hp: Math.max(1, player.stats.hp - cost) },
      }, { strength: 1, magic: 2 });
      nextState = updateCurrentPlayer(nextState, nextPlayer);
      nextState = addCorruptionCharge(nextState, corrupted ? 24 : 16);
      title = "Pacte";
      text = `+1 Force, +2 Magie, -${cost} PV, +${corrupted ? 24 : 16} corruption.`;
      break;
    }

    default:
      shouldEndTurn = false;
      break;
  }

  nextState = {
    ...nextState,
    nodes: node.isConsumed
      ? markNodeRevisited(nextState.nodes, node.id, choiceId === "random_ignore" ? "Trouble évité" : "Lieu fouillé")
      : markNodeResolved(nextState.nodes, node.id, resolveNodeLabel(choiceId)),
  };

  if (!shouldEndTurn) {
    return {
      state: nextState,
      panel: makeMessage(node.id, title, text),
      logs: [],
    };
  }

  const ended = finishMobileTurn(nextState, node.id);
  return {
    state: ended.state,
    panel: makeMessage(node.id, title, text, true),
    logs: ended.logs,
  };
}

export function resolveMobileImmediateEvent(
  state: EtherniaRunSave,
  nodeId: number
): MobileNodeEventResolution {
  const node = state.nodes.find((candidate) => candidate.id === nodeId);
  const player = state.players[state.currentPlayerIndex];
  if (!node || !player) return { state, panel: null, logs: [] };

  if (node.isConsumed) {
    return { state, panel: addClassChoiceToPanel(buildConsumedNodeReturnPanel(state, node), player), logs: [] };
  }

  const result = resolveNodeEvent(node, player, isNodeCorrupted(node, state.corruptedNodeIds), state.currentFloorStatues);
  let nextState = state;
  const panel = addClassChoiceToPanel(enrichMobileMapEventPanel(state, node, mapEventResultToPanel(node, result, [state.currentPlayerIndex])), player);

  if (result.type === "player_update") {
    nextState = updateCurrentPlayer(nextState, result.player);
  }

  if (result.type === "choice" || result.type === "combat" || result.type === "merchant") {
    return { state: nextState, panel, logs: [] };
  }

  if (!isMerchantNode(node) && node.type !== "boss") {
    nextState = { ...nextState, nodes: markNodeResolved(nextState.nodes, node.id, node.label ?? "Résolu") };
  }

  const ended = finishMobileTurn(nextState, node.id);
  return {
    state: ended.state,
    panel: panel ? { ...panel, turnResolved: true } : panel,
    logs: ended.logs,
  };
}
