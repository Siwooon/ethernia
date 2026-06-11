"use client";

type HelpShortcutsProps = {
  open: boolean;
  onToggle: () => void;
};

export default function HelpShortcuts({ open, onToggle }: HelpShortcutsProps) {
  return (
    <div className="absolute bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      <button
        onClick={onToggle}
        className={`w-12 h-12 rounded-full border flex items-center justify-center text-xl font-bold shadow-lg transition-all ${
          open
            ? "bg-violet-700 border-violet-300 scale-110 shadow-[0_0_18px_rgba(168,117,255,0.55)]"
            : "bg-black/80 border-violet-700 hover:bg-violet-900/60 hover:scale-105"
        }`}
        title="Aide / raccourcis"
      >
        ?
      </button>

      {open && (
        <div className="bg-black/80 border border-violet-700 rounded-xl px-4 py-3 text-xs text-violet-200 shadow-lg backdrop-blur-sm animate-fadeIn">
          <div><span className="font-bold">C</span> Personnage</div>
          <div><span className="font-bold">I</span> Inventaire</div>
          <div><span className="font-bold">E</span> Équipement</div>
          <div><span className="font-bold">Échap</span> Fermer panneaux</div>
        </div>
      )}
    </div>
  );
}
