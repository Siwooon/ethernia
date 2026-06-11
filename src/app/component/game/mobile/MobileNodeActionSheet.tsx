"use client";

import { MapNode } from "@/shared/types/game";
import {
  getMapNodeDescription,
  getMapNodeDisplay,
  getMapNodeStateLabel,
} from "@/shared/engine/map/mapPresentation";
import MobileActionSheet from "./MobileActionSheet";

type MobileNodeActionSheetProps = {
  node: MapNode | null;
  open: boolean;
  isCurrent: boolean;
  isReachable: boolean;
  isCorrupted: boolean;
  isConsumed: boolean;
  bossLocked: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function MobileNodeActionSheet({
  node,
  open,
  isCurrent,
  isReachable,
  isCorrupted,
  isConsumed,
  bossLocked,
  onClose,
  onConfirm,
}: MobileNodeActionSheetProps) {
  if (!node) return null;

  const display = getMapNodeDisplay(node);
  const statusLabel = getMapNodeStateLabel({
    isCurrent,
    isReachable,
    isCorrupted,
    isConsumed,
    bossLocked,
  });
  const canConfirm = isReachable && !bossLocked;

  return (
    <MobileActionSheet open={open} title={`${display.icon} ${display.label}`} onClose={onClose}>
      <div className="space-y-4 text-sm text-slate-100">
        <div className="rounded-2xl border border-violet-700/60 bg-black/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-violet-300/80">Nœud</div>
              <div className="mt-1 font-bold text-amber-100">{node.label ?? display.label}</div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                isCorrupted
                  ? "border-red-500/70 bg-red-950/60 text-red-100"
                  : isReachable
                    ? "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"
                    : "border-slate-600 bg-slate-950/50 text-slate-200"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <p className="mt-3 leading-relaxed text-slate-200/90">
            {getMapNodeDescription(node)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-700 bg-black/25 p-3">
            <div className="text-slate-400">Profondeur</div>
            <div className="mt-1 font-bold text-white">{node.depth}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-black/25 p-3">
            <div className="text-slate-400">Voies liées</div>
            <div className="mt-1 font-bold text-white">{node.neighbors.length}</div>
          </div>
        </div>

        {bossLocked && (
          <div className="rounded-2xl border border-red-700/70 bg-red-950/45 p-3 text-sm text-red-100">
            Il manque des statuettes pour affaiblir suffisamment le boss.
          </div>
        )}

        {isCorrupted && (
          <div className="rounded-2xl border border-red-700/70 bg-red-950/45 p-3 text-sm text-red-100">
            Ce nœud est corrompu : y entrer peut blesser ou affaiblir le héros actif.
          </div>
        )}

        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="w-full rounded-2xl border border-amber-400/80 bg-amber-500 px-5 py-4 text-base font-black uppercase tracking-wide text-black shadow-lg disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-300"
        >
          {canConfirm ? "Aller ici" : "Non disponible"}
        </button>
      </div>
    </MobileActionSheet>
  );
}
