"use client";

type MobileMapControlsProps = {
  scale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterPlayer: () => void;
};

export default function MobileMapControls({
  scale,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onCenterPlayer,
}: MobileMapControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-28 z-40 flex items-end justify-between gap-3 md:hidden">
      <button
        type="button"
        onClick={onCenterPlayer}
        className="pointer-events-auto rounded-2xl border border-violet-500 bg-black/85 px-4 py-3 text-sm font-bold text-violet-100 shadow-[0_0_16px_rgba(168,117,255,0.25)] backdrop-blur"
      >
        🎯 Héros
      </button>

      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-amber-500/60 bg-black/85 px-2 py-2 shadow-[0_0_16px_rgba(251,191,36,0.18)] backdrop-blur">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xl font-black text-amber-100 disabled:opacity-40"
          aria-label="Dézoomer la carte"
        >
          −
        </button>
        <div className="min-w-12 text-center text-xs font-bold text-amber-100">
          {Math.round(scale * 100)}%
        </div>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xl font-black text-amber-100 disabled:opacity-40"
          aria-label="Zoomer la carte"
        >
          +
        </button>
      </div>
    </div>
  );
}
