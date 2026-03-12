"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlobalStyles from "./GlobalStyles";
import CombatOverlay from "./CombatOverlay";
import CharacterPanel from "./CharacterPanel";
import LevelUpModal from "./LevelUpModal";
import EventModal from "./EventModal";
import LobbyScreen from "./LobbyScreen";
import GameHUD from "./GameHUD";
import GameMap from "./GameMap";
import { getEquipmentBonuses } from "@/app/component/lib/equipment";
import { equipInventoryItem,unequipInventorySlot, consumeItem } from "@/app/component/lib/inventory";
import { FLOORS } from "@/app/component/data/floors";

import MerchantModal from "./MerchantModal";
import { getMerchantStock, MerchantType } from "@/app/component/data/merchantStocks";
import { buyItem, sellItem } from "@/app/component/lib/inventory";

import { CLASSES } from "@/app/component/data/classes";
import { generateMap } from "@/app/component/lib/generateMap";
import { resolveNodeEvent } from "@/app/component/lib/eventSystem";
import {
  applyXpAndLevelUp,
  getNextCorruptionDepth,
  getXpReward,
  isNodeCorrupted,
} from "@/app/component/lib/gameProgression";

import { ClassType, Enemy, MapNode, Player, Stats } from "@/app/component/types/game";

const MAP_HEIGHT = 1200;

