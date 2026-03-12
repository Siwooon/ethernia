"use client";

import { CLASSES } from "@/app/component/data/classes";
import { ClassType, Player } from "@/app/component/types/game";
import { motion } from "framer-motion";

type Props = {
  playerName: string;
  selectedClass: ClassType;
  players: Player[];
  setPlayerName: (value: string) => void;
  setSelectedClass: (value: ClassType) => void;
  addPlayer: () => void;
  startGame: () => void;
};

export default function LobbyScreen({
  playerName,
  selectedClass,
  players,
  setPlayerName,
  setSelectedClass,
  addPlayer,
  startGame,
}: Props) {
  return (
    <motion.div
      key="lobby"
      className="h-screen flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=1920')] bg-cover"
    >
      <div className="bg-black/80 p-10 rounded-xl border-2 border-violet-600 text-center backdrop-blur-md shadow-[0_0_50px_rgba(142,74,232,0.4)]">
        <img src="/logo.svg" alt="Ethernia" className="w-44 h-36 mx-auto mb-2" />
        <h1 className="text-7xl font-fantasy text-violet-400 mb-8 drop-shadow-[0_0_15px_rgba(168,117,255,0.7)]">
          ETHERNIA
        </h1>
        <div className="flex gap-4 mb-6">
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Nom du héros"
            className="p-3 bg-[#1b0a3d] text-white rounded border border-purple-800 outline-none focus:border-violet-400 font-rpg text-lg flex-1"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value as ClassType)}
            className="p-3 bg-[#1b0a3d] text-violet-100 rounded border border-purple-800 outline-none font-rpg text-lg"
          >
            {Object.keys(CLASSES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={addPlayer}
            disabled={players.length >= 5}
            className="bg-violet-700 px-6 py-3 rounded text-white font-bold hover:bg-violet-600 border border-violet-400 disabled:opacity-50 transition-colors"
          >
            Ajouter
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-[#1b0a3d]/80 p-2 rounded border border-purple-900"
            >
              <img
                src={p.portrait}
                alt={p.name}
                className="w-10 h-10 rounded-full border border-violet-500 object-cover"
              />
              <div className="text-left">
                <div className="text-sm font-bold text-violet-100">{p.name}</div>
                <div className="text-xs text-violet-400">{p.classType}</div>
              </div>
            </div>
          ))}
        </div>

        {players.length > 0 && (
          <button
            onClick={startGame}
            className="w-full py-4 text-2xl font-fantasy bg-violet-800 hover:bg-violet-700 border-2 border-violet-400 text-white rounded-lg shadow-[0_0_20px_rgba(168,117,255,0.5)] transition-all"
          >
            COMMENCER L&apos;AVENTURE
          </button>
        )}
      </div>
    </motion.div>
  );
}