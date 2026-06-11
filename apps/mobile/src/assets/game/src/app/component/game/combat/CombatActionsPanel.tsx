"use client";

import { PlayerSkill } from "@/shared/types/game";

type CombatActionsPanelProps = {
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

export default function CombatActionsPanel({
  canAct,
  selectedEnemyName,
  selectedEnemyIsDead = false,
  turnState,
  selectedSkill,
  unlockedSkills,
  activeMana,
  onAction,
  onSelectSkill,
}: CombatActionsPanelProps) {
  const hasValidTarget = Boolean(selectedEnemyName) && !selectedEnemyIsDead;

  return (
    <div className="rounded-2xl border border-violet-900 bg-[#1b0a3d]/70 p-4">
      <div className="text-sm font-bold text-violet-200 mb-3">Actions</div>

      {!canAct ? (
        <div className="text-sm text-gray-400 italic">En attente du tour d’un allié...</div>
      ) : (
        <>
          {hasValidTarget && (
            <div className="mb-3 text-xs text-violet-300">
              Cible actuelle : <span className="font-bold text-red-300">{selectedEnemyName}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onAction("attack")}
              disabled={turnState === "animating" || !hasValidTarget}
              className="rounded-xl border border-violet-700 bg-violet-900/30 hover:bg-violet-800/40 px-3 py-2.5 text-left transition disabled:opacity-40"
            >
              <div className="font-bold text-violet-100">⚔️ Attaquer</div>
            </button>

            <button
              onClick={() => onAction("special")}
              disabled={turnState === "animating" || !selectedSkill || !hasValidTarget}
              className="rounded-xl border border-fuchsia-700 bg-fuchsia-900/20 hover:bg-fuchsia-800/30 px-3 py-2.5 text-left transition disabled:opacity-40"
            >
              <div className="font-bold text-fuchsia-100">✨ Compétence</div>
              <div className="text-xs text-fuchsia-300 mt-1">
                {selectedSkill ? `${selectedSkill.name} • ${selectedSkill.manaCost} mana` : "Aucune compétence"}
              </div>
            </button>

            <button
              onClick={() => onAction("defend")}
              disabled={turnState === "animating"}
              className="rounded-xl border border-sky-700 bg-sky-900/20 hover:bg-sky-800/30 px-3 py-2.5 text-left transition disabled:opacity-40"
            >
              <div className="font-bold text-sky-100">🛡️ Défendre</div>
            </button>

            <button
              onClick={() => onAction("flee")}
              disabled={turnState === "animating"}
              className="rounded-xl border border-amber-700 bg-amber-900/20 hover:bg-amber-800/30 px-3 py-2.5 text-left transition disabled:opacity-40"
            >
              <div className="font-bold text-amber-100">🏃 Fuir</div>
              <div className="text-xs text-amber-300 mt-1">Quitte immédiatement le combat.</div>
            </button>
          </div>

          {unlockedSkills.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.18em] text-violet-400 mb-2">Compétences disponibles</div>
              <div className="space-y-2 max-h-[220px] xl:max-h-[260px] overflow-auto pr-1">
                {unlockedSkills.map((skill) => {
                  const selected = selectedSkill?.id === skill.id;
                  const affordable = activeMana >= skill.manaCost;

                  return (
                    <button
                      key={skill.id}
                      onClick={() => onSelectSkill(skill.id)}
                      className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                        selected
                          ? "border-fuchsia-400 bg-fuchsia-500/10"
                          : "border-violet-900 bg-black/20 hover:bg-violet-900/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-sm text-violet-100">
                          {skill.icon} {skill.name}
                        </div>
                        <div className={`text-xs font-bold ${affordable ? "text-blue-300" : "text-red-300"}`}>
                          {skill.manaCost} mana
                        </div>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">{skill.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
