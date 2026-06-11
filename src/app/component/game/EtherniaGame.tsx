"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlobalStyles from "./GlobalStyles";
import CharacterPanel from "./CharacterPanel";
import LevelUpModal from "./LevelUpModal";
import EventModal from "./EventModal";
import LobbyScreen from "./LobbyScreen";
import GameHUD from "./GameHUD";
import GameMap from "./GameMap";
import GameEndScreen from "./GameEndScreen";
import SideToolbar, { SidePanelTab } from "./SideToolbar";
import CorruptionPanel from "./CorruptionPanel";
import HelpShortcuts from "./HelpShortcuts";
import MobileActionSheet from "./mobile/MobileActionSheet";
import MobileBottomNav from "./mobile/MobileBottomNav";
import { useIsMobile } from "./mobile/useIsMobile";
import CombatResultModal from "./CombatResultModal";
import { deleteRun, getSavedRunInfo, loadRun, saveRun, SavedRunInfo } from "./saveSystem";
import { equipInventoryItem,unequipInventorySlot, consumeItem, addItemToInventory, buyItem, sellItem  } from "@/shared/lib/inventory";
import { FloorBiome } from "@/shared/data/floors";
import MerchantModal from "./MerchantModal";
import { getMerchantStock, MerchantType } from "@/shared/data/merchantStocks";
import {
  restorePersistentPlayerStatsFromCombat,
} from "@/shared/lib/playerStats";
import { addMapEffect, applyEndTurnMapEffects, consumeCombatMapEffects } from "@/shared/lib/mapEffects";
import { resolveNodeEvent } from "@/shared/lib/eventSystem";
import { EventChoiceAction } from "@/shared/types/game";
import { createEnemyFromNode } from "@/shared/lib/enemies";
import { getPrimaryEnemy, syncCombatEnemyToEnemy } from "@/shared/lib/combatEnemies";


import { applyXpAndLevelUp, buffPlayerStats, getXpReward } from "@/shared/lib/gameProgression";

