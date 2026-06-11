"use client";

import { Player } from "@/shared/types/game";
import { getDerivedPlayerStats } from "@/shared/lib/playerStats";
import { FloorBiome } from "@/shared/data/floors";

type Props = {
  currentPlayer: Player | undefined;
  currentFloor: number;
  floorBiome: FloorBiome;
  currentFloorStatues: number;
  requiredStatues: number;
};

export default function GameHUD({ currentPlayer, currentFloor, floorBiome, currentFloorStatues, requiredStatues }: Props) {
  const effectiveStats = currentPlayer ? getDerivedPlayerStats(currentPlayer) : null;
  return (
    <div className="min-h-16 bg-[#0f0518] z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-3 border-b-2 border-[#2c1266] shadow-lg md:h-20 md:flex-nowrap md:px-8 md:py-0">
      <div className="text-2xl font-fantasy text-violet-400 tracking-widest md:text-3xl">
        ETHERNIA
      </div>
      <div className="text-sm text-violet-300 font-rpg">
        Étage {currentFloor} • {floorBiome === "forest" ? "Forêt" : floorBiome === "ruins" ? "Ruines" : "Crypte"}
      </div>
      <div className="text-sm text-amber-200">
        Statuettes : {currentFloorStatues}/{requiredStatues}
      </div>
      <div className="hidden text-xs text-amber-300/80 md:block">
        {currentFloorStatues >= 2
          ? "Le boss a été affaibli."
          : currentFloorStatues === 1
          ? "Le boss a été partiellement affaibli."
          : "Le boss conserve toute sa puissance."}
      </div>
      <div className="flex min-w-[160px] flex-1 flex-col items-end md:min-w-[320px] md:flex-none">
        <div className="text-sm text-gray-400 font-rpg">Tour de</div>
        <div className="flex items-center gap-2 font-fantasy text-lg font-bold text-violet-100 md:text-2xl">
          {currentPlayer?.name}
          {currentPlayer?.isDead && (
            <span className="text-red-600 text-sm">(MORT)</span>
          )}
        </div>

        {currentPlayer && effectiveStats && (
          <div className="mt-2 hidden w-full max-w-[300px] space-y-2 sm:block">
            <div>
              <div className="flex justify-between text-[11px] text-red-200 mb-1">
                <span>Vie</span>
                <span>{effectiveStats.hp}/{effectiveStats.maxHp}</span>
              </div>
              <div className="h-2 bg-black/60 rounded overflow-hidden border border-red-900">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${(effectiveStats.hp / effectiveStats.maxHp) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-blue-200 mb-1">
                <span>Mana</span>
                <span>{effectiveStats.mana}/{effectiveStats.maxMana}</span>
              </div>
              <div className="h-2 bg-black/60 rounded overflow-hidden border border-blue-900">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(effectiveStats.mana / effectiveStats.maxMana) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-violet-200 mb-1">
                <span>Niveau {currentPlayer.level}</span>
                <span>{currentPlayer.xp}/{currentPlayer.xpToNextLevel} XP</span>
              </div>
              <div className="h-2 bg-black/60 rounded overflow-hidden border border-violet-900">
                <div
                  className="h-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${(currentPlayer.xp / currentPlayer.xpToNextLevel) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}