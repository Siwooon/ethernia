"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- STYLES & ASSETS ---
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=MedievalSharp&display=swap');
    
    .font-fantasy { font-family: 'Cinzel', serif; }
    .font-rpg { font-family: 'MedievalSharp', cursive; }
    
    /* Cache scrollbar mais garde fonctionnalité */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .text-shadow { text-shadow: 2px 2px 4px rgba(0,0,0,0.9); }
    
    /* Animation Dé 3D simple en CSS */
    .scene { width: 100px; height: 100px; perspective: 600px; }
    .cube {
      width: 100%; height: 100%; position: relative; transform-style: preserve-3d;
      transition: transform 1s ease-out;
    }
    .cube__face {
      position: absolute; width: 100px; height: 100px;
      background: linear-gradient(135deg, #5e2cb8, #3b1c7a);
      border: 2px solid #a875ff; border-radius: 10px;
      font-size: 40px; font-weight: bold; color: white;
      display: flex; justify-content: center; align-items: center;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
    }
    .cube__face--1 { transform: rotateY(  0deg) translateZ(50px); }
    .cube__face--2 { transform: rotateY( 90deg) translateZ(50px); }
    .cube__face--3 { transform: rotateY(180deg) translateZ(50px); }
    .cube__face--4 { transform: rotateY(-90deg) translateZ(50px); }
    .cube__face--5 { transform: rotateX( 90deg) translateZ(50px); }
    .cube__face--6 { transform: rotateX(-90deg) translateZ(50px); }
  `}</style>
);

// --- TYPES ---

type ClassType = 'Archer' | 'Guerrier' | 'Mage' | 'Voleur' | 'Invocateur';
type NodeType = 'start' | 'battle' | 'boss' | 'step'; 

interface Stats {
  hp: number; maxHp: number; mana: number; maxMana: number;
  strength: number; magic: number; defense: number;
}

interface Player {
  id: number; name: string; classType: ClassType;
  stats: Stats; currentNode: number; image: string; portrait: string;
  isDead: boolean;
}

interface Enemy {
  name: string; hp: number; maxHp: number; strength: number; image: string;
}

interface MapNode {
  id: number; x: number; y: number;
  label?: string; type: NodeType;
  neighbors: number[];
}

// --- DONNÉES ---

const CLASSES: Record<ClassType, any> = {
  Guerrier: { image: "https://api.dicebear.com/7.x/adventurer/png?seed=Guerrier&size=200&backgroundColor=5e2cb8", portrait: "https://api.dicebear.com/7.x/adventurer/png?seed=Guerrier&size=120&backgroundColor=3b1c7a", stats: { hp: 150, maxHp: 150, mana: 20, maxMana: 20, strength: 16, magic: 2, defense: 12 } },
  Mage: { image: "https://api.dicebear.com/7.x/adventurer/png?seed=Mage&size=200&backgroundColor=2c1266", portrait: "https://api.dicebear.com/7.x/adventurer/png?seed=Mage&size=120&backgroundColor=1b0a3d", stats: { hp: 70, maxHp: 70, mana: 100, maxMana: 100, strength: 3, magic: 20, defense: 3 } },
  Archer: { image: "https://api.dicebear.com/7.x/adventurer/png?seed=Archer&size=200&backgroundColor=4d1b99", portrait: "https://api.dicebear.com/7.x/adventurer/png?seed=Archer&size=120&backgroundColor=3b1c7a", stats: { hp: 90, maxHp: 90, mana: 50, maxMana: 50, strength: 12, magic: 5, defense: 5 } },
  Voleur: { image: "https://api.dicebear.com/7.x/adventurer/png?seed=Voleur&size=200&backgroundColor=200a4d", portrait: "https://api.dicebear.com/7.x/adventurer/png?seed=Voleur&size=120&backgroundColor=2c1266", stats: { hp: 85, maxHp: 85, mana: 40, maxMana: 40, strength: 10, magic: 4, defense: 4 } },
  Invocateur: { image: "https://api.dicebear.com/7.x/adventurer/png?seed=Invocateur&size=200&backgroundColor=8e4ae8", portrait: "https://api.dicebear.com/7.x/adventurer/png?seed=Invocateur&size=120&backgroundColor=5e2cb8", stats: { hp: 100, maxHp: 100, mana: 80, maxMana: 80, strength: 6, magic: 14, defense: 6 } },
};

const MAP_HEIGHT = 1200;

const BATTLE_NAMES = [
  "Avant-Poste", "Pont Brisé", "Nid de Wyvernes", "Ruines Maudites",
  "Cimetière", "Antre de l'Araignée", "Marais Putride", "Tour en Flammes",
  "Caverne Maudite", "Forêt des Ombres", "Village Perdu", "Sanctuaire Profané",
  "Gorge des Trolls", "Tombeau Ancien", "Collines Sanglantes", "Falaises de Cendres",
  "Lac Maudit", "Cathédrale Brisée", "Crypte des Anciens", "Plaines du Sang",
];
const BOSS_NAMES = [
  "GARDIEN DE PIERRE", "SEIGNEUR DÉMON", "LICHE ÉTERNELLE",
  "DRAGON DE L'ABYSSE", "ROI-SPECTRE", "WYRM PRIMORDIAL",
  "TITAN MAUDIT", "L'ARCHONTE NOIR", "DÉVOREUR D'ÂMES",
];

function generateMap(): { nodes: MapNode[]; width: number } {
  const nodeList: MapNode[] = [];
  let idCounter = 0;

  const getNode = (id: number) => nodeList.find(n => n.id === id)!;
  const link = (a: number, b: number) => {
    if (!getNode(a).neighbors.includes(b)) getNode(a).neighbors.push(b);
    if (!getNode(b).neighbors.includes(a)) getNode(b).neighbors.push(a);
  };

  // Nœud de départ
  nodeList.push({ id: idCounter++, x: 200, y: 1000, label: "Campement", type: 'start', neighbors: [] });

  const shuffledBattles = [...BATTLE_NAMES].sort(() => Math.random() - 0.5);
  const shuffledBosses = [...BOSS_NAMES].sort(() => Math.random() - 0.5);
  let battleIdx = 0;
  let bossIdx = 0;

  const numLayers = 10 + Math.floor(Math.random() * 5); // 10-14 couches
  const midBossLayer = Math.floor(numLayers * 0.45);
  const layerSpacing = Math.round(1800 / numLayers);
  const ROW_YS = [100, 300, 600, 900, 1100];

  let prevLayerIds: number[] = [0];

  for (let layer = 0; layer < numLayers; layer++) {
    const x = 250 + layer * layerSpacing;
    const isFinalBoss = layer === numLayers - 1;
    const isMidBoss   = layer === midBossLayer;
    const numNodes = (isFinalBoss || isMidBoss) ? 1 : (1 + Math.floor(Math.random() * 2));

    const ys = [...ROW_YS]
      .sort(() => Math.random() - 0.5)
      .slice(0, numNodes)
      .sort((a, b) => a - b);

    const newLayerIds: number[] = [];

    for (let i = 0; i < numNodes; i++) {
      const nodeId = idCounter++;
      let type: NodeType = 'step';
      let label: string | undefined;

      if (isFinalBoss || isMidBoss) {
        type = 'boss';
        label = shuffledBosses[bossIdx++ % shuffledBosses.length];
      } else if (layer > 0 && Math.random() < 0.38) {
        type = 'battle';
        label = shuffledBattles[battleIdx++ % shuffledBattles.length];
      }

      nodeList.push({ id: nodeId, x, y: ys[i], label, type, neighbors: [] });
      newLayerIds.push(nodeId);
    }

    // Chaque nouveau nœud reçoit au moins une connexion
    for (const newId of newLayerIds) {
      const fromId = prevLayerIds[Math.floor(Math.random() * prevLayerIds.length)];
      link(fromId, newId);
    }
    // Chaque ancien nœud a au moins une sortie vers la couche suivante
    for (const prevId of prevLayerIds) {
      if (!getNode(prevId).neighbors.some(n => newLayerIds.includes(n))) {
        link(prevId, newLayerIds[Math.floor(Math.random() * newLayerIds.length)]);
      }
    }
    // Connexion bonus aléatoire (30%)
    if (Math.random() < 0.3) {
      const a = prevLayerIds[Math.floor(Math.random() * prevLayerIds.length)];
      const b = newLayerIds[Math.floor(Math.random() * newLayerIds.length)];
      link(a, b);
    }

    prevLayerIds = newLayerIds;
  }

  const maxX = Math.max(...nodeList.map(n => n.x));
  return { nodes: nodeList, width: maxX + 200 };
}

// --- COMPOSANT DÉ 3D ---
const Dice3D = ({ value, rolling }: { value: number, rolling: boolean }) => {
    const [rotation, setRotation] = useState("rotateX(0deg) rotateY(0deg)");
  
    useEffect(() => {
      if (rolling) {
        setRotation(`rotateX(${Math.random() * 720}deg) rotateY(${Math.random() * 720}deg)`);
      } else {
        switch (value) {
          case 1: setRotation("rotateY(0deg)"); break;
          case 2: setRotation("rotateY(-90deg)"); break;
          case 3: setRotation("rotateY(180deg)"); break;
          case 4: setRotation("rotateY(90deg)"); break;
          case 5: setRotation("rotateX(-90deg)"); break;
          case 6: setRotation("rotateX(90deg)"); break;
          default: setRotation("rotateY(0deg)");
        }
      }
    }, [value, rolling]);
  
    return (
      <div className="scene">
        <div className="cube" style={{ transform: rotation }}>
          <div className="cube__face cube__face--1">1</div>
          <div className="cube__face cube__face--2">2</div>
          <div className="cube__face cube__face--3">3</div>
          <div className="cube__face cube__face--4">4</div>
          <div className="cube__face cube__face--5">5</div>
          <div className="cube__face cube__face--6">6</div>
        </div>
      </div>
    );
};

// --- CAPACITÉS SPÉCIALES PAR CLASSE ---
const CLASS_ABILITIES: Record<ClassType, { label: string; icon: string; manaCost: number; description: string }> = {
  Guerrier:    { icon: '🪓', label: 'Frappe Lourde',  manaCost: 0,  description: 'Force × 1.8, ignore 30% défense' },
  Mage:        { icon: '🔥', label: 'Boule de Feu',   manaCost: 20, description: 'Magie × 2.0 dégâts' },
  Archer:      { icon: '🎯', label: 'Tir Précis',     manaCost: 12, description: 'Coup critique garanti' },
  Voleur:      { icon: '🗡️', label: 'Coup Sombre',    manaCost: 10, description: 'Force × 1.5, ignore la défense' },
  Invocateur:  { icon: '👁️', label: 'Invocation',     manaCost: 15, description: 'Force + Magie × 1.2' },
};

// --- COMPOSANT COMBAT ---
const CombatOverlay = ({ player, enemy, onWin, onDefeat, onFlee }: any) => {
    const [logs, setLogs] = useState<string[]>(['⚔️ Le combat commence !']);
    const [pStats, setPStats] = useState({ ...player.stats });
    const [eStats, setEStats] = useState({ ...enemy });
    const [turn, setTurn] = useState<'player' | 'animating'>('player');
    const [defending, setDefending] = useState(false);
    const [shake, setShake] = useState<'player' | 'enemy' | null>(null);

    // Refs pour éviter les stale closures dans setTimeout
    const pStatsRef = useRef(pStats);
    const eStatsRef = useRef(eStats);
    const defendingRef = useRef(defending);
    pStatsRef.current = pStats;
    eStatsRef.current = eStats;
    defendingRef.current = defending;

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

    const triggerShake = (target: 'player' | 'enemy') => {
        setShake(target);
        setTimeout(() => setShake(null), 400);
    };

    const doEnemyTurn = () => {
        const ps = pStatsRef.current;
        const isCrit = Math.random() < 0.12;
        const rawDmg = Math.floor(enemy.strength * (0.7 + Math.random() * 0.6));
        const shielded = defendingRef.current ? Math.floor(rawDmg * 0.4) : rawDmg;
        const reduced = Math.max(1, shielded - Math.floor(ps.defense / 3));
        const finalDmg = isCrit ? reduced * 2 : reduced;
        const finalHp = Math.max(0, ps.hp - finalDmg);

        triggerShake('player');
        setDefending(false);
        setPStats((prev: any) => ({ ...prev, hp: finalHp }));

        const critText = isCrit ? ' 💥 CRITIQUE !' : '';
        const shieldText = defendingRef.current ? ' (Bouclier -60%)' : '';
        addLog(`👹 ${enemy.name} attaque : -${finalDmg} PV${critText}${shieldText}`);

        if (finalHp <= 0) {
            setTimeout(() => onDefeat(), 800);
        } else {
            setTurn('player');
        }
    };

    const handleAction = (action: string) => {
        if (turn !== 'player') return;
        setTurn('animating');

        const ps = pStatsRef.current;
        const es = eStatsRef.current;

        if (action === 'defend') {
            setDefending(true);
            setPStats((prev: any) => ({ ...prev, mana: Math.min(prev.maxMana, prev.mana + 5) }));
            addLog('🛡️ Posture défensive ! (-60% dégâts reçus, +5 mana)');
            setTimeout(doEnemyTurn, 1000);
            return;
        }

        if (action === 'flee') {
            if (Math.random() < 0.4) {
                addLog('🏃 Vous fuyez le combat !');
                setTimeout(() => onFlee(), 800);
            } else {
                addLog('❌ Impossible de fuir !');
                setTimeout(doEnemyTurn, 1000);
            }
            return;
        }

        let dmg = 0;
        let logMsg = '';
        let manaCost = 0;

        if (action === 'attack') {
            const isCrit = Math.random() < 0.1;
            dmg = Math.max(1, Math.floor(ps.strength * (0.8 + Math.random() * 0.4)));
            if (isCrit) { dmg *= 2; logMsg = `⚔️ Attaque — CRITIQUE ! -${dmg} PV !`; }
            else { logMsg = `⚔️ Attaque : -${dmg} PV`; }
        } else if (action === 'special') {
            const ability = CLASS_ABILITIES[player.classType as ClassType];
            manaCost = ability.manaCost;
            if (ps.mana < manaCost) {
                addLog('❌ Pas assez de mana !');
                setTurn('player');
                return;
            }
            switch (player.classType as ClassType) {
                case 'Guerrier': dmg = Math.max(1, Math.floor(ps.strength * 1.8)); logMsg = `🪓 Frappe Lourde : -${dmg} PV !`; break;
                case 'Mage':     dmg = Math.max(1, Math.floor(ps.magic * 2.0));    logMsg = `🔥 Boule de Feu : -${dmg} dégâts magiques !`; break;
                case 'Archer':   dmg = Math.max(1, Math.floor(ps.strength * 2));   logMsg = `🎯 Tir Précis — CRITIQUE ! -${dmg} PV !`; break;
                case 'Voleur':   dmg = Math.max(1, Math.floor(ps.strength * 1.5)); logMsg = `🗡️ Coup Sombre (ignore défense) : -${dmg} PV !`; break;
                case 'Invocateur': dmg = Math.max(1, Math.floor((ps.strength + ps.magic) * 1.2)); logMsg = `👁️ Invocation : -${dmg} dégâts !`; break;
            }
        }

        const newEHp = Math.max(0, es.hp - dmg);
        triggerShake('enemy');
        setEStats((prev: any) => ({ ...prev, hp: newEHp }));
        if (manaCost > 0) setPStats((prev: any) => ({ ...prev, mana: prev.mana - manaCost }));
        addLog(logMsg);

        if (newEHp <= 0) {
            setTimeout(() => onWin(pStatsRef.current), 800);
            return;
        }
        setTimeout(doEnemyTurn, 1200);
    };

    const ability = CLASS_ABILITIES[player.classType as ClassType];
    const canSpecial = pStats.mana >= ability.manaCost;
    const isPlayerTurn = turn === 'player';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-[#1a0b2e] border-4 border-purple-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">

                {/* Scène de combat */}
                <div className="relative h-64 flex items-center justify-between px-16 bg-gradient-to-b from-[#0c0422] to-[#1a0b2e]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 pointer-events-none" />

                    {/* Joueur */}
                    <motion.div animate={shake === 'player' ? { x: [-8,8,-6,6,0] } : { x: 0 }} transition={{ duration: 0.35 }} className="text-center">
                        <img src={player.image} alt={player.name} className="w-28 h-28 object-cover rounded-full border-4 border-violet-500 shadow-[0_0_24px_rgba(168,117,255,0.6)] mx-auto" />
                        <div className="mt-2 bg-black/80 px-3 py-2 rounded-lg border border-violet-800 min-w-[150px]">
                            <div className="text-sm font-fantasy text-violet-100 font-bold">{player.name}</div>
                            <div className="text-xs text-violet-400 mb-1">{player.classType}</div>
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs w-4">❤️</span>
                                <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${Math.max(0,(pStats.hp/pStats.maxHp)*100)}%` }} />
                                </div>
                                <span className="text-xs text-green-400 ml-1">{pStats.hp}/{pStats.maxHp}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs w-4">💧</span>
                                <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(pStats.mana/pStats.maxMana)*100}%` }} />
                                </div>
                                <span className="text-xs text-blue-400 ml-1">{pStats.mana}/{pStats.maxMana}</span>
                            </div>
                            {defending && <div className="mt-1 text-xs text-cyan-300 font-bold">🛡️ EN DÉFENSE</div>}
                        </div>
                    </motion.div>

                    <div className="text-5xl font-fantasy text-red-600 animate-pulse select-none">VS</div>

                    {/* Ennemi */}
                    <motion.div animate={shake === 'enemy' ? { x: [-8,8,-6,6,0] } : { x: 0 }} transition={{ duration: 0.35 }} className="text-center">
                        <img src={enemy.image} alt={enemy.name} className="w-28 h-28 object-cover rounded-full border-4 border-red-700 shadow-[0_0_24px_rgba(220,38,38,0.6)] mx-auto" />
                        <div className="mt-2 bg-black/80 px-3 py-2 rounded-lg border border-red-900 min-w-[150px]">
                            <div className="text-sm font-fantasy text-red-100 font-bold">{enemy.name}</div>
                            <div className="text-xs text-red-400 mb-1">⚔️ FOR {enemy.strength}</div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs w-4">❤️</span>
                                <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                                    <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${Math.max(0,(eStats.hp/eStats.maxHp)*100)}%` }} />
                                </div>
                                <span className="text-xs text-red-400 ml-1">{eStats.hp}/{eStats.maxHp}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Interface Basse */}
                <div className="bg-[#0f0518] p-4 border-t-2 border-purple-900 flex gap-4">
                    <div className="flex-1 bg-black/60 p-3 rounded-lg border border-purple-900/60 overflow-y-auto font-mono text-sm h-36 hide-scrollbar">
                        {logs.map((l, idx) => (
                            <div key={`${l}-${idx}`} className={idx === 0 ? 'text-white' : 'text-gray-500'}>{l}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-72 content-center">
                        {isPlayerTurn ? (<>
                            <button onClick={() => handleAction('attack')}
                                className="bg-red-800 hover:bg-red-700 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-red-500 transition-all text-sm font-bold">
                                ⚔️ ATTAQUER
                            </button>
                            <button onClick={() => handleAction('special')} disabled={!canSpecial}
                                className="bg-violet-800 hover:bg-violet-700 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-violet-400 transition-all text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                title={ability.description}>
                                {ability.icon} {ability.label}
                                {ability.manaCost > 0 && <span className="block text-xs text-blue-300">{ability.manaCost} mana</span>}
                            </button>
                            <button onClick={() => handleAction('defend')}
                                className="bg-cyan-900 hover:bg-cyan-800 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-cyan-600 transition-all text-sm font-bold">
                                🛡️ DÉFENDRE
                                <span className="block text-xs text-cyan-300">+5 mana</span>
                            </button>
                            <button onClick={() => handleAction('flee')}
                                className="bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-fantasy py-2.5 rounded-lg border-2 border-gray-500 transition-all text-sm font-bold">
                                🏃 FUIR
                                <span className="block text-xs text-gray-400">40% chance</span>
                            </button>
                        </>) : (
                            <div className="col-span-2 flex items-center justify-center text-red-400 font-bold animate-pulse text-lg">
                                👹 Tour de {enemy.name}...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- JEU PRINCIPAL ---

export default function EtherniaGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const[currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType>('Guerrier');
  const [gameOver, setGameOver] = useState(false);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [mapWidth, setMapWidth] = useState(3600);
  
  // États de Jeu
  const[phase, setPhase] = useState<'ROLL' | 'MOVE' | 'EVENT' | 'COMBAT'>('ROLL');
  const [movesLeft, setMovesLeft] = useState(0);
  const[diceValue, setDiceValue] = useState<number>(1);
  const [rolling, setRolling] = useState(false);
  const [previousNode, setPreviousNode] = useState<number | null>(null);
  
  // Combat
  const [combatEnemy, setCombatEnemy] = useState<Enemy | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  
  const currentPlayer = players[currentPlayerIndex];

  // --- LOGIQUE DÉ & MOUVEMENT ---

  const rollDice = () => {
    if (phase !== 'ROLL') return;
    setRolling(true);
    
    // Animation
    setTimeout(() => {
        const val = Math.floor(Math.random() * 6) + 1; // 1-6
        setDiceValue(val);
        setMovesLeft(val);
        setRolling(false);
        setPhase('MOVE');
    }, 1000);
  };

  // Auto-move quand un seul chemin est disponible
  useEffect(() => {
    if (phase !== 'MOVE' || movesLeft <= 0 || !currentPlayer || currentPlayer.isDead) return;

    const current = nodes.find(n => n.id === currentPlayer.currentNode);
    if (!current) return;

    // Exclure le nœud précédent pour ne garder que les chemins "en avant"
    const forward = current.neighbors.filter(id => id !== previousNode);
    const choices = forward.length > 0 ? forward : current.neighbors;

    if (choices.length !== 1) return; // Carrefour : le joueur choisit

    const nextId = choices[0];
    const timer = setTimeout(() => {
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex].currentNode = nextId;
        setPlayers(newPlayers);
        setPreviousNode(current.id);

        const newMovesLeft = movesLeft - 1;
        setMovesLeft(newMovesLeft);

        if (newMovesLeft === 0) {
            setPhase('EVENT');
            triggerEvent(nextId);
        }
    }, 500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, movesLeft, currentPlayer?.currentNode, previousNode]);

  const handleNodeClick = (nodeId: number) => {
    if (phase !== 'MOVE' || movesLeft <= 0) return;

    const current = nodes.find(n => n.id === currentPlayer.currentNode);
    if (!current) return;

    // Vérifier si le noeud cliqué est un voisin direct
    if (current.neighbors.includes(nodeId)) {
        setPreviousNode(current.id);
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex].currentNode = nodeId;
        setPlayers(newPlayers);
        setMovesLeft(prev => prev - 1);

        // Fin du mouvement ?
        if (movesLeft - 1 === 0) {
            setPhase('EVENT');
            triggerEvent(nodeId);
        }
    }
  };

  const triggerEvent = (nodeId: number) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      setTimeout(() => {
        // TOUTES les cases (sauf départ) déclenchent un combat
        if (node.type !== 'start') {
             startCombat(node);
        } else {
             endTurn();
        }
      }, 500);
  };

  const startCombat = (node: MapNode) => {
      let enemyName = "Créature";
      let enemyHp = 50;
      let enemyStr = 10;
      let enemyImg = "https://images.unsplash.com/photo-1549487928-56df82570ce2?q=80&w=400"; // Orc par défaut

      if (node.type === 'boss') {
          enemyName = node.label || "SEIGNEUR DÉMON";
          enemyHp = 300;
          enemyStr = 25;
          enemyImg = "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=400";
      } else if (node.type === 'step') {
          enemyName = "Monstre Errant";
          enemyHp = 40; // Plus facile sur les petits points
          enemyStr = 8;
          enemyImg = "https://images.unsplash.com/photo-1588691880436-b52db92040c5?q=80&w=400"; // Loup
      } else {
          // Case Battle (ex: Nid de Wyvernes)
          enemyName = node.label || "Gardien des Lieux";
          enemyHp = 80;
          enemyStr = 14;
          enemyImg = "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400"; // Squelette
      }

      setCombatEnemy({
          name: enemyName,
          hp: enemyHp,
          maxHp: enemyHp,
          strength: enemyStr,
          image: enemyImg
      });
      setPhase('COMBAT');
  };

  const handleWinCombat = (remainingStats: Stats) => {
      setCombatEnemy(null);
      // Mettre à jour la vie du joueur
      const newPlayers =[...players];
      newPlayers[currentPlayerIndex].stats = remainingStats;
      setPlayers(newPlayers);
      endTurn();
  };

  const handleDefeatCombat = () => {
      setCombatEnemy(null);
      alert(`${currentPlayer.name} est tombé au combat !`);
      
      const newPlayers = [...players];
      newPlayers[currentPlayerIndex].isDead = true;
      newPlayers[currentPlayerIndex].stats.hp = 0;
      setPlayers(newPlayers);
      
      endTurn();
  };

  const handleFleeCombat = () => {
      setCombatEnemy(null);
      endTurn();
  };

  const endTurn = () => {
      setDiceValue(1);
      setPhase('ROLL');
      setPreviousNode(null);
      
      // Trouver le prochain joueur VIVANT
      let nextIndex = (currentPlayerIndex + 1) % players.length;
      let loopCount = 0;
      
      // On boucle tant que le joueur trouvé est mort
      while (players[nextIndex].isDead && loopCount < players.length) {
          nextIndex = (nextIndex + 1) % players.length;
          loopCount++;
      }

      // Si on a bouclé sur tout le monde et que le dernier trouvé est mort = Game Over
      if (loopCount >= players.length || (loopCount === players.length - 1 && players[nextIndex].isDead)) {
          setGameOver(true);
      } else {
          setCurrentPlayerIndex(nextIndex);
      }
  };

  // Ajout joueur
  const addPlayer = () => {
      if (!playerName || players.length >= 5) return;
      const c = CLASSES[selectedClass];
      setPlayers([...players, {
          id: players.length + 1, name: playerName, classType: selectedClass,
          stats: { ...c.stats }, currentNode: 0, image: c.image, portrait: c.portrait,
          isDead: false
      }]);
      setPlayerName('');
  };

  // Scroll automatique vers le joueur
  useEffect(() => {
    if (gameStarted && mapRef.current && currentPlayer && !currentPlayer.isDead) {
        const node = nodes.find(n => n.id === currentPlayer.currentNode);
        if (node) {
            mapRef.current.scrollTo({
                left: node.x - window.innerWidth / 2,
                top: node.y - window.innerHeight / 2,
                behavior: 'smooth'
            });
        }
    }
  },[currentPlayerIndex, gameStarted, currentPlayer]);

  // ÉCRAN GAME OVER
  if (gameOver) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 font-fantasy">
              <h1 className="text-8xl mb-4 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">GAME OVER</h1>
              <p className="text-white text-2xl font-rpg">Tous les héros ont péri dans les ténèbres.</p>
              <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 border-2 border-red-600 rounded-lg hover:bg-red-900 text-white text-xl transition-colors">
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
          // --- LOBBY ---
          <motion.div key="lobby" className="h-screen flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=1920')] bg-cover">
             <div className="bg-black/80 p-10 rounded-xl border-2 border-violet-600 text-center backdrop-blur-md shadow-[0_0_50px_rgba(142,74,232,0.4)]">
                 <img src="/logo.svg" alt="Ethernia" className="w-44 h-36 mx-auto mb-2" />
                 <h1 className="text-7xl font-fantasy text-violet-400 mb-8 drop-shadow-[0_0_15px_rgba(168,117,255,0.7)]">ETHERNIA</h1>
                 <div className="flex gap-4 mb-6">
                    <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Nom du héros" className="p-3 bg-[#1b0a3d] text-white rounded border border-purple-800 outline-none focus:border-violet-400 font-rpg text-lg flex-1"/>
                    <select value={selectedClass} onChange={(e: any) => setSelectedClass(e.target.value)} className="p-3 bg-[#1b0a3d] text-violet-100 rounded border border-purple-800 outline-none font-rpg text-lg">
                        {Object.keys(CLASSES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={addPlayer} disabled={players.length >= 5} className="bg-violet-700 px-6 py-3 rounded text-white font-bold hover:bg-violet-600 border border-violet-400 disabled:opacity-50 transition-colors">
                        Ajouter
                    </button>
                 </div>
                 <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {players.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-[#1b0a3d]/80 p-2 rounded border border-purple-900">
                            <img src={p.portrait} className="w-10 h-10 rounded-full border border-violet-500 object-cover" />
                            <div className="text-left">
                                <div className="text-sm font-bold text-violet-100">{p.name}</div>
                                <div className="text-xs text-violet-400">{p.classType}</div>
                            </div>
                        </div>
                    ))}
                 </div>
                 {players.length > 0 && (
                    <button onClick={() => {
                        const generated = generateMap();
                        setNodes(generated.nodes);
                        setMapWidth(generated.width);
                        setGameStarted(true);
                    }} className="w-full py-4 text-2xl font-fantasy bg-violet-800 hover:bg-violet-700 border-2 border-violet-400 text-white rounded-lg shadow-[0_0_20px_rgba(168,117,255,0.5)] transition-all">
                        COMMENCER L'AVENTURE
                    </button>
                 )}
             </div>
          </motion.div>
        ) : (
          // --- JEU ---
          <motion.div key="game" initial={{opacity:0}} animate={{opacity:1}} className="h-screen flex flex-col relative">
            
            {/* HUD TOP */}
            <div className="h-20 bg-[#0f0518] z-20 flex items-center justify-between px-8 border-b-2 border-[#2c1266] shadow-lg">
                <div className="text-3xl font-fantasy text-violet-400 tracking-widest">ETHERNIA</div>
                <div className="flex flex-col items-end">
                    <div className="text-sm text-gray-400 font-rpg">Tour de</div>
                    <div className="text-2xl font-bold text-violet-100 flex items-center gap-2 font-fantasy">
                        {currentPlayer.name}
                        {currentPlayer.isDead && <span className="text-red-600 text-sm">(MORT)</span>}
                    </div>
                </div>
            </div>

            {/* MAP SCROLLABLE */}
            <div ref={mapRef} className="flex-1 overflow-auto bg-[#0a0510] relative cursor-grab active:cursor-grabbing hide-scrollbar">
                <div style={{ width: mapWidth, height: MAP_HEIGHT }} className="relative bg-[#0c0422] shadow-2xl">
                    {/* Texture Map */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074')] opacity-40 mix-blend-overlay pointer-events-none"/>
                    
                    {/* Connexions (SVG) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {nodes.map(node => 
                            node.neighbors.map(neighborId => {
                                const neighbor = nodes.find(n => n.id === neighborId);
                                if (!neighbor || neighbor.id < node.id) return null;
                                return (
                                    <line 
                                        key={`${node.id}-${neighbor.id}`}
                                        x1={node.x} y1={node.y} x2={neighbor.x} y2={neighbor.y}
                                        stroke="#5e2cb8" strokeWidth="4" strokeDasharray={node.type === 'step' || neighbor.type === 'step' ? "6,6" : "0"}
                                        opacity="0.8"
                                    />
                                );
                            })
                        )}
                    </svg>

                    {/* NOEUDS (Sans émojis, basés sur le design visuel) */}
                    {nodes.map(node => {
                        const isReachable = phase === 'MOVE' && movesLeft > 0 && nodes.find(n => n.id === currentPlayer.currentNode)?.neighbors.includes(node.id);
                        
                        // Style selon type
                        let size = "w-6 h-6"; // Step (petit point)
                        let borderColor = "border-[#5e2cb8]";
                        let bgImage = "";

                        if (node.type !== 'step') { 
                            size = "w-24 h-24"; 
                            borderColor = node.type === 'start' ? "border-green-600" : (node.type === 'boss' ? "border-red-600" : "border-violet-600");
                            
                            // Images de fond pour les lieux
                            if(node.type === 'start') bgImage = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=200";
                            else if(node.type === 'battle') bgImage = "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=200";
                            else if(node.type === 'boss') bgImage = "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=200";
                        }

                        return (
                            <div 
                                key={node.id}
                                onClick={() => handleNodeClick(node.id)}
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-4 transition-all duration-300
                                    ${isReachable ? 'cursor-pointer animate-pulse ring-4 ring-violet-400 scale-110 z-20' : 'z-10'}
                                    ${node.type === 'step' ? 'bg-[#2a1d30]' : 'bg-black shadow-xl'}
                                    ${size}
                                    ${borderColor}
                                `}
                                style={{ left: node.x, top: node.y }}
                            >
                                {/* Contenu Visuel Noeud Majeur */}
                                {node.type !== 'step' && (
                                    <>
                                        <div className="absolute inset-0 rounded-full overflow-hidden opacity-80">
                                             <img src={bgImage} className="w-full h-full object-cover" />
                                        </div>
                                        {node.type === 'boss' && <div className="absolute inset-0 border-4 border-red-900 rounded-full animate-pulse pointer-events-none"></div>}
                                        <div className="absolute -bottom-10 bg-black/90 px-3 py-1 rounded text-violet-100 text-sm font-bold border border-violet-900 shadow-md whitespace-nowrap z-30 font-rpg">
                                            {node.label}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* JOUEURS */}
                    {players.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={false}
                            animate={{ left: nodes.find(n => n.id === p.currentNode)?.x || 0, top: nodes.find(n => n.id === p.currentNode)?.y || 0 }}
                            transition={{ type: "spring", stiffness: 90, damping: 14 }}
                            className={`absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-2 border-white shadow-[0_0_20px_black] z-30 overflow-hidden ${currentPlayer.id === p.id && !p.isDead ? 'ring-4 ring-violet-500 scale-110 z-40' : ''}`}
                        >
                            {p.isDead ? (
                                <div className="w-full h-full bg-red-950 flex items-center justify-center border-4 border-black">
                                    <span className="text-3xl drop-shadow-md">💀</span>
                                </div>
                            ) : (
                                <img src={p.portrait} className="w-full h-full object-cover" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* HUD CONTROLS (DÉS) */}
            <div className="absolute bottom-10 right-10 z-40 flex flex-col items-center gap-4">
                {phase === 'ROLL' && (
                    <div className="cursor-pointer hover:scale-110 transition-transform group" onClick={rollDice}>
                         <Dice3D value={diceValue} rolling={rolling} />
                         <div className="text-center mt-4 font-bold text-violet-100 bg-violet-900/80 border border-violet-500 rounded px-4 py-1 group-hover:bg-violet-700 transition-colors">
                            LANCER
                         </div>
                    </div>
                )}
                
                {/* Instructions */}
                {phase === 'MOVE' && (
                    <div className="bg-black/90 text-violet-100 px-6 py-3 rounded border border-violet-500 backdrop-blur-sm shadow-[0_0_15px_rgba(168,117,255,0.4)] text-lg">
                        Mouvements : <span className="font-bold text-3xl text-violet-400 ml-2">{movesLeft}</span>
                    </div>
                )}
            </div>

            {/* COMBAT MODAL */}
            {combatEnemy && (
                <CombatOverlay 
                    player={currentPlayer} 
                    enemy={combatEnemy} 
                    onWin={handleWinCombat}
                    onDefeat={handleDefeatCombat}
                    onFlee={handleFleeCombat}
                />
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
