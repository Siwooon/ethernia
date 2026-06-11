"use client";

type MobileMapLegendProps = {
  currentPlayerName?: string;
  currentNodeLabel?: string;
  reachableCount: number;
};

export default function MobileMapLegend({
  currentPlayerName,
  currentNodeLabel,
  reachableCount,
}: MobileMapLegendProps) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-24 z-40 md:hidden">
      <div className="rounded-2xl border border-violet-600/70 bg-black/80 px-4 py-3 text-xs text-violet-100 shadow-[0_0_18px_rgba(168,117,255,0.22)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-bold text-amber-100">
              {currentPlayerName ?? "Héros"}
            </div>
            <div className="mt-0.5 truncate text-violet-200/80">
              Position : {currentNodeLabel ?? "inconnue"}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/50 px-3 py-2 text-center text-[11px] font-bold text-emerald-100">
            {reachableCount} voie{reachableCount > 1 ? "s" : ""}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-200/90">
          <span className="rounded-full bg-emerald-500/20 px-2 py-1">● position</span>
          <span className="rounded-full bg-violet-500/20 px-2 py-1">● accessible</span>
          <span className="rounded-full bg-red-500/20 px-2 py-1">● corrompu</span>
        </div>
      </div>
    </div>
  );
}
