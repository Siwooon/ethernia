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
import CombatResultModal from "./CombatResultModal";

import { equipInventoryItem,unequipInventorySlot, consumeItem, addItemToInventory, buyItem, sellItem  } from "@/app/component/lib/inventory";
import { FLOORS, FloorBiome } from "@/app/component/data/floors";
import { PLAYER_PASSIVES } from "@/app/component/lib/passives";

import MerchantModal from "./MerchantModal";
import { getMerchantStock, MerchantType } from "@/app/component/data/merchantStocks";
import {
  restorePersistentPlayerStatsFromCombat,
} from "@/app/component/lib/playerStats";
import { addMapEffect, applyEndTurnMapEffects, consumeCombatMapEffects } from "@/app/component/lib/mapEffects";
import { CLASSES } from "@/app/component/data/classes";
import { generateGridMap } from "@/app/component/lib/generateGridMap";
import { resolveNodeEvent } from "@/app/component/lib/eventSystem";
import { EventChoiceAction } from "@/app/component/types/game";
import { createEnemyFromNode } from "@/app/component/lib/enemies";


import {
  applyXpAndLevelUp,
  buffPlayerStats,
  getXpReward,
} from "@/app/component/lib/gameProgression";

import { ClassType, Enemy, MapNode, Player, Stats, StatusEffect } from "@/app/component/types/game";
import CombatOverlay, { CombatResultPlayer } from "@/app/component/game/CombatOverlay";
import { getEliteRewardByCategory } from "@/app/component/data/items";

type PendingChoiceContext =
  | { type: "statuette"; corrupted?: boolean }
  | { type: "rest"; corrupted: boolean }
  | { type: "treasure"; corrupted: boolean }
  | { type: "shrine"; corrupted: boolean }
  | { type: "random"; corrupted: boolean };


