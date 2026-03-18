"use client";

import { EventChoice } from "@/app/component/types/game";

type Props = {
  eventMessage: {
    title: string;
    text: string;
    choices?: EventChoice[];
  } | null;
  onClose: () => void;
  onChoice?: (choiceId: EventChoice["id"]) => void;
};

export default function EventModal({ eventMessage, onClose, onChoice }: Props) {
  if (!eventMessage) return null;

  const hasChoices = !!eventMessage.choices?.length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#14081f] border-2 border-violet-500 rounded-2xl shadow-[0_0_30px_rgba(168,117,255,0.35)] p-6 text-center">
        <h3 className="text-2xl font-fantasy text-violet-200 mb-3">
          {eventMessage.title}
        </h3>

        <p className="text-violet-100 mb-5 font-rpg whitespace-pre-line">
          {eventMessage.text}
        </p>

        {hasChoices ? (
          <div className="space-y-3">
            {eventMessage.choices!.map((choice) => (
              <button
                key={choice.id}
                onClick={() => onChoice?.(choice.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                  choice.style === "danger"
                    ? "bg-red-950/40 border-red-700 hover:bg-red-900/50 text-red-100"
                    : choice.style === "sacrifice"
                    ? "bg-amber-950/40 border-amber-700 hover:bg-amber-900/50 text-amber-100"
                    : "bg-violet-950/40 border-violet-700 hover:bg-violet-900/50 text-violet-100"
                }`}
              >
                <div className="font-bold text-base">{choice.label}</div>
                <div className="text-sm opacity-90 mt-1">{choice.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white font-bold border border-violet-400 transition-colors"
          >
            Continuer
          </button>
        )}
      </div>
    </div>
  );
}