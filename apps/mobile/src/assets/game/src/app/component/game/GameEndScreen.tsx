"use client";

type GameEndScreenProps = {
  variant: "victory" | "defeat";
  onRestart?: () => void;
};

export default function GameEndScreen({ variant, onRestart }: GameEndScreenProps) {
  const isVictory = variant === "victory";

  return (
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center font-fantasy ${isVictory ? "text-emerald-300" : "text-red-600"}`}>
      <h1 className={`${isVictory ? "text-7xl" : "text-8xl drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]"} mb-4`}>
        {isVictory ? "VICTOIRE" : "GAME OVER"}
      </h1>
      <p className="text-white text-2xl font-rpg">
        {isVictory
          ? "Vous avez vaincu les ténèbres d’Ethernia."
          : "Tous les héros ont péri dans les ténèbres."}
      </p>
      <button
        onClick={onRestart ?? (() => window.location.reload())}
        className={`mt-8 px-8 py-4 border-2 rounded-lg text-white text-xl transition-colors ${
          isVictory
            ? "border-emerald-500 hover:bg-emerald-900"
            : "border-red-600 hover:bg-red-900"
        }`}
      >
        {isVictory ? "Recommencer" : "Recommencer l'expédition"}
      </button>
    </div>
  );
}
