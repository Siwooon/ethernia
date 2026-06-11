"use client";

import { StatusBadgeView } from "@/shared/engine/combat/statusPresentation";
import MobileActionSheet from "./MobileActionSheet";

type MobileStatusDetailSheetProps = {
  open: boolean;
  status: StatusBadgeView | null;
  onClose: () => void;
};

export default function MobileStatusDetailSheet({
  open,
  status,
  onClose,
}: MobileStatusDetailSheetProps) {
  return (
    <MobileActionSheet
      open={open && Boolean(status)}
      title={status?.label ?? "Effet actif"}
      onClose={onClose}
    >
      {status && (
        <div className="space-y-3">
          <div
            className={`rounded-2xl border p-4 ${status.tone.bg} ${status.tone.border}`}
          >
            <div className={`text-lg font-bold ${status.tone.text}`}>
              {status.label}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-200">
              {status.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl border border-violet-900 bg-black/25 p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-violet-400">
                Valeur
              </div>
              <div className="mt-1 text-xl font-bold text-violet-100">
                {status.value}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-900 bg-black/25 p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-violet-400">
                Durée
              </div>
              <div className="mt-1 text-xl font-bold text-violet-100">
                {status.duration > 0 ? `${status.duration}t` : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-900 bg-black/25 p-4 text-sm text-gray-200">
            {status.impact}
            {status.source && (
              <div className="mt-2 text-xs text-gray-400">
                Source : {status.source}
              </div>
            )}
          </div>
        </div>
      )}
    </MobileActionSheet>
  );
}
