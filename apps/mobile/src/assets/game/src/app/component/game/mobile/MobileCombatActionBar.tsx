"use client";

import { useState } from "react";
import { PlayerSkill } from "@/shared/types/game";
import MobileActionSheet from "./MobileActionSheet";

type MobileCombatActionBarProps = {
  canAct: boolean;
  selectedEnemyName?: string;
  selectedEnemyIsDead?: boolean;
  turnState: "waiting" | "animating";
  selectedSkill: PlayerSkill | null;
  unlockedSkills: PlayerSkill[];
  activeMana: number;
  onAction: (action: "attack" | "special" | "defend" | "flee") => void;
  onSelectSkill: (skillId: string) => void;
};

export default function MobileCombatActionBar({
  canAct,
  selectedEnemyName,
  selectedEnemyIsDead = false,
  turnState,
  selectedSkill,
  unlockedSkills,
  activeMana,
  onAction,
  onSelectSkill,
}: MobileCombatActionBarProps) {
  const [skillsOpen, setSkillsOpen] = useState(false);
  const hasValidTarget = Boolean(selectedEnemyName) && !selectedEnemyIsDead;
  const isAnimating = turnState === "animating";
  const selectedSkillAffordable = selectedSkill
    ? activeMana >= selectedSkill.manaCost
    : false;

  const handleSpecial = () => {
    if (!selectedSkill) {
      setSkillsOpen(true);
      return;
    }
    onAction("special");
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-violet-800 bg-[#0b0412]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.6)] backdrop-blur-md md:hidden">
        <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px]">
          <div className="min-w-0 text-violet-300">
            Cible :{" "}
            <span className="font-bold text-red-200">
              {hasValidTarget ? selectedEnemyName : "aucune"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSkillsOpen(true)}
            className="shrink-0 rounded-full border border-fuchsia-700 bg-fuchsia-950/30 px-3 py-1.5 font-bold text-fuchsia-100"
          >
            {selectedSkill ? `✨ ${selectedSkill.name}` : "✨ Choisir"}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => onAction("attack")}
            disabled={!canAct || isAnimating || !hasValidTarget}
            className="min-h-14 rounded-2xl border border-violet-700 bg-violet-900/40 px-1 text-center text-[11px] font-bold text-violet-100 disabled:opacity-35"
          >
            <div className="text-xl leading-6">⚔️</div>
            Attaque
          </button>

          <button
            type="button"
            onClick={handleSpecial}
            disabled={
              !canAct ||
              isAnimating ||
              !hasValidTarget ||
              (Boolean(selectedSkill) && !selectedSkillAffordable)
            }
            className="min-h-14 rounded-2xl border border-fuchsia-700 bg-fuchsia-900/35 px-1 text-center text-[11px] font-bold text-fuchsia-100 disabled:opacity-35"
          >
            <div className="text-xl leading-6">✨</div>
            Comp.
          </button>

          <button
            type="button"
            onClick={() => onAction("defend")}
            disabled={!canAct || isAnimating}
            className="min-h-14 rounded-2xl border border-sky-700 bg-sky-900/35 px-1 text-center text-[11px] font-bold text-sky-100 disabled:opacity-35"
          >
            <div className="text-xl leading-6">🛡️</div>
            Garde
          </button>

          <button
            type="button"
            onClick={() => onAction("flee")}
            disabled={!canAct || isAnimating}
            className="min-h-14 rounded-2xl border border-amber-700 bg-amber-900/35 px-1 text-center text-[11px] font-bold text-amber-100 disabled:opacity-35"
          >
            <div className="text-xl leading-6">🏃</div>
            Fuir
          </button>
        </div>
      </div>

      <MobileActionSheet
        open={skillsOpen}
        title="Compétences"
        onClose={() => setSkillsOpen(false)}
      >
        {unlockedSkills.length === 0 ? (
          <div className="rounded-2xl border border-violet-900 bg-black/30 p-4 text-sm text-gray-300">
            Aucune compétence débloquée pour ce héros.
          </div>
        ) : (
          <div className="space-y-2">
            {unlockedSkills.map((skill) => {
              const selected = selectedSkill?.id === skill.id;
              const affordable = activeMana >= skill.manaCost;

              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => {
                    onSelectSkill(skill.id);
                    setSkillsOpen(false);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-fuchsia-400 bg-fuchsia-500/15"
                      : "border-violet-900 bg-black/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-violet-100">
                        {skill.icon} {skill.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-300">
                        {skill.description}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 rounded-full border px-2 py-1 text-xs font-bold ${
                        affordable
                          ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                          : "border-red-500/70 bg-red-500/15 text-red-200"
                      }`}
                    >
                      {skill.manaCost} mana
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </MobileActionSheet>
    </>
  );
}
