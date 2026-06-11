"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CombatResultKind = "victory" | "defeat" | "flee";

type PlayerRecap = {
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  isDead: boolean;
};

type XpState = {
  playerId: number;
  playerName: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  gainedXp: number;
};

type AnimatedXpState = XpState & {
  displayXp: number;
  displayLevel: number;
  displayXpToNext: number;
  shownGain: number;
  flashes: number[];
  isAnimating: boolean;
};

type Props = {
  open: boolean;
  kind: CombatResultKind;
  title: string;
  summary: string;
  xp?: number;
  gold?: number;
  rewards?: string[];
  players: PlayerRecap[];
  xpStates?: XpState[];
  onClose: () => void;
};

export default function CombatResultModal({
  open,
  kind,
  title,
  summary,
  xp = 0,
  gold = 0,
  rewards = [],
  players,
  xpStates = [],
  onClose,
}: Props) {
  const [animatedXpStates, setAnimatedXpStates] = useState<AnimatedXpState[]>([]);
  const flashIdRef = useRef(0);

  useEffect(() => {
    if (!open || kind !== "victory" || xpStates.length === 0) {
      setAnimatedXpStates(
        xpStates.map((xpState) => ({
          ...xpState,
          displayXp: xpState.currentXp,
          displayLevel: xpState.level,
          displayXpToNext: xpState.xpToNextLevel,
          shownGain: 0,
          flashes: [],
          isAnimating: false,
        }))
      );
      return;
    }

    setAnimatedXpStates(
      xpStates.map((xpState) => ({
        ...xpState,
        displayXp: xpState.currentXp,
        displayLevel: xpState.level,
        displayXpToNext: xpState.xpToNextLevel,
        shownGain: 0,
        flashes: [],
        isAnimating: xpState.gainedXp > 0,
      }))
    );

    const intervals: number[] = [];

    xpStates.forEach((xpState) => {
      let remaining = xpState.gainedXp;
      let currentXp = xpState.currentXp;
      let currentLevel = xpState.level;
      let currentXpToNext = xpState.xpToNextLevel;
      let shownGain = 0;

      const interval = window.setInterval(() => {
        if (remaining <= 0) {
          setAnimatedXpStates((prev) =>
            prev.map((entry) =>
              entry.playerId === xpState.playerId
                ? { ...entry, isAnimating: false }
                : entry
            )
          );
          window.clearInterval(interval);
          return;
        }

        const dynamicStep =
          remaining > 120 ? 8 : remaining > 60 ? 5 : remaining > 25 ? 3 : 1;

        const step = Math.min(dynamicStep, remaining);
        currentXp += step;
        shownGain += step;
        remaining -= step;

        let newFlashLevel: number | null = null;

        if (currentXp >= currentXpToNext) {
          currentXp -= currentXpToNext;
          currentLevel += 1;
          currentXpToNext = Math.floor(currentXpToNext * 1.25);
          newFlashLevel = currentLevel;
        }

        setAnimatedXpStates((prev) =>
          prev.map((entry) => {
            if (entry.playerId !== xpState.playerId) return entry;

            const nextEntry = {
              ...entry,
              displayXp: currentXp,
              displayLevel: currentLevel,
              displayXpToNext: currentXpToNext,
              shownGain,
            };

            if (newFlashLevel !== null) {
              const flashId = ++flashIdRef.current;
              nextEntry.flashes = [...entry.flashes, flashId];

              window.setTimeout(() => {
                setAnimatedXpStates((innerPrev) =>
                  innerPrev.map((innerEntry) =>
                    innerEntry.playerId === xpState.playerId
                      ? {
                          ...innerEntry,
                          flashes: innerEntry.flashes.filter((id) => id !== flashId),
                        }
                      : innerEntry
                  )
                );
              }, 1400);
            }

            return nextEntry;
          })
        );
      }, 26);

      intervals.push(interval);
    });

    return () => {
      intervals.forEach((id) => window.clearInterval(id));
    };
  }, [open, kind, xpStates]);

  const hasRunningAnimation = useMemo(() => {
    return animatedXpStates.some((entry) => entry.isAnimating);
  }, [animatedXpStates]);

  const tone =
    kind === "victory"
      ? {
          border: "border-emerald-500",
          glow: "shadow-[0_0_35px_rgba(16,185,129,0.25)]",
          title: "text-emerald-200",
          badge: "bg-emerald-950/40 border-emerald-700 text-emerald-200",
          button: "bg-violet-700 hover:bg-violet-600 border-violet-400",
        }
      : kind === "defeat"
      ? {
          border: "border-red-500",
          glow: "shadow-[0_0_35px_rgba(239,68,68,0.25)]",
          title: "text-red-200",
          badge: "bg-red-950/40 border-red-700 text-red-200",
          button: "bg-red-700 hover:bg-red-600 border-red-400",
        }
      : {
          border: "border-amber-500",
          glow: "shadow-[0_0_35px_rgba(245,158,11,0.25)]",
          title: "text-amber-200",
          badge: "bg-amber-950/40 border-amber-700 text-amber-200",
          button: "bg-amber-700 hover:bg-amber-600 border-amber-400",
        };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div
        className={`w-full max-w-4xl rounded-2xl border-2 bg-[#14081f] p-6 ${tone.border} ${tone.glow} relative overflow-hidden`}
      >
        {kind === "victory" && (
          <>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_45%)]" />
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
          </>
        )}

        <div className="text-center mb-6 relative z-10">
          <h2 className={`text-3xl font-fantasy ${tone.title}`}>{title}</h2>
          <p className="mt-3 text-violet-100/90 font-rpg whitespace-pre-line">
            {summary}
          </p>
        </div>

        {(xp > 0 || gold > 0 || rewards.length > 0) && (
          <div className="grid md:grid-cols-3 gap-3 mb-6 relative z-10">
            <div className={`rounded-xl border p-4 ${tone.badge}`}>
              <div className="text-xs uppercase opacity-80">XP</div>
              <div className="text-2xl font-bold mt-1">+{xp}</div>
            </div>

            <div className={`rounded-xl border p-4 ${tone.badge}`}>
              <div className="text-xs uppercase opacity-80">Or</div>
              <div className="text-2xl font-bold mt-1">+{gold}</div>
            </div>

            <div className={`rounded-xl border p-4 ${tone.badge}`}>
              <div className="text-xs uppercase opacity-80">Récompenses</div>
              <div className="text-sm font-bold mt-1">
                {rewards.length > 0 ? rewards.join(", ") : "Aucune"}
              </div>
            </div>
          </div>
        )}

        {kind === "victory" && animatedXpStates.length > 0 && (
          <div className="mb-6 rounded-2xl border border-violet-800 bg-[#1b0a3d]/80 p-4 relative overflow-hidden">
            <div className="text-sm font-bold text-violet-200 mb-4">
              Progression du groupe
            </div>

            <div className="space-y-4">
              {animatedXpStates.map((xpEntry) => {
                const xpPercent =
                  xpEntry.displayXpToNext > 0
                    ? Math.max(
                        0,
                        Math.min(100, (xpEntry.displayXp / xpEntry.displayXpToNext) * 100)
                      )
                    : 0;

                return (
                  <div
                    key={xpEntry.playerId}
                    className="rounded-xl border border-violet-900 bg-black/25 p-4 relative overflow-hidden"
                  >
                    {xpEntry.flashes.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="animate-[levelPop_1.4s_ease-out_forwards] rounded-2xl border border-amber-400/70 bg-amber-300/10 px-6 py-3 text-center shadow-[0_0_30px_rgba(251,191,36,0.25)]">
                          <div className="text-amber-300 text-sm uppercase tracking-[0.25em]">
                            Niveau supérieur
                          </div>
                          <div className="text-3xl font-fantasy text-amber-200 mt-1">
                            Niveau {xpEntry.displayLevel}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 mb-2 relative z-10">
                      <div>
                        <div className="text-lg font-bold text-violet-100">
                          {xpEntry.playerName}
                        </div>
                        <div className="text-sm text-violet-300">
                          Niveau {xpEntry.displayLevel}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-blue-200">
                          {xpEntry.displayXp} / {xpEntry.displayXpToNext} XP
                        </div>
                        {xpEntry.isAnimating ? (
                          <div className="text-xs text-emerald-300 animate-pulse">
                            Gain d'expérience...
                          </div>
                        ) : (
                          <div className="text-xs text-violet-300/80">
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10">
                      <div className="h-5 rounded-full bg-black/50 overflow-hidden border border-violet-900 relative">
                        <div
                          className="absolute inset-0 opacity-40"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                            animation: xpEntry.isAnimating
                              ? "xpShine 1.1s linear infinite"
                              : "none",
                          }}
                        />
                        <div
                          className={`h-full transition-[width] duration-75 relative ${
                            xpEntry.isAnimating
                              ? "shadow-[0_0_20px_rgba(59,130,246,0.55)]"
                              : ""
                          }`}
                          style={{
                            width: `${xpPercent}%`,
                            background:
                              "linear-gradient(90deg, rgba(37,99,235,0.95) 0%, rgba(59,130,246,1) 45%, rgba(96,165,250,1) 100%)",
                          }}
                        >
                          {xpEntry.isAnimating && (
                            <div className="absolute right-0 top-0 h-full w-6 bg-white/25 blur-[2px]" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <div className="text-violet-300/80">
                          XP gagnée :{" "}
                          <span className="font-bold text-emerald-300">
                            +{xpEntry.shownGain}
                          </span>
                          {xpEntry.shownGain < xpEntry.gainedXp && (
                            <span className="text-violet-400/70">
                              {" "}
                              / +{xpEntry.gainedXp}
                            </span>
                          )}
                        </div>

                        <div className="text-violet-300/80">
                          Prochain niveau :{" "}
                          {xpEntry.displayXpToNext - xpEntry.displayXp} XP restantes
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-violet-900 bg-[#1b0a3d]/70 p-4 relative z-10">
          <div className="text-sm font-bold text-violet-200 mb-3">
            État du groupe
          </div>

          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.name}
                className="rounded-xl border border-violet-800 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="font-bold text-violet-100">{player.name}</div>
                  <div
                    className={`text-xs font-bold px-2 py-1 rounded-full border ${
                      player.isDead
                        ? "bg-red-950/40 border-red-700 text-red-200"
                        : "bg-emerald-950/40 border-emerald-700 text-emerald-200"
                    }`}
                  >
                    {player.isDead ? "Mort" : "En vie"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex justify-between text-red-200 mb-1">
                      <span>PV</span>
                      <span>
                        {player.hp}/{player.maxHp}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-black/40 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${
                            player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0
                          }%`,
                          background:
                            "linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(248,113,113,1) 100%)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-blue-200 mb-1">
                      <span>Mana</span>
                      <span>
                        {player.mana}/{player.maxMana}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-black/40 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${
                            player.maxMana > 0
                              ? (player.mana / player.maxMana) * 100
                              : 0
                          }%`,
                          background:
                            "linear-gradient(90deg, rgba(37,99,235,0.95) 0%, rgba(96,165,250,1) 100%)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center relative z-10">
          <button
            onClick={onClose}
            disabled={hasRunningAnimation}
            className={`px-6 py-2 rounded-xl text-white font-bold border transition-all ${
              hasRunningAnimation
                ? "bg-gray-700 border-gray-500 opacity-60 cursor-not-allowed"
                : tone.button
            }`}
          >
            {hasRunningAnimation ? "..." : "Continuer"}
          </button>
        </div>

        <style jsx>{`
          @keyframes xpShine {
            0% {
              transform: translateX(-120%);
            }
            100% {
              transform: translateX(220%);
            }
          }

          @keyframes levelPop {
            0% {
              opacity: 0;
              transform: scale(0.8) translateY(12px);
            }
            15% {
              opacity: 1;
              transform: scale(1.04) translateY(0);
            }
            75% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
            100% {
              opacity: 0;
              transform: scale(1.08) translateY(-10px);
            }
          }
        `}</style>
      </div>
    </div>
  );
}