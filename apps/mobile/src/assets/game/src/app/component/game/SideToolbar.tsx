"use client";

export type SidePanelTab = "stats" | "inventory" | "equipment" | "passives";

type SideToolbarProps = {
  activeSidePanel: SidePanelTab | null;
  onToggle: (panel: SidePanelTab) => void;
};

const buttons: { panel: SidePanelTab; icon: string; title: string }[] = [
  { panel: "stats", icon: "👤", title: "Fiche personnage (C)" },
  { panel: "inventory", icon: "🎒", title: "Inventaire (I)" },
  { panel: "equipment", icon: "🛡️", title: "Équipement (E)" },
];

export default function SideToolbar({ activeSidePanel, onToggle }: SideToolbarProps) {
  return (
    <div className="absolute top-24 left-4 z-50 flex flex-col gap-3">
      {buttons.map(({ panel, icon, title }) => (
        <button
          key={panel}
          onClick={() => onToggle(panel)}
          className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl shadow-lg transition-all ${
            activeSidePanel === panel
              ? "bg-violet-700 border-violet-300 scale-110 shadow-[0_0_18px_rgba(168,117,255,0.55)]"
              : "bg-black/80 border-violet-700 hover:bg-violet-900/60 hover:scale-105"
          }`}
          title={title}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
