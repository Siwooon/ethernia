"use client";

import { CLASSES } from "@/app/component/data/classes";
import { ClassType, Player } from "@/app/component/types/game";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  playerName: string;
  selectedClass: ClassType;
  players: Player[];
  setPlayerName: (value: string) => void;
  setSelectedClass: (value: ClassType) => void;
  addPlayer: () => void;
  startGame: () => void;
};

type MenuParticle = {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
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
  const [particles, setParticles] = useState<MenuParticle[]>([]);
  useEffect(() => {
    const generatedParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 90}%`,
      size: 4 + Math.random() * 8,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 3,
    }));

    setParticles(generatedParticles);
  }, []);
  const selectedClassData = CLASSES[selectedClass];

  return(
    <motion.div
      key="lobby"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="h-screen flex items-center justify-center bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: "url('/backgrounds/menu-ethernia.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-black/20 to-black/70" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.length > 0 &&
          particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-violet-300/70 shadow-[0_0_14px_rgba(196,181,253,0.7)]"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -18, 0],
              x: [0, 6, 0],
              opacity: [0.15, 0.75, 0.15],
              scale: [0.85, 1.2, 0.85],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <div className="relative z-10 w-full max-w-6xl px-6">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-left"
          >

            <div className="relative mb-3 w-fit">
              <motion.div
                className="absolute inset-0 -z-10 blur-3xl rounded-full"
                animate={{
                  opacity: [0.28, 0.5, 0.28],
                  scale: [0.9, 1.08, 0.9],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  background:
                    "radial-gradient(circle, rgba(192,132,252,0.45) 0%, rgba(168,85,247,0.22) 35%, rgba(0,0,0,0) 72%)",
                }}
              />
              
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-40 w-40 rounded-full border border-violet-400/20"
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                  scale: [0.92, 1.06, 0.92],
                }}
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              

              <img
                src="/logo.svg"
                alt="Ethernia"
                className="w-36 h-28 mx-auto drop-shadow-[0_0_24px_rgba(168,85,247,0.38)]"
              />

              <motion.h1
                className="text-6xl md:text-7xl xl:text-8xl font-fantasy text-violet-300 leading-none drop-shadow-[0_0_25px_rgba(168,85,247,0.45)]"
                animate={{
                  textShadow: [
                    "0 0 18px rgba(168,85,247,0.28)",
                    "0 0 30px rgba(192,132,252,0.55)",
                    "0 0 18px rgba(168,85,247,0.28)",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                ETHERNIA
              </motion.h1>
            </div>

            <p className="mt-5 max-w-xl text-base md:text-lg text-violet-100/85 leading-relaxed">
              Les failles déchirent le monde, libérant une corruption qui consume tout sur son passage. <br/>
              <br/>Rassemble tes héros, rentre dans la faille et affronte les
              terres corrompues pour en atteindre son cœur et l'arréter avant qu'il ne soit trop tard.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-2xl">
              <div className="rounded-2xl border border-violet-500/25 bg-black/35 px-4 py-4 backdrop-blur-sm">
                <div className="text-violet-300 text-sm font-bold mb-1">
                  Exploration
                </div>
                <div className="text-violet-100/75 text-sm">
                  Donjons, étages, events et corruption : chaque partie est unique.
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/25 bg-black/35 px-4 py-4 backdrop-blur-sm">
                <div className="text-violet-300 text-sm font-bold mb-1">
                  Coopération
                </div>
                <div className="text-violet-100/75 text-sm">
                  Monte une équipe, combine les classes et avance ensemble.
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/25 bg-black/35 px-4 py-4 backdrop-blur-sm">
                <div className="text-violet-300 text-sm font-bold mb-1">
                  Corruption
                </div>
                <div className="text-violet-100/75 text-sm">
                  Chaque choix nourrit les ténèbres qui envahissent la carte.
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30, y: 12 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="rounded-3xl border border-violet-500/45 bg-black/55 backdrop-blur-md p-6 md:p-8 shadow-[0_0_40px_rgba(142,74,232,0.25)]"
          >
            <div className="mb-6 text-center">
              <h2 className="text-2xl md:text-3xl font-fantasy text-violet-200 drop-shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                Prépare l’expédition
              </h2>
              <p className="mt-2 text-sm text-violet-100/70">
                Choisis un héros, ajoute ton groupe, puis lance la descente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_140px] gap-3 mb-4 items-stretch">
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nom du héros"
                className="p-3 bg-[#1b0a3d]/90 text-white rounded-xl border border-purple-800 outline-none focus:border-violet-400 font-rpg text-lg shadow-inner"
              />

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value as ClassType)}
                className="p-3 bg-[#1b0a3d]/90 text-violet-100 rounded-xl border border-purple-800 outline-none font-rpg text-lg"
              >
                {Object.keys(CLASSES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={addPlayer}
                disabled={players.length >= 4}
                className="bg-violet-700 px-6 py-3 rounded-xl text-white font-bold hover:bg-violet-600 border border-violet-400 disabled:opacity-50 transition-all shadow-[0_0_18px_rgba(168,85,247,0.25)]"
              >
                Ajouter
              </button>
            </div>
            <div className="rounded-2xl border border-violet-800 bg-[#1b0a3d]/70 p-4 mb-5">
              <div className="flex items-start gap-3">
                <img
                  src={selectedClassData.portrait}
                  alt={selectedClass}
                  className="w-14 h-14 rounded-xl border border-violet-700 shrink-0"
                />

                <div className="min-w-0">
                  <div className="text-lg font-bold text-violet-100">{selectedClass}</div>
                  <div className="text-sm text-violet-300">
                    {selectedClassData.role || "Rôle non défini"}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-violet-100/85 leading-relaxed">
                {selectedClassData.shortDescription || "Description non définie."}
              </p>

              <div className="mt-3 grid gap-2 text-xs">
                <div className="text-violet-200">
                  <span className="font-bold">Base :</span>{" "}
                  {selectedClassData.baseSkillName || "—"}
                </div>
                <div className="text-violet-200">
                  <span className="font-bold">Signature :</span>{" "}
                  {selectedClassData.signatureSkillName || "—"}
                </div>
                <div className="text-violet-200">
                  <span className="font-bold">Synergies :</span>{" "}
                  {selectedClassData.synergyTags?.join(" • ") || "Aucune"}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm uppercase tracking-wider text-violet-300/90">
                  Équipe
                </div>
                <div className="text-xs text-violet-100/60">
                  {players.length}/ 4 héros
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 min-h-[120px]">
                {players.length > 0 ? (
                  players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-[#1b0a3d]/70 p-3 rounded-xl border border-purple-900/80 shadow-[0_0_12px_rgba(0,0,0,0.2)]"
                    >
                      <img
                        src={p.portrait}
                        alt={p.name}
                        className="w-11 h-11 rounded-full border border-violet-500 object-cover"
                      />
                      <div className="text-left">
                        <div className="text-sm font-bold text-violet-100">
                          {p.name}
                        </div>
                        <div className="text-xs text-violet-400">
                          {p.classType}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-violet-700/60 bg-black/20 px-4 py-6 text-center text-sm text-violet-200/60">
                    Aucun héros
                  </div>
                )}
              </div>
            </div>

            {players.length > 0 && (
              <button
                onClick={startGame}
                className="w-full py-4 text-2xl font-fantasy bg-violet-800 hover:bg-violet-700 border-2 border-violet-400 text-white rounded-2xl shadow-[0_0_24px_rgba(168,117,255,0.45)] transition-all hover:scale-[1.01]"
              >
                COMMENCER L&apos;AVENTURE
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}