export default function EtherniaGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassType>("Guerrier");
  const [gameOver, setGameOver] = useState(false);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [mapWidth, setMapWidth] = useState(3600);
  const [activeSidePanel, setActiveSidePanel] = useState<"stats" | "inventory" | "equipment" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);  
  
  const [phase, setPhase] = useState<"MOVE" | "EVENT" | "COMBAT">("MOVE");
  const [corruptionDepth, setCorruptionDepth] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [previousNode, setPreviousNode] = useState<number | null>(null);

  const [combatEnemy, setCombatEnemy] = useState<Enemy | null>(null);
  const [eventMessage, setEventMessage] = useState<{ title: string; text: string } | null>(null);

  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchantType, setMerchantType] = useState<MerchantType | null>(null);
  const [merchantStock, setMerchantStock] = useState<import("@/app/component/types/game").InventoryItem[]>([]);

  const showEventMessage = (title: string, text: string) => {
    setEventMessage({ title, text });
  };

  const floorData = FLOORS.find((f) => f.floor === currentFloor);

  const CORRUPTION_EVERY_TURNS = floorData?.corruptionRate ?? 2;

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
    };
    newSkills: import("@/app/component/types/game").PlayerSkill[];
  } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const currentPlayer = players[currentPlayerIndex];

  const toggleSidePanel = (panel: "stats" | "inventory" | "equipment") => {
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
    };
    newSkills: import("@/app/component/types/game").PlayerSkill[];
  }) => {
    setLastLevelUp(payload);
    setLevelUpOpen(true);
  };

  const advanceCorruption = () => {
    setTurnCount((prev) => {
      const nextTurn = prev + 1;
      setCorruptionDepth(getNextCorruptionDepth(nextTurn));
      return nextTurn;
    });
  };

  const endTurn = () => {
    setPreviousNode(null);
    advanceCorruption();

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

    setTimeout(() => {
      const result = resolveNodeEvent(node, currentPlayer, corruptionDepth);

      if (result.message) {
        setEventMessage(result.message);
      }
      if (result.type === "merchant") {
        setMerchantType(result.merchantType);
        setMerchantStock(getMerchantStock(result.merchantType));
        setMerchantOpen(true);
        setPhase("EVENT");
        return;
      }
      if (result.type === "combat") {
        setCombatEnemy(result.enemy);
        setPhase("COMBAT");
        return;
      }
      if (result.type === "player_update") {
      setPlayers((prevPlayers) =>
          prevPlayers.map((p, idx) => {
            if (idx !== currentPlayerIndex) return p;

            return {
              ...p,
              stats: result.player.stats,
              level: result.player.level,
              xp: result.player.xp,
              xpToNextLevel: result.player.xpToNextLevel,
              isDead: result.player.isDead,
              inventory: result.player.inventory,
              currentNode: p.currentNode,
            };
          })
        );
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

  const handleNodeClick = (nodeId: number) => {
    if (phase !== "MOVE" || !currentPlayer) return;

    const current = nodes.find((n) => n.id === currentPlayer.currentNode);
    if (!current) return;
    if (!current.neighbors.includes(nodeId)) return;

    setPreviousNode(current.id);

    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex ? { ...p, currentNode: nodeId } : p
      )
    );

    setPhase("EVENT");
    triggerEvent(nodeId);
  };

  const handleWinCombat = (remainingStats: Stats) => {
    const currentNode = nodes.find((n) => n.id === currentPlayer?.currentNode);
    const xpGained = combatEnemy ? getXpReward(combatEnemy, currentNode) : 25;
    if (currentNode?.type === "boss") {
      const nextFloor = currentFloor + 1;
      if (nextFloor > FLOORS.length) {
        alert("Victoire ! Vous avez vaincu les ténèbres.");
        setGameOver(true);
        return;
      }

      const generated = generateMap();

      setNodes(generated.nodes);
      setMapWidth(generated.width);
      setCurrentFloor(nextFloor);

      setCorruptionDepth(0);
      setTurnCount(0);

      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          currentNode: 0,
        }))
      );

      showEventMessage(
        "Étage suivant",
        `Vous descendez vers l&apos;étage ${nextFloor}.`
      );

      return;
    }
    setCombatEnemy(null);

    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) => {
        if (idx !== currentPlayerIndex) return p;

        const bonus = getEquipmentBonuses(p);

        const baseStats: Stats = {
          hp: Math.min(remainingStats.hp, remainingStats.maxHp - bonus.maxHp),
          maxHp: remainingStats.maxHp - bonus.maxHp,
          mana: Math.min(remainingStats.mana, remainingStats.maxMana - bonus.maxMana),
          maxMana: remainingStats.maxMana - bonus.maxMana,
          strength: remainingStats.strength - bonus.strength,
          magic: remainingStats.magic - bonus.magic,
          defense: remainingStats.defense - bonus.defense,
        };

        const updatedBasePlayer: Player = {
          ...p,
          stats: baseStats,
        };

        return applyXpAndLevelUp(updatedBasePlayer, xpGained, handleLevelUp);
      })
    );

    endTurn();
  };

  const handleDefeatCombat = () => {
    if (!currentPlayer) return;

    setCombatEnemy(null);
    alert(`${currentPlayer.name} est tombé au combat !`);

    setPlayers((prevPlayers) =>
      prevPlayers.map((p, idx) =>
        idx === currentPlayerIndex
          ? { ...p, isDead: true, stats: { ...p.stats, hp: 0 } }
          : p
      )
    );

    endTurn();
  };

  const handleFleeCombat = () => {
    setCombatEnemy(null);
    endTurn();
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

  const startGame = () => {
    const generated = generateMap();
    setNodes(generated.nodes);
    setMapWidth(generated.width);
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
            <GameHUD currentPlayer={currentPlayer} />
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
              mapHeight={MAP_HEIGHT}
              floorBiome={floorData?.biome ?? "forest"}
              nodes={nodes}
              players={players}
              currentPlayer={currentPlayer}
              phase={phase}
              handleNodeClick={handleNodeClick}
              isNodeCorrupted={(node) => isNodeCorrupted(node, corruptionDepth)}
            />

            <div className="absolute bottom-10 right-10 z-40 flex flex-col items-end gap-3">
              <div className="bg-black/90 text-violet-100 px-5 py-3 rounded border border-violet-500 backdrop-blur-sm shadow-[0_0_15px_rgba(168,117,255,0.4)] text-base">
                Cliquez sur un nœud voisin pour vous déplacer
              </div>

              <div className="bg-black/90 text-red-200 px-5 py-3 rounded border border-red-700 backdrop-blur-sm shadow-[0_0_15px_rgba(220,38,38,0.35)] text-sm">
                Corruption : <span className="font-bold text-red-400">profondeur {corruptionDepth}</span>
                <div className="text-xs text-red-300/80 mt-1">
                  Elle progresse tous les {CORRUPTION_EVERY_TURNS} tours
                </div>
              </div>
            </div>

            <EventModal
              eventMessage={eventMessage}
              onClose={() => setEventMessage(null)}
            />

            {combatEnemy && currentPlayer && (
              <CombatOverlay
                player={currentPlayer}
                enemy={combatEnemy}
                onWin={handleWinCombat}
                onDefeat={handleDefeatCombat}
                onFlee={handleFleeCombat}
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