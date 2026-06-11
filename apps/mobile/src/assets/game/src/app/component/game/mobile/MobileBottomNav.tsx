"use client";

import { SidePanelTab } from "../SideToolbar";

type MobileBottomNavProps = {
  activeSidePanel: SidePanelTab | null;
  corruptionOpen: boolean;
  onTogglePanel: (panel: SidePanelTab) => void;
  onToggleCorruption: () => void;
  onToggleHelp: () => void;
};

const panelButtons: { panel: SidePanelTab; icon: string; label: string }[] = [
  { panel: "stats", icon: "👤", label: "Héros" },
  { panel: "inventory", icon: "🎒", label: "Sac" },
  { panel: "equipment", icon: "🛡️", label: "Équip." },
];

export default function MobileBottomNav({
  activeSidePanel,
  corruptionOpen,
  onTogglePanel,
  onToggleCorruption,
  onToggleHelp,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] border-t border-violet-800 bg-[#0b0412]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.55)] backdrop-blur-md md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {panelButtons.map(({ panel, icon, label }) => {
          const active = activeSidePanel === panel;
          return (
            <button
              key={panel}
              onClick={() => onTogglePanel(panel)}
              className={`min-h-14 rounded-2xl border px-1 text-center text-[11px] font-bold transition ${
                active
                  ? "border-violet-300 bg-violet-700 text-white shadow-[0_0_16px_rgba(168,117,255,0.35)]"
                  : "border-violet-900 bg-black/45 text-violet-200"
              }`}
            >
              <div className="text-xl leading-6">{icon}</div>
              {label}
            </button>
          );
        })}

        <button
          onClick={onToggleCorruption}
          className={`min-h-14 rounded-2xl border px-1 text-center text-[11px] font-bold transition ${
            corruptionOpen
              ? "border-red-300 bg-red-800 text-white shadow-[0_0_16px_rgba(248,113,113,0.35)]"
              : "border-red-900 bg-black/45 text-red-200"
          }`}
        >
          <div className="text-xl leading-6">☠️</div>
          Corrupt.
        </button>

        <button
          onClick={onToggleHelp}
          className="min-h-14 rounded-2xl border border-amber-800 bg-black/45 px-1 text-center text-[11px] font-bold text-amber-200"
        >
          <div className="text-xl leading-6">?</div>
          Aide
        </button>
      </div>
    </nav>
  );
}
