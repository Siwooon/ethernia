"use client";

type MobileCombatLayoutProps = {
  round: number;
  activeTurnLabel: string;
  selectedTargetLabel?: string;
  onOpenIntentions: () => void;
  onOpenLog: () => void;
};

export default function MobileCombatLayout({
  round,
  activeTurnLabel,
  selectedTargetLabel,
  onOpenIntentions,
  onOpenLog,
}: MobileCombatLayoutProps) {
  return (
    <div className="mb-3 rounded-2xl border border-violet-900/70 bg-black/25 p-3 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-violet-400">
            Combat mobile
          </div>
          <div className="mt-1 font-fantasy text-xl text-violet-100">
            Round {round}
          </div>
        </div>
        <div className="text-right text-[11px] text-gray-300">
          <div>Tour</div>
          <div className="max-w-[150px] truncate font-bold text-violet-100">
            {activeTurnLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenIntentions}
          className="rounded-2xl border border-amber-700 bg-amber-950/25 px-3 py-3 text-left text-xs font-bold text-amber-100"
        >
          🔮 Intentions
          <div className="mt-1 truncate text-[11px] font-normal text-gray-300">
            Cible : {selectedTargetLabel || "aucune"}
          </div>
        </button>
        <button
          type="button"
          onClick={onOpenLog}
          className="rounded-2xl border border-violet-700 bg-violet-950/25 px-3 py-3 text-left text-xs font-bold text-violet-100"
        >
          📜 Journal
          <div className="mt-1 text-[11px] font-normal text-gray-300">
            Voir les dernières actions
          </div>
        </button>
      </div>
    </div>
  );
}