import { ClassType, Enemy, MapNode, Player, Stats, StatusEffect } from "@/shared/types/game";
import CombatOverlay, { CombatResultPlayer } from "@/app/component/game/CombatOverlay";
import { buildCombatRecapPlayers as buildCombatRecapPlayersFromEngine, buildCombatXpStates as buildCombatXpStatesFromEngine, CombatPlayerRecap, CombatResultKind, CombatXpState } from "@/shared/engine/combat/combatResults";
import { getEliteRewardByCategory } from "@/shared/data/items";
import {
  CORRUPTION_CHARGE_MAX,
  DEFAULT_RUNTIME_RESET_STATE,
  FLOOR_CORRUPTION_INTERVAL,
  FLOOR_CORRUPTION_START_DELAY,
  MAX_PLAYERS,
  REQUIRED_STATUES,
  getBossWeakeningLabel as getBossWeakeningLabelFromState,
  getCorruptionLevelLabel,
  shouldExpandFloorCorruption,
} from "@/shared/engine/game/gameState";
import { PendingChoiceContext, EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { fromRunSave, toRunSave } from "@/shared/engine/game/saveAdapter";
import { mergePlayerProgressSnapshot, reviveDeadAllyFromShrine, reviveDeadPlayersAtNewFloor } from "@/shared/engine/game/playerLifecycle";
import { applyCorruptedNodeStepDamage, getNextActivePlayerIndex } from "@/shared/engine/game/turnEngine";
import { applyCorruptionChargeToState } from "@/shared/engine/game/corruptionEngine";
import {
  createEnemiesForInteractionNode,
  getAlivePlayerIndexesAtNode,
  getBossEngageText as getBossEngageTextFromEngine,
  getNodeInteractionPrompt,
} from "@/shared/engine/game/nodeInteractionEngine";
import {
  canTriggerNodeEvent as canTriggerMapNodeEvent,
  expandCorruptionFront,
  isMerchantNode,
  isNodeCorrupted,
  markNodeConsumed as markNodeConsumedInMap,
  markNodeResolved as markNodeResolvedInMap,
  requiresNodeInteractionChoice,
} from "@/shared/engine/map/mapEngine";
import { prepareFloorState, prepareNextFloorTransition } from "@/shared/engine/game/floorEngine";
import { createRunSeed, createScopedRandom } from "@/shared/platform/random";
import { GameAction } from "@/shared/engine/game/gameActions";
import { applyGameAction } from "@/shared/engine/game/gameCommand";

export default function EtherniaGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [savedRunInfo, setSavedRunInfo] = useState<SavedRunInfo | null>(null);
  const [runSeed, setRunSeed] = useState(() => createRunSeed());
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassType>("Guerrier");
  const [gameOver, setGameOver] = useState(false);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [mapWidth, setMapWidth] = useState(3600);
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanelTab | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileCorruptionOpen, setMobileCorruptionOpen] = useState(false);
  const isMobile = useIsMobile();
  const [currentFloor, setCurrentFloor] = useState(1);  
  const [victory, setVictory] = useState(false);
  const [pendingChoiceContext, setPendingChoiceContext] = useState<PendingChoiceContext | null>(null);
  const [currentFloorBiome, setCurrentFloorBiome] = useState<FloorBiome>("forest");
  const [pendingNodeInteraction, setPendingNodeInteraction] = useState<{
    nodeId: number;
    playerIndex: number;
  } | null>(null);
  const [combatParticipants, setCombatParticipants] = useState<number[]>([]);

  const [combatResultModal, setCombatResultModal] = useState<{
    open: boolean;
    kind: CombatResultKind;
    title: string;
    summary: string;
    xp?: number;
    gold?: number;
    rewards?: string[];
    players: CombatPlayerRecap[];
    xpStates?: CombatXpState[];
    onCloseAction?: () => void;
  }>({
    open: false,
    kind: "victory",
    title: "",
    summary: "",
    xp: 0,
    gold: 0,
    rewards: [],
    players: [],
    xpStates: [],
  });

  const [mapHeight, setMapHeight] = useState(1200);

  const [phase, setPhase] = useState<"MOVE" | "EVENT" | "COMBAT">("MOVE");
  const [previousNode, setPreviousNode] = useState<number | null>(null);

  const [corruptionLevel, setCorruptionLevel] = useState(0);
  const [corruptionCharge, setCorruptionCharge] = useState(0);
  const [corruptedNodeIds, setCorruptedNodeIds] = useState<number[]>([]);
  
  const [floorCorruptionTurn, setFloorCorruptionTurn] = useState(0);

  const [combatEnemies, setCombatEnemies] = useState<Enemy[]>([]);
  const [eventMessage, setEventMessage] = useState<{
    title: string;
    text: string;
    choices?: {
      id: EventChoiceAction;
      label: string;
      description: string;
      style?: "danger" | "sacrifice" | "power";
    }[];
  } | null>(null);

  const [pendingEventNodeId, setPendingEventNodeId] = useState<number | null>(null);

  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchantType, setMerchantType] = useState<MerchantType | null>(null);
  const [merchantStock, setMerchantStock] = useState<import("@/shared/types/game").InventoryItem[]>([]);

  const [currentFloorStatues, setCurrentFloorStatues] = useState(0);

  const showEventMessage = (title: string, text: string) => {
    setEventMessage({ title, text });
  };
  
  const getBossWeakeningLabel = () => getBossWeakeningLabelFromState(currentFloorStatues);
  
  const openCombatResultModal = (payload: {
    kind: "victory" | "defeat" | "flee";
    title: string;
    summary: string;
    xp?: number;
    gold?: number;
    rewards?: string[];
    players: {
      name: string;
      hp: number;
      maxHp: number;
      mana: number;
      maxMana: number;
      isDead: boolean;
    }[];
    xpStates?: {
      playerId: number;
      playerName: string;
      level: number;
      currentXp: number;
      xpToNextLevel: number;
      gainedXp: number;
    }[];
    onCloseAction?: () => void;
  }) => {
    setCombatResultModal({
      open: true,
      kind: payload.kind,
      title: payload.title,
      summary: payload.summary,
      xp: payload.xp ?? 0,
      gold: payload.gold ?? 0,
      rewards: payload.rewards ?? [],
      players: payload.players,
      xpStates: payload.xpStates ?? [],
      onCloseAction: payload.onCloseAction,
    });
  };

  const closeCombatResultModal = () => {
    const action = combatResultModal.onCloseAction;
    setCombatResultModal((prev) => ({
      ...prev,
      open: false,
      onCloseAction: undefined,
    }));
    action?.();
  };

  const buildCombatRecapPlayers = (results: CombatResultPlayer[]) =>
    buildCombatRecapPlayersFromEngine({
      roster: players,
      participantIndexes: combatParticipants,
      results,
    });

  const buildCombatXpStates = (xpGained: number) =>
    buildCombatXpStatesFromEngine({
      roster: players,
      participantIndexes: combatParticipants,
      xpGained,
    });

  const applyPlayerResult = (playerResult: Player) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? mergePlayerProgressSnapshot(p, playerResult) : p
      )
    );
  };

        const corruptionLevelLabel = getCorruptionLevelLabel(corruptionLevel);

    useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      if (isTyping) return;

      if (e.key === "Escape") {
        setActiveSidePanel(null);
        return;
      }

      if (!gameStarted) return;

      if (e.key.toLowerCase() === "c") {
        setActiveSidePanel((prev) => (prev === "stats" ? null : "stats"));
      }

      if (e.key.toLowerCase() === "i") {
        setActiveSidePanel((prev) => (prev === "inventory" ? null : "inventory"));
      }

      if (e.key.toLowerCase() === "e") {
        setActiveSidePanel((prev) => (prev === "equipment" ? null : "equipment"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted]);

  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [lastLevelUp, setLastLevelUp] = useState<{
    playerName: string;
    classType: ClassType;
    level: number;
    growth: {
      hp: number;
      mana: number;
      strength: number;
      magic: number;
      defense: number;
      speed: number;
    };
    newSkills: import("@/shared/types/game").PlayerSkill[];
  } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const currentPlayer = players[currentPlayerIndex];
  const combatPlayers = combatParticipants
    .map((idx) => players[idx])
    .filter((p): p is Player => Boolean(p));

  const buildCurrentRunState = (): EtherniaRunSave =>
    toRunSave({
      runSeed,
      players,
      currentPlayerIndex,
      currentFloor,
      currentFloorBiome,
      nodes,
      mapWidth,
      mapHeight,
      previousNode,
      corruptionLevel,
      corruptionCharge,
      corruptedNodeIds,
      floorCorruptionTurn,
      currentFloorStatues,
    });

  const commitRunState = (nextState: EtherniaRunSave) => {
    setRunSeed(nextState.runSeed ?? runSeed);
    setPlayers(nextState.players);
    setCurrentPlayerIndex(nextState.currentPlayerIndex);
    setCurrentFloor(nextState.currentFloor);
    setCurrentFloorBiome(nextState.currentFloorBiome);
    setNodes(nextState.nodes);
    setMapWidth(nextState.mapWidth);
    setMapHeight(nextState.mapHeight);
    setPreviousNode(nextState.previousNode);
    setCorruptionLevel(nextState.corruptionLevel);
    setCorruptionCharge(nextState.corruptionCharge);
    setCorruptedNodeIds(nextState.corruptedNodeIds);
    setFloorCorruptionTurn(nextState.floorCorruptionTurn);
    setCurrentFloorStatues(nextState.currentFloorStatues);
  };

  const dispatchGameAction = (action: GameAction) => {
    const result = applyGameAction(buildCurrentRunState(), action);
    commitRunState(result.state);
    return result;
  };

  useEffect(() => {
    setSavedRunInfo(getSavedRunInfo());
  }, []);

  useEffect(() => {
    if (!gameStarted) return;

    if (gameOver || victory) {
      deleteRun();
      setSavedRunInfo(null);
      return;
    }

    const saveData = toRunSave({
      runSeed,
      players,
      currentPlayerIndex,
      currentFloor,
      currentFloorBiome,
      nodes,
      mapWidth,
      mapHeight,
      previousNode,
      corruptionLevel,
      corruptionCharge,
      corruptedNodeIds,
      floorCorruptionTurn,
      currentFloorStatues,
    });

    saveRun(saveData);
    setSavedRunInfo(getSavedRunInfo());
  }, [
    gameStarted,
    gameOver,
    victory,
    runSeed,
    players,
    currentPlayerIndex,
    currentFloor,
    currentFloorBiome,
    nodes,
    mapWidth,
    mapHeight,
    previousNode,
    corruptionLevel,
    corruptionCharge,
    corruptedNodeIds,
    floorCorruptionTurn,
    currentFloorStatues,
  ]);

  const toggleSidePanel = (panel: SidePanelTab) => {
    setActiveSidePanel((prev) => (prev === panel ? null : panel));
  };

  const handleUseItem = (itemId: string) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
      idx === currentPlayerIndex ? consumeItem(p, itemId) : p      )
    );
  };

  const handleEquipItem = (itemId: string) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? equipInventoryItem(p, itemId) : p
      )
    );
  };

  const handleUnequipSlot = (slot: "weapon" | "armor" | "relic") => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? unequipInventorySlot(p, slot) : p
      )
    );
  };

  const addCorruptionCharge = (amount: number) => {
    setCorruptionCharge((prevCharge) => {
      const result = applyCorruptionChargeToState({
        currentCharge: prevCharge,
        currentLevel: corruptionLevel,
        amount,
        chargeMax: CORRUPTION_CHARGE_MAX,
      });

      if (result.levelUps > 0) {
        setCorruptionLevel(result.nextLevel);
        setCorruptedNodeIds((prevIds) =>
          expandCorruptionFront(nodes, prevIds, result.levelUps)
        );

        setEventMessage({
          title: "La corruption progresse",
          text: `La corruption gagne du terrain. Niveau +${result.levelUps}.`,
        });
      }

      return result.nextCharge;
    });
  };

  const applyPartyCorruptionBoon = (
    bonuses: Partial<Pick<Stats, "strength" | "magic" | "defense">>,
    corruptionGain: number,
    title: string,
    text: string
  ) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p) => (p.isDead ? p : buffPlayerStats(p, bonuses)))
    );
    addCorruptionCharge(corruptionGain);
    setEventMessage({ title, text });
  };

  const markNodeResolved = (nodeId: number, label: string) => {
    setNodes((prevNodes) => markNodeResolvedInMap(prevNodes, nodeId, label));
  };

  const handleLevelUp = (payload: {
    playerName: string;
    classType: ClassType;
    level: number;
    growth: {
      hp: number;
      mana: number;
      strength: number;
      magic: number;
      defense: number;
      speed: number;
    };
    newSkills: import("@/shared/types/game").PlayerSkill[];
  }) => {
    setLastLevelUp(payload);
    setLevelUpOpen(true);
  };

  const endTurn = (resolvedNodeId?: number) => {
  
    setPreviousNode(null);

    const nextFloorTurn = floorCorruptionTurn + 1;
    const effectiveNodeId = resolvedNodeId ?? currentPlayer?.currentNode;
    const currentNode = nodes.find((n) => n.id === effectiveNodeId);

    if (currentPlayer) {
      const result = applyEndTurnMapEffects(currentPlayer);

      if (result.logs.length > 0) {
        setPlayers((prevPlayers) =>
          prevPlayers.map((p, idx) =>
            idx === currentPlayerIndex ? result.player : p
          )
        );

        setEventMessage({
          title: "Effets persistants",
          text: result.logs.join(" "),
        });
      }
    }

    if (currentPlayer && currentNode && isNodeCorruptedLocal(currentNode)) {
      setPlayers((prevPlayers) =>
        prevPlayers.map((p, idx) =>
          idx === currentPlayerIndex ? applyCorruptedNodeStepDamage(p) : p
        )
      );

      addCorruptionCharge(20);

      setEventMessage({
        title: "Corruption",
        text: "Vous marchez sur une zone corrompue. Vous perdez 5 PV et la jauge de corruption augmente.",
      });
    }

    if (shouldExpandFloorCorruption(nextFloorTurn)) {
      setCorruptedNodeIds((prevIds) =>
        expandCorruptionFront(nodes, prevIds, 1)
      );
    }

    setFloorCorruptionTurn(nextFloorTurn);

    const nextIndex = getNextActivePlayerIndex(players, currentPlayerIndex);

    if (nextIndex === null) {
      setGameOver(true);
      return;
    }

    setCurrentPlayerIndex(nextIndex);
    setPhase("MOVE");
  };

  const triggerEvent = (nodeId: number) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !currentPlayer) return;

    // Si la case n'est plus activable, on passe juste le tour
    if (!canTriggerMapNodeEvent(node, corruptedNodeIds)) {
      setEventMessage({
        title: "Lieu épuisé",
        text: "Cet endroit a déjà été exploré. Il ne s'y passe plus rien.",
      });
      endTurn();
      return;
    }

    setTimeout(() => {
      const result = resolveNodeEvent(
        node,
        currentPlayer,
        isNodeCorruptedLocal(node),
        currentFloorStatues
      );

      if (result.type === "merchant") {
        setMerchantType(result.merchantType);
        setMerchantStock(getMerchantStock(result.merchantType));
        setMerchantOpen(true);
        setPhase("EVENT");
        return;
      }

      if (result.type === "combat") {
        setCombatParticipants([currentPlayerIndex]);
        setCombatEnemies(result.enemies && result.enemies.length > 0 ? result.enemies : [result.enemy]);
        setPhase("COMBAT");
        return;
      }

      if (result.message) {
        setEventMessage(result.message);
      }

      if (result.type === "choice") {
        setPendingEventNodeId(node.id);
        setPendingChoiceContext({
          type: result.choiceType,
          corrupted: !!result.corrupted,
        });
        setEventMessage(result.message);
        setPhase("EVENT");
        return;
      }

      // Marquer la case comme consommée si ce n'est pas un marchand ni un boss
      if (!isMerchantNode(node) && node.type !== "boss") {
        markNodeConsumed(node.id);
      }

      if (result.type === "player_update") {
        applyPlayerResult(result.player);
        endTurn();
        return;
      }

      endTurn();
    }, 300);
  };

  const handleBuyFromMerchant = (item: import("@/shared/types/game").InventoryItem) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? buyItem(p, item) : p
      )
    );
  };

  const isNodeCorruptedLocal = (node: MapNode) => {
    return isNodeCorrupted(node, corruptedNodeIds);
  };

  const handleSellToMerchant = (itemId: string) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? sellItem(p, itemId) : p
      )
    );
  };

  const handleCloseMerchant = () => {
    setMerchantOpen(false);
    setMerchantType(null);
    setMerchantStock([]);
    endTurn();
  };


    const handleEventChoice = (choiceId: EventChoiceAction) => {
    const node = nodes.find((n) => n.id === pendingEventNodeId);
    const player = players[currentPlayerIndex];

    if (pendingNodeInteraction) {
      const interactionNode = nodes.find((n) => n.id === pendingNodeInteraction.nodeId);

      if (!interactionNode) {
        setEventMessage(null);
        setPendingNodeInteraction(null);
        setCombatParticipants([]);
        setPhase("MOVE");
        return;
      }
      if (choiceId === "engage_battle") {
        const participants = getAlivePlayerIndexesAtNode(players, interactionNode.id);
        const enemies = createEnemiesForInteractionNode(interactionNode);

        setCombatParticipants(participants);
        setEventMessage(null);
        setPendingNodeInteraction(null);
        setCombatEnemies(enemies);
        setPhase("COMBAT");
        return;
      }
      if (choiceId === "wait_for_party") {
        setCombatParticipants((prev) =>
          prev.includes(currentPlayerIndex) ? prev : [...prev, currentPlayerIndex]
        );

        setEventMessage({
          title: "Attente",
          text: "Vous restez sur place et attendez pour ce tour.",
        });

        endTurn(interactionNode.id);
        return;
      }
    }

    if (!node || !player || !pendingChoiceContext) {
      setEventMessage(null);
      setPendingEventNodeId(null);
      setPendingChoiceContext(null);
      setPhase("MOVE");
      return;
    }

    if (pendingChoiceContext.type === "statuette") {
      if (choiceId === "take_statue") {
        const guardian = createEnemyFromNode({
          ...node,
          eventType: "battle",
          label: "Gardien de statuette",
        });

        const eliteGuardian: Enemy = {
          ...guardian,
          name: "⭐ Gardien de la relique",
          hp: Math.floor(guardian.hp * 1.45),
          maxHp: Math.floor(guardian.maxHp * 1.45),
          strength: Math.floor(guardian.strength * 1.2),
          magic: Math.floor(guardian.magic * 1.15),
          defense: Math.floor(guardian.defense * 1.15),
          sourceTag: "statue_guardian",
          grantsStatueOnWin: true,
        };

        setEventMessage(null);
        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setCombatParticipants([currentPlayerIndex]);
        setCombatEnemies([eliteGuardian]);
        setPhase("COMBAT");
        return;
      }

      if (choiceId === "purify_statue") {
        const nextPlayer: Player = {
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

        applyPlayerResult(nextPlayer);
        setCurrentFloorStatues((prev) => Math.min(REQUIRED_STATUES, prev + 1));

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id
              ? { ...n, isConsumed: true, label: "Statuette purifiée" }
              : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Purification accomplie",
          text: "Vous purifiez la relique au prix de votre chair. -18 PV, -12 Mana, Infection, +1 statuette.",
        });
        endTurn(node.id);
        return;
      }

      if (choiceId === "absorb_statue") {
        const nextPlayer = buffPlayerStats(player, {
          strength: 1,
          magic: 1,
          defense: 1,
        });

        applyPlayerResult(nextPlayer);
        applyPartyCorruptionBoon(
          { strength: 1 },
          35,
          "Pouvoir absorbé",
          "Vous avalez l'éclat de la statuette. Le porteur gagne +1 Force, +1 Magie, +1 Défense et toute l'équipe gagne +1 Force. En échange, la corruption s'emballe."
        );
        setCurrentFloorStatues((prev) => Math.min(REQUIRED_STATUES, prev + 1));
        markNodeResolved(node.id, "Statuette absorbée");

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        endTurn(node.id);
        return;
      }
    }

    if (pendingChoiceContext.type === "rest") {
      if (choiceId === "rest_sleep") {
        const nextPlayer: Player = {
          ...player,
          stats: {
            ...player.stats,
            hp: Math.min(
              player.stats.maxHp,
              player.stats.hp + (pendingChoiceContext.corrupted ? 18 : 30)
            ),
          },
        };

        applyPlayerResult(nextPlayer);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Repos" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        if (pendingChoiceContext.corrupted) {
          addCorruptionCharge(10);
        }

        setEventMessage({
          title: "Repos",
          text: pendingChoiceContext.corrupted
            ? "Vous dormez dans le soufre. +18 PV, mais la corruption gagne 10 points."
            : "Vous récupérez profondément. +30 PV.",
        });
        endTurn(node.id);
        return;
      }

      if (choiceId === "rest_focus") {
        const focusedPlayer = pendingChoiceContext.corrupted
          ? buffPlayerStats(player, { magic: 1 })
          : player;

        const nextPlayer: Player = {
          ...focusedPlayer,
          stats: {
            ...focusedPlayer.stats,
            mana: Math.min(
              focusedPlayer.stats.maxMana,
              focusedPlayer.stats.mana + (pendingChoiceContext.corrupted ? 24 : 30)
            ),
          },
        };

        applyPlayerResult(nextPlayer);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Méditation" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        if (pendingChoiceContext.corrupted) {
          addCorruptionCharge(15);
        }

        setEventMessage({
          title: "Méditation",
          text: pendingChoiceContext.corrupted
            ? "Vous laissez la faille vous traverser. +24 Mana, +1 Magie, mais la corruption gagne 15 points."
            : "Votre esprit se recentre. +30 Mana.",
        });
        endTurn(node.id);
        return;
      }

      if (choiceId === "rest_cleanse") {
        const nextPlayer: Player = {
          ...player,
          stats: {
            ...player.stats,
            hp: pendingChoiceContext.corrupted
              ? Math.max(1, player.stats.hp - 8)
              : player.stats.hp,
            mana: pendingChoiceContext.corrupted
              ? Math.max(0, player.stats.mana - 5)
              : player.stats.mana,
          },
          mapEffects: player.mapEffects.filter(
            (e) => e.type !== "infection" && e.type !== "wound"
          ),
        };

        applyPlayerResult(nextPlayer);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Purification" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Purification",
          text: pendingChoiceContext.corrupted
            ? "Vous chassez une partie du mal au prix de votre énergie."
            : "Vous purifiez votre corps et votre esprit.",
        });
        endTurn(node.id);
        return;
      }
    }

    if (pendingChoiceContext.type === "treasure") {
      if (choiceId === "treasure_open_safe") {
        const nextPlayer =
          Math.random() < 0.5
            ? { ...player, gold: player.gold + (pendingChoiceContext.corrupted ? 10 : 20) }
            : addItemToInventory(player, { ...getEliteRewardByCategory("consumable")! });

        applyPlayerResult(nextPlayer);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Coffre ouvert" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Trésor",
          text: "Vous ouvrez le coffre sans trop de difficulté.",
        });
        endTurn(node.id);
        return;
      }

      if (choiceId === "treasure_force") {
        if (pendingChoiceContext.corrupted && Math.random() < 0.4) {
          const mimic = createEnemyFromNode({
            ...node,
            eventType: "battle",
            label: "Mimique",
          });

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage(null);
        setCombatParticipants([currentPlayerIndex]);
        setCombatEnemies([{
          ...mimic,
          name: "☠️ Mimique corrompue",
          hp: Math.floor(mimic.hp * 1.3),
          maxHp: Math.floor(mimic.maxHp * 1.3),
        }]);
        setPhase("COMBAT");
        return;
        }

        const nextPlayer =
          Math.random() < 0.5
            ? addItemToInventory(player, { ...getEliteRewardByCategory("relic")! })
            : { ...player, gold: player.gold + (pendingChoiceContext.corrupted ? 55 : 35) };

        applyPlayerResult(nextPlayer);
        if (pendingChoiceContext.corrupted) {
          addCorruptionCharge(20);
        }

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Coffre forcé" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Butin obtenu",
          text: pendingChoiceContext.corrupted
            ? "Vous arrachez un butin interdit au coffre. La récompense est meilleure, mais la corruption gagne 20 points."
            : "Vous forcez le coffre et récupérez une meilleure récompense.",
        });
        endTurn(node.id);
        return;
      }

      if (choiceId === "treasure_leave") {
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Trésor ignoré" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Prudence",
          text: "Vous laissez le coffre derrière vous.",
        });
        endTurn(node.id);
        return;
      }
    }

    if (pendingChoiceContext.type === "shrine") {
      if (choiceId === "shrine_bless") {
        const nextPlayer = pendingChoiceContext.corrupted
          ? buffPlayerStats(player, { magic: 2, strength: 1 })
          : buffPlayerStats(player, { defense: 1, magic: 1 });

        applyPlayerResult(nextPlayer);
        if (pendingChoiceContext.corrupted) {
          applyPartyCorruptionBoon(
            { magic: 1 },
            15,
            "Bénédiction interdite",
            "L'autel noir abreuve l'équipe de puissance. Le porteur gagne +2 Magie, +1 Force et tous les héros vivants gagnent +1 Magie. En échange, la corruption gagne 15 points."
          );
        }

        markNodeResolved(node.id, "Autel utilisé");

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        if (!pendingChoiceContext.corrupted) {
          setEventMessage({
            title: "Bénédiction",
            text: "L'autel vous bénit.",
          });
        }
        endTurn(node.id);
        return;
      }

      if (choiceId === "shrine_offer") {
        const boostedPlayer = buffPlayerStats(
          player,
          pendingChoiceContext.corrupted
            ? { strength: 2, magic: 2 }
            : { defense: 2 }
        );

        const nextPlayer: Player = {
          ...boostedPlayer,
          stats: {
            ...boostedPlayer.stats,
            hp: Math.max(1, boostedPlayer.stats.hp - (pendingChoiceContext.corrupted ? 15 : 8)),
          },
        };

        applyPlayerResult(nextPlayer);
        if (pendingChoiceContext.corrupted) {
          applyPartyCorruptionBoon(
            { strength: 1, magic: 1 },
            25,
            "Offrande sanglante",
            "Vous nourrissez l'autel avec votre sang. Le porteur gagne +2 Force, +2 Magie et tous les héros vivants gagnent +1 Force, +1 Magie. En échange, la corruption gagne 25 points."
          );
        }

        markNodeResolved(node.id, "Offrande faite");

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        if (!pendingChoiceContext.corrupted) {
          setEventMessage({
            title: "Offrande",
            text: "Votre offrande est acceptée.",
          });
        }
        endTurn(node.id);
        return;
      }
      if (choiceId === "shrine_revive") {
        const hasDeadAlly = players.some((p, idx) => idx !== currentPlayerIndex && p.isDead);

        if (!hasDeadAlly) {
          setEventMessage({
            title: "Silence de l’autel",
            text: "Aucun allié mort ne peut être rappelé.",
          });
          return;
        }

        const { nextPlayers, revivedPlayerName } = reviveDeadAllyFromShrine(
          players,
          currentPlayerIndex,
          pendingChoiceContext.corrupted
        );

        setPlayers(nextPlayers);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Rituel accompli" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);

        setEventMessage({
          title: "Rituel de résurrection",
          text: pendingChoiceContext.corrupted
            ? `${revivedPlayerName} revient d’entre les morts à moitié vivant. L’autel réclame vos forces vitales : vos PV max diminuent.`
            : `${revivedPlayerName} est ramené à la vie. Vous offrez une part de votre vitalité : vos PV max diminuent.`,
        });

        endTurn(node.id);
        return;
      }
      if (choiceId === "shrine_leave") {
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Autel quitté" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Retrait",
          text: "Vous préférez ne rien risquer ici.",
        });
        endTurn(node.id);
        return;
      }
    }

    if (pendingChoiceContext.type === "random") {
      if (choiceId === "random_help") {
        const nextPlayer = pendingChoiceContext.corrupted
          ? {
              ...player,
              stats: {
                ...player.stats,
                hp: Math.max(1, player.stats.hp - 10),
              },
              gold: player.gold + 20,
            }
          : {
              ...player,
              gold: player.gold + 12,
            };

        applyPlayerResult(nextPlayer);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Rencontre résolue" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Rencontre",
          text: pendingChoiceContext.corrupted
            ? "Vous tirez quelque chose du chaos, mais pas sans douleur."
            : "Vous intervenez et en tirez un bénéfice.",
        });
        endTurn(node.id);
        return;
      }

      if (choiceId === "random_search") {
        const nextPlayer =
          Math.random() < 0.5
            ? addItemToInventory(player, { ...getEliteRewardByCategory("consumable")! })
            : buffPlayerStats(player, { magic: 1 });

        applyPlayerResult(nextPlayer);
        if (pendingChoiceContext.corrupted) {
          applyPartyCorruptionBoon(
            { defense: 1 },
            12,
            "Présage du néant",
            "Vous fouillez plus loin que vous n'auriez dû. Toute l'équipe gagne +1 Défense, mais la corruption gagne 12 points."
          );
        }

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Zone fouillée" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        if (!pendingChoiceContext.corrupted) {
          setEventMessage({
            title: "Découverte",
            text: "Votre exploration vous rapporte quelque chose d'utile.",
          });
        }
        endTurn(node.id);
        return;
      }

      if (choiceId === "random_ignore") {
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, isConsumed: true, label: "Rencontre ignorée" } : n
          )
        );

        setPendingEventNodeId(null);
        setPendingChoiceContext(null);
        setEventMessage({
          title: "Vous passez",
          text: "Vous ignorez l'événement et continuez.",
        });
        endTurn(node.id);
        return;
      }
    }
  };
  
  const getBossEngageText = () => getBossEngageTextFromEngine(currentFloorStatues);


  const handleNodeClick = (nodeId: number) => {
    if (phase !== "MOVE" || !currentPlayer) return;

    const current = nodes.find((n) => n.id === currentPlayer.currentNode);
    if (!current) return;
    if (
      pendingNodeInteraction &&
      pendingNodeInteraction.nodeId === current.id
    ) {
      setPhase("EVENT");
      setEventMessage(getNodeInteractionPrompt(current, currentFloorStatues, "resume_current"));
      return;
    }
    if (!current.neighbors.includes(nodeId)) return;

    const targetNode = nodes.find((n) => n.id === nodeId);
    const waitingOnThisNode =
    pendingNodeInteraction && pendingNodeInteraction.nodeId === nodeId;
    if (!targetNode) return;

    dispatchGameAction({
      type: "MOVE_PLAYER",
      playerId: currentPlayer.id,
      nodeId,
      previousNode: current.id,
      revealAroundTarget: true,
    });

    if (waitingOnThisNode) {
      setPendingNodeInteraction({
        nodeId,
        playerIndex: pendingNodeInteraction.playerIndex,
      });

      setPhase("EVENT");
      setEventMessage(getNodeInteractionPrompt(targetNode, currentFloorStatues, "waiting_here"));

      return;
    }
    if (requiresNodeInteractionChoice(targetNode)) {
      setPendingNodeInteraction({
        nodeId,
        playerIndex: currentPlayerIndex,
      });

      setPhase("EVENT");

      setEventMessage(getNodeInteractionPrompt(targetNode, currentFloorStatues, "first_contact"));

      return;
    }

    setPhase("EVENT");
    triggerEvent(nodeId);
  };

  
  const handleWinCombat = (results: CombatResultPlayer[]) => {
    const currentNode = nodes.find((n) => n.id === currentPlayer?.currentNode);
    const primaryEnemy = combatEnemies[0] ?? null;
    const xpGained = primaryEnemy ? getXpReward(primaryEnemy, currentNode) : 25;
    const recapPlayers = buildCombatRecapPlayers(results);
    const xpStates = buildCombatXpStates(xpGained);

    if (currentNode?.type === "boss") {
      openCombatResultModal({
        kind: "victory",
        title: "Boss vaincu",
        summary: "Le gardien s'effondre. La route vers l'étage suivant s'ouvre.",
        xp: xpGained,
        players: recapPlayers,
        xpStates,
        onCloseAction: () => {
          setCombatEnemies([]);
          setPendingNodeInteraction(null);
          setCombatParticipants([]);
          setPhase("EVENT");
          
          const transition = prepareNextFloorTransition(
            currentFloor,
            createScopedRandom(runSeed, `floor:${currentFloor + 1}`),
          );

          if (transition.kind === "victory") {
            setCombatEnemies([]);
            setPendingNodeInteraction(null);
            setCombatParticipants([]);
            setVictory(true);
            return;
          }

          const { floorState } = transition;

          setCurrentFloorBiome(floorState.currentFloorBiome);
          setNodes(floorState.nodes);
          setMapWidth(floorState.mapWidth);
          setMapHeight(floorState.mapHeight);
          setCurrentFloor(floorState.currentFloor);
          setCorruptionLevel(floorState.corruptionLevel);
          setCorruptionCharge(floorState.corruptionCharge);
          setCorruptedNodeIds(floorState.corruptedNodeIds);
          setCurrentFloorStatues(floorState.currentFloorStatues);
          setFloorCorruptionTurn(floorState.floorCorruptionTurn);
          setPhase("MOVE");
          setPreviousNode(null);

          setPlayers((prev) =>
            reviveDeadPlayersAtNewFloor(prev).map((p) => ({
              ...p,
              currentNode: floorState.startNodeId,
            }))
          );

          showEventMessage(
            "Étage suivant",
            `Vous descendez vers l'étage ${floorState.currentFloor}. Les alliés tombés se relèvent avec 50 % de leurs PV.`
          );
        },
      });
      return;
    }

    setCombatEnemies([]);
    setPendingNodeInteraction(null);
    setCombatParticipants([]);

    let rewardLabels: string[] = [];

    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) => {
        if (!combatParticipants.includes(idx)) return p;

        const result = results.find((r) => r.playerId === p.id);
        if (!result) return p;

        const baseStats = restorePersistentPlayerStatsFromCombat(p, result.stats);

        let updatedBasePlayer: Player = consumeCombatMapEffects({
          ...p,
          stats: baseStats,
          statuses: result.statuses,
          isDead: result.isDead,
        });

        const isEliteSource =
          combatEnemies[0]?.sourceTag === "elite" ||
          currentNode?.eventType === "elite";

        if (isEliteSource) {
          const rewardItem = primaryEnemy?.rewardCategory
            ? getEliteRewardByCategory(primaryEnemy.rewardCategory)
            : null;

          if (rewardItem) {
            updatedBasePlayer = addItemToInventory(updatedBasePlayer, rewardItem);
            rewardLabels.push(rewardItem.name);
          } else {
            updatedBasePlayer = {
              ...updatedBasePlayer,
              gold: updatedBasePlayer.gold + 30,
            };
            rewardLabels.push("30 or");
          }
        }

        if (primaryEnemy?.grantsStatueOnWin) {
          setCurrentFloorStatues((prev) => Math.min(REQUIRED_STATUES, prev + 1));

          setNodes((prevNodes) =>
            prevNodes.map((n) =>
              n.id === currentNode?.id
                ? { ...n, isConsumed: true, label: "Statuette récupérée" }
                : n
            )
          );

          setEventMessage({
            title: "Gardien vaincu",
            text: "Le gardien s'effondre. Vous récupérez la statuette.",
          });
        }

        if (
          currentNode &&
          (
            currentNode.eventType === "merchant_blacksmith" ||
            currentNode.eventType === "merchant_alchemist" ||
            currentNode.eventType === "merchant_mystic"
          ) &&
          primaryEnemy?.name.includes("corrompu")
        ) {
          setNodes((prevNodes) =>
            prevNodes.map((n) =>
              n.id === currentNode.id
                ? {
                    ...n,
                    eventType: "battle",
                    label: "Combat corrompu",
                    isConsumed: false,
                  }
                : n
            )
          );
        }

        return applyXpAndLevelUp(updatedBasePlayer, xpGained, handleLevelUp);
      })
    );

    openCombatResultModal({
      kind: "victory",
      title: currentNode?.eventType === "elite" ? "Élite vaincue" : "Victoire",
      summary:
        currentNode?.eventType === "elite"
          ? "L'ennemi d'élite a été abattu."
          : "Le combat se termine à votre avantage.",
      xp: xpGained,
      rewards: rewardLabels,
      players: recapPlayers,
      xpStates,
      onCloseAction: () => {
        endTurn();
      },
    });
  };

  const handleDefeatCombat = (results: CombatResultPlayer[]) => {
    const recapPlayers = buildCombatRecapPlayers(results);

    setCombatEnemies([]);
    setPendingNodeInteraction(null);
    setCombatParticipants([]);
    setPendingEventNodeId(null);
    setPendingChoiceContext(null);
    setEventMessage(null);

    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) => {
        if (!combatParticipants.includes(idx)) return p;

        const result = results.find((r) => r.playerId === p.id);

        return {
          ...p,
          isDead: result?.isDead ?? true,
          stats: {
            ...p.stats,
            hp: result?.isDead ? 0 : (result?.stats.hp ?? p.stats.hp),
            mana: result?.stats.mana ?? p.stats.mana,
          },
          statuses: result?.statuses ?? p.statuses ?? [],
        };
      })
    );

    openCombatResultModal({
      kind: "defeat",
      title: "Défaite",
      summary: "Le groupe a été brisé par l'ennemi.",
      players: recapPlayers,
      onCloseAction: () => {
        setGameOver(true);
      },
    });
  };

  const handleFleeCombat = (results: CombatResultPlayer[]) => {
    const recapPlayers = buildCombatRecapPlayers(results);

    setCombatEnemies([]);
    setPendingNodeInteraction(null);
    setCombatParticipants([]);

    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) => {
        if (!combatParticipants.includes(idx)) return p;

        const result = results.find((r) => r.playerId === p.id);
        if (!result) return p;

        const baseStats = restorePersistentPlayerStatsFromCombat(p, result.stats);

        return consumeCombatMapEffects({
          ...p,
          stats: baseStats,
          statuses: result.statuses,
          isDead: result.isDead,
        });
      })
    );

    openCombatResultModal({
      kind: "flee",
      title: "Retraite",
      summary: "Le groupe quitte le combat et bat en retraite.",
      players: recapPlayers,
      onCloseAction: () => {
        endTurn();
      },
    });
  };

  const addPlayer = () => {
    const trimmedName = playerName.trim();
    if (!trimmedName || players.length >= MAX_PLAYERS) return;

    dispatchGameAction({
      type: "ADD_PLAYER",
      name: trimmedName,
      classType: selectedClass,
    });

    setPlayerName("");
  };
  const markNodeConsumed = (nodeId: number) => {
    setNodes((prevNodes) => markNodeConsumedInMap(prevNodes, nodeId));
  };

  const continueSavedRun = () => {
    const rawSavedRun = loadRun();
    if (!rawSavedRun) {
      setSavedRunInfo(null);
      return;
    }

    const savedRun = fromRunSave(rawSavedRun);

    setRunSeed(savedRun.runSeed ?? createRunSeed());
    setPlayers(savedRun.players);
    setCurrentPlayerIndex(savedRun.currentPlayerIndex);
    setCurrentFloor(savedRun.currentFloor);
    setCurrentFloorBiome(savedRun.currentFloorBiome);
    setNodes(savedRun.nodes);
    setMapWidth(savedRun.mapWidth);
    setMapHeight(savedRun.mapHeight);
    setPreviousNode(savedRun.previousNode);
    setCorruptionLevel(savedRun.corruptionLevel);
    setCorruptionCharge(savedRun.corruptionCharge);
    setCorruptedNodeIds(savedRun.corruptedNodeIds);
    setFloorCorruptionTurn(savedRun.floorCorruptionTurn);
    setCurrentFloorStatues(savedRun.currentFloorStatues);

    setPhase(DEFAULT_RUNTIME_RESET_STATE.phase);
    setPendingChoiceContext(DEFAULT_RUNTIME_RESET_STATE.pendingChoiceContext);
    setPendingEventNodeId(DEFAULT_RUNTIME_RESET_STATE.pendingEventNodeId);
    setPendingNodeInteraction(DEFAULT_RUNTIME_RESET_STATE.pendingNodeInteraction);
    setCombatParticipants(DEFAULT_RUNTIME_RESET_STATE.combatParticipants);
    setCombatEnemies([]);
    setEventMessage(null);
    setMerchantOpen(false);
    setMerchantType(null);
    setMerchantStock([]);
    setCombatResultModal((prev) => ({ ...prev, open: false, onCloseAction: undefined }));
    setLevelUpOpen(false);
    setLastLevelUp(null);
    setActiveSidePanel(null);
    setHelpOpen(false);
    setGameOver(false);
    setVictory(false);
    setGameStarted(true);
    setSavedRunInfo(null);
  };

  const clearSavedRun = () => {
    deleteRun();
    setSavedRunInfo(null);
  };

  const startGame = () => {
    const nextRunSeed = createRunSeed();
    const runMapState = prepareFloorState(1, createScopedRandom(nextRunSeed, "floor:1"));

    dispatchGameAction({
      type: "START_RUN",
      runSeed: nextRunSeed,
      floorState: runMapState,
    });

    setPhase(DEFAULT_RUNTIME_RESET_STATE.phase);
    setPendingChoiceContext(DEFAULT_RUNTIME_RESET_STATE.pendingChoiceContext);
    setPendingEventNodeId(DEFAULT_RUNTIME_RESET_STATE.pendingEventNodeId);
    setPendingNodeInteraction(DEFAULT_RUNTIME_RESET_STATE.pendingNodeInteraction);
    setCombatParticipants(DEFAULT_RUNTIME_RESET_STATE.combatParticipants);
    setGameOver(false);
    setVictory(false);
    setGameStarted(true);
  };

  useEffect(() => {
    if (!gameStarted || !mapRef.current || !currentPlayer || currentPlayer.isDead) return;

    const node = nodes.find((n) => n.id === currentPlayer.currentNode);
    if (!node) return;

    mapRef.current.scrollTo({
      left: node.x - window.innerWidth / 2,
      top: node.y - window.innerHeight / 2,
      behavior: "smooth",
    });
  }, [currentPlayerIndex, gameStarted, currentPlayer, nodes]);

  useEffect(() => {
    if (!pendingNodeInteraction || !currentPlayer || phase !== "MOVE") return;

    if (currentPlayer.currentNode === pendingNodeInteraction.nodeId) {
      const currentNode = nodes.find((n) => n.id === pendingNodeInteraction.nodeId);
      if (!currentNode) return;

      setPhase("EVENT");
      setEventMessage({
        title: currentNode.type === "boss" ? "Boss en attente" : "Combat en attente",
        text:
          currentNode.type === "boss"
            ? "Vous êtes devant le boss. Voulez-vous lancer le combat maintenant ou continuer à attendre ?"
            : "Vous êtes sur une zone hostile. Voulez-vous lancer le combat maintenant ou continuer à attendre ?",
        choices: [
          {
            id: "engage_battle",
            label: "Engager le combat",
            description: "Lancer le combat immédiatement.",
          },
          {
            id: "wait_for_party",
            label: "Attendre les autres",
            description: "Rester sur place et passer le tour.",
          },
        ],
      });
    }
  }, [pendingNodeInteraction, currentPlayer, phase, nodes]);

  if (victory) {
    return <GameEndScreen variant="victory" />;
  }

  if (gameOver) {
    return <GameEndScreen variant="defeat" />;
  }

  return (
    <div className="min-h-screen bg-black text-amber-50 overflow-hidden font-sans">
      <GlobalStyles />

      <AnimatePresence>
        {!gameStarted ? (
          <LobbyScreen
            playerName={playerName}
            selectedClass={selectedClass}
            players={players}
            setPlayerName={setPlayerName}
            setSelectedClass={setSelectedClass}
            addPlayer={addPlayer}
            startGame={startGame}
            savedRunInfo={savedRunInfo}
            continueSavedRun={continueSavedRun}
            clearSavedRun={clearSavedRun}
          />
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col relative"
          >
          <GameHUD
            currentPlayer={currentPlayer}
            currentFloor={currentFloor}
            floorBiome={currentFloorBiome}
            currentFloorStatues={currentFloorStatues}
            requiredStatues={REQUIRED_STATUES}
          />
            {!isMobile && <SideToolbar activeSidePanel={activeSidePanel} onToggle={toggleSidePanel} />}
            <CharacterPanel
              player={currentPlayer}
              activeTab={activeSidePanel}
              onUseItem={handleUseItem}
              onEquipItem={handleEquipItem}
              onUnequipSlot={handleUnequipSlot}
              isMobile={isMobile}
              onClose={() => setActiveSidePanel(null)}
            />
            <GameMap
              mapRef={mapRef}
              mapWidth={mapWidth}
              mapHeight={mapHeight}
              floorBiome={currentFloorBiome}
              nodes={nodes}
              players={players}
              currentPlayer={currentPlayer}
              phase={phase}
              handleNodeClick={handleNodeClick}
              isNodeCorrupted={isNodeCorruptedLocal}
              currentFloorStatues={currentFloorStatues}
              requiredStatues={REQUIRED_STATUES}
            />

            <div className="absolute bottom-10 right-10 z-40 hidden flex-col items-end gap-3 md:flex">
              <div className="bg-black/90 text-violet-100 px-5 py-3 rounded border border-violet-500 backdrop-blur-sm shadow-[0_0_15px_rgba(168,117,255,0.4)] text-base">
                Cliquez sur un nœud voisin pour vous déplacer
              </div>
              <CorruptionPanel
                corruptionLevel={corruptionLevel}
                corruptionLevelLabel={corruptionLevelLabel}
                corruptionCharge={corruptionCharge}
                corruptionChargeMax={CORRUPTION_CHARGE_MAX}
                floorCorruptionTurn={floorCorruptionTurn}
                floorCorruptionStartDelay={FLOOR_CORRUPTION_START_DELAY}
                floorCorruptionInterval={FLOOR_CORRUPTION_INTERVAL}
                corruptedNodesCount={corruptedNodeIds.length}
              />
            </div>

            <div className="absolute inset-x-3 bottom-20 z-40 rounded-2xl border border-violet-700 bg-black/85 px-4 py-3 text-center text-sm text-violet-100 shadow-[0_0_15px_rgba(168,117,255,0.25)] backdrop-blur-sm md:hidden">
              Touchez un nœud voisin pour vous déplacer.
            </div>

            <MobileActionSheet
              open={isMobile && mobileCorruptionOpen}
              title="Corruption"
              onClose={() => setMobileCorruptionOpen(false)}
            >
              <CorruptionPanel
                corruptionLevel={corruptionLevel}
                corruptionLevelLabel={corruptionLevelLabel}
                corruptionCharge={corruptionCharge}
                corruptionChargeMax={CORRUPTION_CHARGE_MAX}
                floorCorruptionTurn={floorCorruptionTurn}
                floorCorruptionStartDelay={FLOOR_CORRUPTION_START_DELAY}
                floorCorruptionInterval={FLOOR_CORRUPTION_INTERVAL}
                corruptedNodesCount={corruptedNodeIds.length}
              />
            </MobileActionSheet>

            <EventModal
              eventMessage={eventMessage}
              onClose={() => {
                setEventMessage(null);
                if (
                  phase === "EVENT" &&
                  pendingEventNodeId === null &&
                  pendingNodeInteraction === null
                ) {
                  setPhase("MOVE");
                }
              }}
              onChoice={handleEventChoice}
            />
            <CombatResultModal
              open={combatResultModal.open}
              kind={combatResultModal.kind}
              title={combatResultModal.title}
              summary={combatResultModal.summary}
              xp={combatResultModal.xp}
              gold={combatResultModal.gold}
              rewards={combatResultModal.rewards}
              players={combatResultModal.players}
              xpStates={combatResultModal.xpStates}
              onClose={closeCombatResultModal}
            />
            {combatEnemies.length > 0 && combatPlayers.length > 0 && (
              <CombatOverlay
                players={combatPlayers}
                enemies={combatEnemies}
                onWin={(results) => {
                  handleWinCombat(results);
                }}
                onDefeat={(results) => {
                  handleDefeatCombat(results);
                }}
                onFlee={(results) => {
                  handleFleeCombat(results);
                }}
              />
            )}
            <HelpShortcuts open={helpOpen} onToggle={() => setHelpOpen((prev) => !prev)} />
            {isMobile && (
              <MobileBottomNav
                activeSidePanel={activeSidePanel}
                corruptionOpen={mobileCorruptionOpen}
                onTogglePanel={(panel) => {
                  setMobileCorruptionOpen(false);
                  toggleSidePanel(panel);
                }}
                onToggleCorruption={() => {
                  setActiveSidePanel(null);
                  setMobileCorruptionOpen((prev) => !prev);
                }}
                onToggleHelp={() => setHelpOpen((prev) => !prev)}
              />
            )}
          <MerchantModal
            open={merchantOpen}
            merchantName={
              merchantType === "merchant_blacksmith"
                ? "Forgeron"
                : merchantType === "merchant_alchemist"
                ? "Alchimiste"
                : merchantType === "merchant_mystic"
                ? "Mystique"
                : "Marchand"
            }
            stock={merchantStock}
            player={currentPlayer}
            onBuy={handleBuyFromMerchant}
            onSell={handleSellToMerchant}
            onClose={handleCloseMerchant}
          />
          <LevelUpModal
            open={levelUpOpen}
            playerName={lastLevelUp?.playerName || ""}
            classType={lastLevelUp?.classType || "Guerrier"}
            level={lastLevelUp?.level || 1}
            growth={lastLevelUp?.growth || null}
            newSkills={lastLevelUp?.newSkills || []}
            onClose={() => setLevelUpOpen(false)}
          />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}