export default function EtherniaGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassType>("Guerrier");
  const [gameOver, setGameOver] = useState(false);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [mapWidth, setMapWidth] = useState(3600);
  const [activeSidePanel, setActiveSidePanel] = useState<"stats" | "inventory" | "equipment" | "passives" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
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

  const [combatEnemy, setCombatEnemy] = useState<Enemy | null>(null);
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
  const [merchantStock, setMerchantStock] = useState<import("@/app/component/types/game").InventoryItem[]>([]);

  const [currentFloorStatues, setCurrentFloorStatues] = useState(0);
  const REQUIRED_STATUES = 2;

  const showEventMessage = (title: string, text: string) => {
    setEventMessage({ title, text });
  };
  
  const floorData = FLOORS.find((f) => f.floor === currentFloor);
  const FLOOR_CORRUPTION_START_DELAY = 12;
  const FLOOR_CORRUPTION_INTERVAL = 6;

  const CORRUPTION_CHARGE_MAX = 100;

  const getBossWeakeningLabel = () => {
    if (currentFloorStatues >= 2) return "Boss normal";
    if (currentFloorStatues === 1) return "Boss partiellement affaibli";
    return "Boss déchaîné";
  };
  
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

  const buildCombatRecapPlayers = (results: CombatResultPlayer[]) => {
    return combatParticipants
      .map((idx) => players[idx])
      .filter((p): p is Player => Boolean(p))
      .map((p) => {
        const result = results.find((r) => r.playerId === p.id);
        const stats = result?.stats ?? p.stats;

        return {
          name: p.name,
          hp: stats.hp,
          maxHp: stats.maxHp,
          mana: stats.mana,
          maxMana: stats.maxMana,
          isDead: result?.isDead ?? p.isDead,
        };
      });
  };

  const buildCombatXpStates = (xpGained: number) => {
    return combatParticipants
      .map((idx) => players[idx])
      .filter((p): p is Player => Boolean(p))
      .map((p) => ({
        playerId: p.id,
        playerName: p.name,
        level: p.level,
        currentXp: p.xp,
        xpToNextLevel: p.xpToNextLevel,
        gainedXp: xpGained,
    }));
  };

  const reviveDeadAllyFromShrine = (
    roster: Player[],
    sacrificerIndex: number,
    corrupted: boolean
  ): { nextPlayers: Player[]; revivedPlayerName: string | null } => {
    const deadIndex = roster.findIndex((p, idx) => idx !== sacrificerIndex && p.isDead);
    if (deadIndex === -1) {
      return { nextPlayers: roster, revivedPlayerName: null };
    }

    const hpMaxCost = corrupted ? 20 : 12;

    const nextPlayers = roster.map((p, idx) => {
      if (idx === sacrificerIndex) {
        const nextMaxHp = Math.max(20, p.stats.maxHp - hpMaxCost);
        return {
          ...p,
          stats: {
            ...p.stats,
            maxHp: nextMaxHp,
            hp: Math.min(p.stats.hp, nextMaxHp),
          },
        };
      }

      if (idx === deadIndex) {
        const revivedHp = Math.max(1, Math.floor(p.stats.maxHp * 0.5));
        return {
          ...p,
          isDead: false,
          stats: {
            ...p.stats,
            hp: revivedHp,
          },
        };
      }

      return p;
    });

    return {
      nextPlayers,
      revivedPlayerName: roster[deadIndex]?.name ?? null,
    };
  };

  const reviveDeadPlayersAtNewFloor = (roster: Player[]): Player[] => {
    return roster.map((p) => {
      if (!p.isDead) return p;

      const revivedHp = Math.max(1, Math.floor(p.stats.maxHp * 0.5));

      return {
        ...p,
        isDead: false,
        stats: {
          ...p.stats,
          hp: revivedHp,
        },
      };
    });
  };

  const requiresNodeInteractionChoice = (node: MapNode) => {
    return (
      node.eventType === "battle" ||
      node.eventType === "elite" ||
      node.type === "boss"
    );
  };

  const applyPlayerResult = (playerResult: Player) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) => {
        if (idx !== currentPlayerIndex) return p;

        return {
          ...p,
          stats: playerResult.stats,
          level: playerResult.level,
          xp: playerResult.xp,
          xpToNextLevel: playerResult.xpToNextLevel,
          isDead: playerResult.isDead,
          inventory: playerResult.inventory,
          equipment: playerResult.equipment,
          gold: playerResult.gold,
          statuses: playerResult.statuses,
          mapEffects: playerResult.mapEffects,
          traits: playerResult.traits ?? [],
          currentNode: p.currentNode,
        };
      })
    );
  };

    const shouldExpandFloorCorruption = (turn: number) => {
      if (turn < FLOOR_CORRUPTION_START_DELAY) return false;

      return (
        (turn - FLOOR_CORRUPTION_START_DELAY) % FLOOR_CORRUPTION_INTERVAL === 0
      );
    };

    const pickFloorBiome = (floor: typeof floorData): FloorBiome => {
      if (!floor || !floor.biomePool?.length) return "forest";
      return floor.biomePool[Math.floor(Math.random() * floor.biomePool.length)];
    };

    const getCorruptionLevelLabel = (level: number) => {
      if (level >= 4) return "Critique";
      if (level >= 3) return "Sévère";
      if (level >= 2) return "Pesante";
      if (level >= 1) return "Instable";
      return "Faible";
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
    newSkills: import("@/app/component/types/game").PlayerSkill[];
  } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const currentPlayer = players[currentPlayerIndex];
  const combatPlayers = combatParticipants
    .map((idx) => players[idx])
    .filter((p): p is Player => Boolean(p));

  const toggleSidePanel = (panel: "stats" | "inventory" | "equipment" | "passives") => {
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

    const expandCorruptionFront = (
      allNodes: MapNode[],
      currentCorruptedIds: number[],
      steps: number = 1
      ) => {
      let corrupted = new Set(currentCorruptedIds);

      for (let i = 0; i < steps; i++) {
        const next = new Set(corrupted);

        for (const node of allNodes) {
          if (!corrupted.has(node.id)) continue;

          for (const neighborId of node.neighbors) {
            const neighbor = allNodes.find((n) => n.id === neighborId);
            if (!neighbor) continue;
            if (neighbor.type === "start") continue;

            next.add(neighbor.id);
          }
        }

        corrupted = next;
      }

      return Array.from(corrupted);
  };

  const addCorruptionCharge = (amount: number) => {
    setCorruptionCharge((prevCharge) => {
      const total = prevCharge + amount;
      const levelUps = Math.floor(total / CORRUPTION_CHARGE_MAX);
      const nextCharge = total % CORRUPTION_CHARGE_MAX;

      if (levelUps > 0) {
        setCorruptionLevel((prevLevel) => prevLevel + levelUps);
        setCorruptedNodeIds((prevIds) =>
          expandCorruptionFront(nodes, prevIds, levelUps)
        );

        setEventMessage({
          title: "La corruption progresse",
          text: `La corruption gagne du terrain. Niveau +${levelUps}.`,
        });
      }

      return nextCharge;
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
    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === nodeId ? { ...n, isConsumed: true, label } : n
      )
    );
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
    newSkills: import("@/app/component/types/game").PlayerSkill[];
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
          idx === currentPlayerIndex
            ? {
                ...p,
                stats: {
                  ...p.stats,
                  hp: Math.max(1, p.stats.hp - 5),
                },
              }
            : p
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

    if (players.length === 0) return;

    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let loopCount = 0;

    while (players[nextIndex].isDead && loopCount < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      loopCount++;
    }

    if (
      loopCount >= players.length ||
      (loopCount === players.length - 1 && players[nextIndex].isDead)
    ) {
      setGameOver(true);
    } else {
      setCurrentPlayerIndex(nextIndex);
      setPhase("MOVE");
    }
  };

  const triggerEvent = (nodeId: number) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !currentPlayer) return;

    if (node.kind === "stairs") {
      setEventMessage({
        title: "Escalier",
        text: "Vous avez trouvé la sortie de l'étage.",
      });
      endTurn();
      return;
    }
    // Si la case n'est plus activable, on passe juste le tour
    if (!canTriggerNodeEvent(node)) {
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
        setCombatEnemy(result.enemy);
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

  const handleBuyFromMerchant = (item: import("@/app/component/types/game").InventoryItem) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? buyItem(p, item) : p
      )
    );
  };

  const isNodeCorruptedLocal = (node: MapNode) => {
    return corruptedNodeIds.includes(node.id);
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
        const participants = players
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => !p.isDead && p.currentNode === interactionNode.id)
          .map(({ idx }) => idx);

        setCombatParticipants(participants);

        const enemy = createEnemyFromNode(interactionNode);

        setEventMessage(null);
        setPendingNodeInteraction(null);
        setCombatEnemy(enemy);
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
        setCombatEnemy(eliteGuardian);
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
        setCombatEnemy({
          ...mimic,
          name: "☠️ Mimique corrompue",
          hp: Math.floor(mimic.hp * 1.3),
          maxHp: Math.floor(mimic.maxHp * 1.3),
        });
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
  
  const getBossEngageText = () => {
    if (currentFloorStatues === 0) {
      return "Le boss est devant vous. Aucune statuette n’a été récupérée : il sera déchaîné. Voulez-vous lancer le combat maintenant ou attendre les autres joueurs ?";
    }

    if (currentFloorStatues === 1) {
      return "Le boss est devant vous. Une seule statuette a été récupérée : il restera renforcé. Voulez-vous lancer le combat maintenant ou attendre les autres joueurs ?";
    }

    return "Le boss est devant vous. Il a été correctement affaibli. Voulez-vous lancer le combat maintenant ou attendre les autres joueurs ?";
  };

  const handleNodeClick = (nodeId: number) => {
    if (phase !== "MOVE" || !currentPlayer) return;

    const current = nodes.find((n) => n.id === currentPlayer.currentNode);
    if (!current) return;
    if (
      pendingNodeInteraction &&
      pendingNodeInteraction.nodeId === current.id
    ) {
      setPhase("EVENT");
      setEventMessage({
        title: current.type === "boss" ? "Boss en attente" : "Combat en attente",
        text:
          current.type === "boss"
            ? getBossEngageText()
            : current.eventType === "elite"
            ? "Un ennemi d'élite bloque le passage. Voulez-vous engager le combat maintenant ou attendre les autres joueurs ?"
            : "Un combat vous attend sur cette case. Voulez-vous engager le combat maintenant ou attendre les autres joueurs ?",
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
      return;
    }
    if (!current.neighbors.includes(nodeId)) return;

    const targetNode = nodes.find((n) => n.id === nodeId);
    const waitingOnThisNode =
    pendingNodeInteraction && pendingNodeInteraction.nodeId === nodeId;
    if (!targetNode) return;

    setPreviousNode(current.id);

    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? { ...p, currentNode: nodeId } : p
      )
    );

    setNodes((prevNodes) => revealAroundNode(prevNodes, nodeId));

    if (waitingOnThisNode) {
      setPendingNodeInteraction({
        nodeId,
        playerIndex: pendingNodeInteraction.playerIndex,
      });

      setPhase("EVENT");
      setEventMessage({
        title: targetNode.type === "boss" ? "Boss en attente" : "Combat en attente",
        text: "Un autre joueur attend déjà ici. Voulez-vous rejoindre le combat ou attendre avec lui ?",
        choices: [
          {
            id: "engage_battle",
            label: "Lancer le combat",
            description: "Commencer le combat avec tous les joueurs présents.",
          },
          {
            id: "wait_for_party",
            label: "Se joindre à l'attente",
            description: "Rester sur place et attendre encore.",
          },
        ],
      });

      return;
    }
    if (requiresNodeInteractionChoice(targetNode)) {
      setPendingNodeInteraction({
        nodeId,
        playerIndex: currentPlayerIndex,
      });

      setPhase("EVENT");

      setEventMessage({
        title:
          targetNode.type === "boss"
            ? "Boss repéré"
            : targetNode.eventType === "elite"
            ? "Ennemi d'élite"
            : "Zone hostile",
        text:
          targetNode.type === "boss"
            ? getBossEngageText()
            : targetNode.eventType === "elite"
            ? "Un ennemi d'élite bloque le passage. Voulez-vous engager le combat maintenant ou attendre les autres joueurs ?"
            : "Un combat vous attend sur cette case. Voulez-vous engager le combat maintenant ou attendre les autres joueurs ?",
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

      return;
    }

    setPhase("EVENT");
    triggerEvent(nodeId);
  };

  
  const handleWinCombat = (results: CombatResultPlayer[]) => {
    const currentNode = nodes.find((n) => n.id === currentPlayer?.currentNode);
    const xpGained = combatEnemy ? getXpReward(combatEnemy, currentNode) : 25;
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
          setCombatEnemy(null);
          setPendingNodeInteraction(null);
          setCombatParticipants([]);
          setPhase("EVENT");
          
          const nextFloor = currentFloor + 1;

          if (nextFloor > FLOORS.length) {
            setCombatEnemy(null);
            setPendingNodeInteraction(null);
            setCombatParticipants([]);
            setVictory(true);
            return;
          }

          const nextFloorData = FLOORS.find((f) => f.floor === nextFloor);
          const nextBiome = pickFloorBiome(nextFloorData);
          const generated = generateGridMap({ biome: nextBiome });
          setCurrentFloorBiome(nextBiome);

          const startNode = generated.nodes.find((n) => n.kind === "start");
          const startNodeId = startNode?.id ?? 0;
          const revealedNodes = revealAroundNode(generated.nodes, startNodeId);

          setNodes(revealedNodes);
          setMapWidth(generated.width);
          setMapHeight(generated.height);
          setCurrentFloor(nextFloor);
          setCorruptionLevel(0);
          setCorruptionCharge(0);
          setCorruptedNodeIds([startNodeId]);
          setCurrentFloorStatues(0);
          setFloorCorruptionTurn(0);
          setPhase("MOVE");
          setPreviousNode(null);

          setPlayers((prev) =>
            reviveDeadPlayersAtNewFloor(prev).map((p) => ({
              ...p,
              currentNode: startNodeId,
            }))
          );

          showEventMessage(
            "Étage suivant",
            `Vous descendez vers l'étage ${nextFloor}. Les alliés tombés se relèvent avec 50 % de leurs PV.`
          );
        },
      });
      return;
    }

    setCombatEnemy(null);
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
          combatEnemy?.sourceTag === "elite" ||
          currentNode?.eventType === "elite";

        if (isEliteSource) {
          const rewardItem = combatEnemy?.rewardCategory
            ? getEliteRewardByCategory(combatEnemy.rewardCategory)
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

        if (combatEnemy?.grantsStatueOnWin) {
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
          combatEnemy?.name.includes("corrompu")
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

    setCombatEnemy(null);
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

    setCombatEnemy(null);
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

    const getStartingPassives = (classType: ClassType) => {
      switch (classType) {
        case "Guerrier":
          return [PLAYER_PASSIVES.iron_skin()];
        case "Mage":
          return [PLAYER_PASSIVES.mana_surge()];
        case "Archer":
          return [PLAYER_PASSIVES.eagle_eye()];
        case "Voleur":
          return [PLAYER_PASSIVES.toxic_blade()];
        case "Demoniste":
          return [PLAYER_PASSIVES.soul_feast()];
        case "Clerc":
          return [PLAYER_PASSIVES.divine_reserve()];
        default:
          return [];
      }
    };

  const addPlayer = () => {
    if (!playerName.trim() || players.length >= 5) return;

    const c = CLASSES[selectedClass];

    setPlayers((prev) => [
      
      ...prev,
        {
          id: prev.length + 1,
          name: playerName.trim(),
          classType: selectedClass,
          stats: { ...c.stats },
          currentNode: 0,
          image: c.image,
          portrait: c.portrait,
          isDead: false,
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          statuses: [],
          mapEffects: [],
          passives: getStartingPassives(selectedClass),
          traits: [],
          gold: 50,
          inventory: [],
          equipment: {
            weapon: null,
            armor: null,
            relic: null,
          },
        }
    ]);

    setPlayerName("");
  };
  const isMerchantNode = (node: MapNode) => {
    return (
      node.eventType === "merchant_blacksmith" ||
      node.eventType === "merchant_alchemist" ||
      node.eventType === "merchant_mystic"
    );
  };

  const canTriggerNodeEvent = (node: MapNode) => {
    if (node.type === "start") return false;
    if (node.kind === "stairs") return false;
    if (node.type === "boss") return true;
    if (isMerchantNode(node)) return true;

    const corrupted = isNodeCorruptedLocal(node);

    if (!node.isConsumed) return true;
    if (corrupted) return true;

    return false;
  };

  const markNodeConsumed = (nodeId: number) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId && !isMerchantNode(node) && node.type !== "boss"
          ? { ...node, isConsumed: true }
          : node
      )
    );
  };

  const revealAroundNode = (allNodes: MapNode[], centerNodeId: number): MapNode[] => {
    const centerNode = allNodes.find((n) => n.id === centerNodeId);
    if (!centerNode) return allNodes;

    const visibleIds = new Set<number>([centerNode.id, ...centerNode.neighbors]);

    return allNodes.map((node) => {
      if (node.id === centerNode.id) {
        return { ...node, visibility: "visited" };
      }

      if (visibleIds.has(node.id)) {
        return {
          ...node,
          visibility: node.visibility === "visited" ? "visited" : "discovered",
        };
      }

      return node;
    });
  };

  const startGame = () => {
    const biome = pickFloorBiome(floorData);
    const generated = generateGridMap({ biome });
    setCurrentFloorBiome(biome);
    setPendingChoiceContext(null);
    setPendingEventNodeId(null);
    setPendingNodeInteraction(null);
    setCombatParticipants([]);

    const startNode = generated.nodes.find((n) => n.kind === "start");
    const startNodeId = startNode?.id ?? 0;

    const revealedNodes = revealAroundNode(generated.nodes, startNodeId);
    setFloorCorruptionTurn(0);
    
    setCorruptionLevel(0);
    setCorruptionCharge(0);
    setCorruptedNodeIds([startNodeId]);
    setCurrentFloorStatues(0);

    setNodes(revealedNodes);
    setMapWidth(generated.width);
    setMapHeight(generated.height);

    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        currentNode: startNodeId,
      }))
    );

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
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-emerald-300 font-fantasy">
        <h1 className="text-7xl mb-4">VICTOIRE</h1>
        <p className="text-white text-2xl font-rpg">
          Vous avez vaincu les ténèbres d’Ethernia.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-4 border-2 border-emerald-500 rounded-lg hover:bg-emerald-900 text-white text-xl transition-colors"
        >
          Recommencer
        </button>
      </div>
    );
  }
  if (gameOver) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 font-fantasy">
        <h1 className="text-8xl mb-4 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">
          GAME OVER
        </h1>
        <p className="text-white text-2xl font-rpg">
          Tous les héros ont péri dans les ténèbres.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-4 border-2 border-red-600 rounded-lg hover:bg-red-900 text-white text-xl transition-colors"
        >
          Recommencer l'expédition
        </button>
      </div>
    );
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
            <div className="absolute top-24 left-4 z-50 flex flex-col gap-3">
              <button
                onClick={() => toggleSidePanel("stats")}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl shadow-lg transition-all ${
                  activeSidePanel === "stats"
                    ? "bg-violet-700 border-violet-300 scale-110 shadow-[0_0_18px_rgba(168,117,255,0.55)]"
                    : "bg-black/80 border-violet-700 hover:bg-violet-900/60 hover:scale-105"
                }`}
                title="Fiche personnage (C)"
              >
                👤
              </button>

              <button
                onClick={() => toggleSidePanel("inventory")}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl shadow-lg transition-all ${
                  activeSidePanel === "inventory"
                    ? "bg-violet-700 border-violet-300 scale-110 shadow-[0_0_18px_rgba(168,117,255,0.55)]"
                    : "bg-black/80 border-violet-700 hover:bg-violet-900/60 hover:scale-105"
                }`}
                title="Inventaire (I)"
              >
                🎒
              </button>

              <button
                onClick={() => toggleSidePanel("equipment")}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl shadow-lg transition-all ${
                  activeSidePanel === "equipment"
                    ? "bg-violet-700 border-violet-300 scale-110 shadow-[0_0_18px_rgba(168,117,255,0.55)]"
                    : "bg-black/80 border-violet-700 hover:bg-violet-900/60 hover:scale-105"
                }`}
                title="Équipement (E)"
              >
                🛡️
              </button>
            </div>
            <CharacterPanel
              player={currentPlayer}
              activeTab={activeSidePanel}
              onUseItem={handleUseItem}
              onEquipItem={handleEquipItem}
              onUnequipSlot={handleUnequipSlot}
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

            <div className="absolute bottom-10 right-10 z-40 flex flex-col items-end gap-3">
              <div className="bg-black/90 text-violet-100 px-5 py-3 rounded border border-violet-500 backdrop-blur-sm shadow-[0_0_15px_rgba(168,117,255,0.4)] text-base">
                Cliquez sur un nœud voisin pour vous déplacer
              </div>
                <div className="bg-black/90 text-red-200 px-5 py-3 rounded border border-red-700 backdrop-blur-sm shadow-[0_0_15px_rgba(220,38,38,0.35)] text-sm">
                  <div>
                    Corruption globale :{" "}
                    <span className="font-bold text-red-400">
                      {corruptionLevelLabel}
                    </span>
                  </div>

                  <div className="text-xs text-red-300/80 mt-1">
                    Niveau global : {corruptionLevel}
                  </div>

                  <div className="text-xs text-red-300/80 mt-1">
                    Jauge : {corruptionCharge}/{CORRUPTION_CHARGE_MAX}
                  </div>

                  <div className="mt-2 h-2 w-52 bg-black/60 rounded overflow-hidden border border-red-900">
                    <div
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{
                        width: `${(corruptionCharge / CORRUPTION_CHARGE_MAX) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="text-xs text-red-300/70 mt-2">
                    Corruption du niveau : tour {floorCorruptionTurn}
                  </div>

                  <div className="text-xs text-red-300/70 mt-1">
                    Propagation après {FLOOR_CORRUPTION_START_DELAY} tours, puis tous les {FLOOR_CORRUPTION_INTERVAL} tours
                  </div>

                  <div className="text-xs text-red-300/70 mt-1">
                    Cases corrompues : {corruptedNodeIds.length}
                  </div>
                </div>
            </div>

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
            {combatEnemy && combatPlayers.length > 0 && (
              <CombatOverlay
                players={combatPlayers}
                enemy={combatEnemy}
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
            <div className="absolute bottom-6 left-6 z-50 flex flex-col items-start gap-2">
  
            <button
              onClick={() => setHelpOpen((prev) => !prev)}
              className={`w-12 h-12 rounded-full border flex items-center justify-center text-xl font-bold shadow-lg transition-all ${
                helpOpen
                  ? "bg-violet-700 border-violet-300 scale-110 shadow-[0_0_18px_rgba(168,117,255,0.55)]"
                  : "bg-black/80 border-violet-700 hover:bg-violet-900/60 hover:scale-105"
              }`}
              title="Aide / raccourcis"
            >
              ?
            </button>

            {helpOpen && (
              <div className="bg-black/80 border border-violet-700 rounded-xl px-4 py-3 text-xs text-violet-200 shadow-lg backdrop-blur-sm animate-fadeIn">
                <div><span className="font-bold">C</span> Personnage</div>
                <div><span className="font-bold">I</span> Inventaire</div>
                <div><span className="font-bold">E</span> Équipement</div>
                <div><span className="font-bold">Échap</span> Fermer panneaux</div>
              </div>
            )}

          </div>
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