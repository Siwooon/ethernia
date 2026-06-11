"use client";

import { EventChoice } from "@/shared/types/game";

type Props = {
  eventMessage: {
    title: string;
    text: string;
    choices?: EventChoice[];
  } | null;
  onClose: () => void;
  onChoice?: (choiceId: EventChoice["id"]) => void;
};

function getChoiceBadge(choice: EventChoice) {
  if (choice.style === "danger") {
    return {
      label: "⚠ Risqué",
      className: "bg-red-950/50 text-red-200 border-red-700",
    };
  }

  if (choice.style === "sacrifice") {
    return {
      label: "🩸 Sacrifice",
      className: "bg-amber-950/50 text-amber-200 border-amber-700",
    };
  }

  if (choice.style === "power") {
    return {
      label: "✨ Puissance",
      className: "bg-violet-950/50 text-violet-200 border-violet-700",
    };
  }

  return {
    label: "➜ Choix",
    className: "bg-slate-900/50 text-slate-200 border-slate-700",
  };
}

export default function EventModal({ eventMessage, onClose, onChoice }: Props) {
  if (!eventMessage) return null;

  const hasChoices = !!eventMessage.choices?.length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl bg-[#14081f] border-2 border-violet-500 rounded-2xl shadow-[0_0_35px_rgba(168,117,255,0.35)] p-6">
        <div className="mb-4 text-center">
          <h3 className="text-2xl md:text-3xl font-fantasy text-violet-200 mb-2">
            {eventMessage.title}
          </h3>

          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-violet-400 to-transparent mb-4" />

          <p className="text-violet-100/95 font-rpg whitespace-pre-line leading-relaxed">
            {eventMessage.text}
          </p>
        </div>

        {hasChoices ? (
          <div className="space-y-3 mt-6">
            {eventMessage.choices!.map((choice) => {
              const badge = getChoiceBadge(choice);

              return (
                <button
                  key={choice.id}
                  onClick={() => onChoice?.(choice.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-all hover:scale-[1.01] ${
                    choice.style === "danger"
                      ? "bg-red-950/30 border-red-700 hover:bg-red-900/40 text-red-100"
                      : choice.style === "sacrifice"
                      ? "bg-amber-950/30 border-amber-700 hover:bg-amber-900/40 text-amber-100"
                      : choice.style === "power"
                      ? "bg-violet-950/30 border-violet-700 hover:bg-violet-900/40 text-violet-100"
                      : "bg-[#1b0a3d]/80 border-violet-900 hover:bg-[#24114d] text-violet-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-base md:text-lg">
                        {choice.label}
                      </div>
                      <div className="text-sm opacity-90 mt-2 leading-relaxed">
                        {choice.description}
                      </div>
                    </div>

                    <div
                      className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${badge.className}`}
                    >
                      {badge.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-violet-700 hover:bg-violet-600 text-white font-bold border border-violet-400 transition-colors"
            >
              Continuer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}