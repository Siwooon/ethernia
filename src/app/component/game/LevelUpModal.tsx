"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ClassType, PlayerSkill } from "@/app/component/types/game";

type Growth = {
  hp: number;
  mana: number;
  strength: number;
  magic: number;
  defense: number;
};

type Props = {
  open: boolean;
  playerName: string;
  classType: ClassType;
  level: number;
  growth: Growth | null;
  newSkills: PlayerSkill[];
  onClose: () => void;
};

export default function LevelUpModal({
  open,
  playerName,
  classType,
  level,
  growth,
  newSkills,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && growth && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="w-full max-w-xl bg-[#14081f] border-2 border-violet-500 rounded-2xl shadow-[0_0_30px_rgba(168,117,255,0.4)] p-6"
          >
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">✨</div>
              <h2 className="text-3xl font-fantasy text-violet-200">
                Niveau supérieur !
              </h2>
              <p className="text-violet-300 mt-2 font-rpg">
                {playerName} — {classType}
              </p>
              <p className="text-white font-bold mt-1">Niveau {level}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div className="bg-[#1b0a3d]/80 rounded-lg p-3 border border-violet-900">
                <div className="text-gray-300">Vie max</div>
                <div className="text-green-400 font-bold">+{growth.hp}</div>
              </div>
              <div className="bg-[#1b0a3d]/80 rounded-lg p-3 border border-violet-900">
                <div className="text-gray-300">Mana max</div>
                <div className="text-blue-400 font-bold">+{growth.mana}</div>
              </div>
              <div className="bg-[#1b0a3d]/80 rounded-lg p-3 border border-violet-900">
                <div className="text-gray-300">Force</div>
                <div className="text-red-400 font-bold">+{growth.strength}</div>
              </div>
              <div className="bg-[#1b0a3d]/80 rounded-lg p-3 border border-violet-900">
                <div className="text-gray-300">Magie</div>
                <div className="text-cyan-300 font-bold">+{growth.magic}</div>
              </div>
              <div className="col-span-2 bg-[#1b0a3d]/80 rounded-lg p-3 border border-violet-900">
                <div className="text-gray-300">Défense</div>
                <div className="text-yellow-300 font-bold">+{growth.defense}</div>
              </div>
            </div>

            {newSkills.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-fantasy text-violet-200 mb-3">
                  {newSkills.length > 1 ? "Nouveaux sorts débloqués" : "Nouveau sort débloqué"}
                </h3>

                <div className="space-y-3">
                  {newSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="bg-[#1b0a3d]/80 rounded-lg p-3 border border-violet-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-violet-100 font-bold">
                          {skill.icon} {skill.name}
                        </div>
                        <div className="text-xs text-blue-300">
                          {skill.manaCost} mana
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 mt-1">
                        {skill.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg bg-violet-700 hover:bg-violet-600 text-white font-bold border border-violet-400 transition-colors"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}