"use client";

type Props = {
  eventMessage: { title: string; text: string } | null;
  onClose: () => void;
};

export default function EventModal({ eventMessage, onClose }: Props) {
  if (!eventMessage) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#14081f] border-2 border-violet-500 rounded-2xl shadow-[0_0_30px_rgba(168,117,255,0.35)] p-6 text-center">
        <h3 className="text-2xl font-fantasy text-violet-200 mb-3">
          {eventMessage.title}
        </h3>
        <p className="text-violet-100 mb-5 font-rpg">
          {eventMessage.text}
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white font-bold border border-violet-400 transition-colors"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}