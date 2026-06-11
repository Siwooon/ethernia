"use client";

import { useState } from "react";
import { StatusEffect } from "@/shared/types/game";
import {
  formatCombatStatuses,
  StatusBadgeView,
} from "@/shared/engine/combat/statusPresentation";
import MobileStatusDetailSheet from "../mobile/MobileStatusDetailSheet";

type Props = {
  statuses: StatusEffect[];
  emptyLabel?: string;
  ownerLabel?: string;
};

export default function StatusBadges({
  statuses,
  emptyLabel = "Aucun effet",
  ownerLabel,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<StatusBadgeView | null>(
    null,
  );
  const formattedStatuses = formatCombatStatuses(statuses);

  if (!statuses.length) {
    return <div className="text-[11px] text-gray-500 italic">{emptyLabel}</div>;
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1">
        {formattedStatuses.map((status) => (
          <button
            key={status.key}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedStatus(status);
            }}
            className={`rounded-full border px-2 py-1 text-[11px] transition hover:brightness-125 active:scale-95 ${status.tone.bg} ${status.tone.border} ${status.tone.text}`}
            title={status.title}
            aria-label={`${ownerLabel ? `${ownerLabel} : ` : ""}${status.mobileHint}`}
          >
            {status.shortText}
          </button>
        ))}
      </div>

      <MobileStatusDetailSheet
        open={Boolean(selectedStatus)}
        status={selectedStatus}
        onClose={() => setSelectedStatus(null)}
      />
    </>
  );
}
