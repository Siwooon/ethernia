"use client";

import { motion } from "framer-motion";
import { MapNode, Player } from "@/app/component/types/game";
import { getDerivedPlayerStats } from "@/app/component/lib/playerStats";
import { BIOME_VISUALS } from "@/app/component/data/biomes";
import { FloorBiome } from "@/app/component/data/floors";

const DEBUG_SHOW_ALL_MAP = true;

type Props = {
  mapRef: React.RefObject<HTMLDivElement | null>;
  mapWidth: number;
  mapHeight: number;
  floorBiome: FloorBiome;
  nodes: MapNode[];
  players: Player[];
  currentPlayer: Player | undefined;
  phase: "MOVE" | "EVENT" | "COMBAT";
  handleNodeClick: (nodeId: number) => void;
  isNodeCorrupted: (node: MapNode) => boolean;
  currentFloorStatues: number;
  requiredStatues: number;
};

function getNodeDisplay(node: MapNode) {
  if (node.kind === "start") {
    return { icon: "🟢", label: "Début", border: "border-lime-400", bg: "bg-lime-100/90 text-black" };
  }

  if (node.kind === "statuette") {
    return { icon: "🗿", label: "Statuette", border: "border-cyan-300", bg: "bg-cyan-100/90 text-black" };
  }

  if (node.kind === "boss_prep") {
    return { icon: "🛌", label: "Repos", border: "border-yellow-400", bg: "bg-yellow-100/90 text-black" };
  }

  if (node.kind === "boss") {
    return { icon: "👑", label: "Boss", border: "border-red-500", bg: "bg-red-100/90 text-black" };
  }

  if (node.kind === "stairs") {
    return { icon: "⬇️", label: "Sortie", border: "border-gray-400", bg: "bg-gray-100/90 text-black" };
  }

  switch (node.eventType) {
    case "battle":
      return { icon: "⚔️", label: "Combat", border: "border-slate-300", bg: "bg-white/90 text-black" };
    case "elite":
      return { icon: "💀", label: "Élite", border: "border-red-400", bg: "bg-red-100/90 text-black" };
    case "rest":
      return { icon: "🛌", label: "Repos", border: "border-cyan-400", bg: "bg-cyan-100/90 text-black" };
    case "treasure":
      return { icon: "💰", label: "Trésor", border: "border-amber-400", bg: "bg-amber-100/90 text-black" };
    case "random":
      return { icon: "❓", label: "Mystère", border: "border-violet-400", bg: "bg-violet-100/90 text-black" };
    case "merchant_blacksmith":
      return { icon: "🔨", label: "Forge", border: "border-orange-400", bg: "bg-orange-100/90 text-black" };
    case "merchant_alchemist":
      return { icon: "⚗️", label: "Alchi", border: "border-emerald-400", bg: "bg-emerald-100/90 text-black" };
    case "merchant_mystic":
      return { icon: "✨", label: "Mystique", border: "border-fuchsia-400", bg: "bg-fuchsia-100/90 text-black" };
    case "scripted_shrine":
      return { icon: "🕯️", label: "Sanctuaire", border: "border-indigo-400", bg: "bg-indigo-100/90 text-black" };
    default:
      return { icon: "•", label: "", border: "border-gray-300", bg: "bg-white/90 text-black" };
  }
}

export default function GameMap({
  mapRef,
  mapWidth,
  mapHeight,
  floorBiome,
  nodes,
  players,
  currentPlayer,
  phase,
  handleNodeClick,
  isNodeCorrupted,
  currentFloorStatues,
  requiredStatues,
}: Props) {
  const biomeVisuals = BIOME_VISUALS[floorBiome] ?? BIOME_VISUALS.forest;

  return (
    <div
      ref={mapRef}
      className="flex-1 overflow-auto bg-[#0a0510] relative cursor-grab active:cursor-grabbing hide-scrollbar"
    >
      <div
        style={{ width: mapWidth, height: mapHeight }}
        className={`relative shadow-2xl ${biomeVisuals.mapBgClass}`}
      >
        <div
          className="absolute inset-0 opacity-80 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `url('${biomeVisuals.mapOverlayImage}')` }}
        />

        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "110px 110px",
          }}
        />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.map((node) =>
            node.neighbors.map((neighborId) => {
              const neighbor = nodes.find((n) => n.id === neighborId);
              if (!neighbor || neighbor.id < node.id) return null;

              if (
              !DEBUG_SHOW_ALL_MAP &&
                node.visibility === "hidden" ||
                neighbor.visibility === "hidden"
              ) {
                return null;
              }

              const corruptedLine =
                isNodeCorrupted(node) || isNodeCorrupted(neighbor);

              return (
                <line
                  key={`${node.id}-${neighbor.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={neighbor.x}
                  y2={neighbor.y}
                  stroke={corruptedLine ? "#991b1b" : "#d1d5db"}
                  strokeWidth="6"
                  opacity={0.9}
                  strokeLinecap="round"
                />
              );
            })
          )}
        </svg>

        {nodes.map((node) => {
          if (!DEBUG_SHOW_ALL_MAP && node.visibility === "hidden") {
            return null;
          }

          const isVisited = node.visibility === "visited";
          const isDiscovered = node.visibility === "discovered";
          const isCurrent = currentPlayer?.currentNode === node.id;
          const corrupted = isNodeCorrupted(node);

          const isReachable =
            phase === "MOVE" &&
            !!nodes
              .find((n) => n.id === currentPlayer?.currentNode)
              ?.neighbors.includes(node.id);

          const shouldRevealDetails =
            DEBUG_SHOW_ALL_MAP ||
            node.visibility === "discovered" ||
            node.visibility === "visited";


          const isCorrupted = isNodeCorrupted(node);
          const isConsumed = !!node.isConsumed;
          const bossLocked =
            node.kind === "boss" && currentFloorStatues < requiredStatues;

          const isSpecial =
            node.kind === "start" ||
            node.kind === "statuette" ||
            node.kind === "boss_prep" ||
            node.kind === "boss" ||
            node.kind === "stairs";

          const sizeClass = isSpecial ? "w-16 h-16" : "w-14 h-14";

          const display = getNodeDisplay(node);

          let borderClass = display.border;
          let bgClass = display.bg;

          if (isCorrupted) {
            bgClass = "bg-red-950/70 text-white";
            borderClass = "border-red-700";
          }

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-xl border-4 shadow-lg transition-all duration-200
                ${sizeClass}
                ${borderClass}
                ${bgClass}
                ${isReachable ? "cursor-pointer scale-105 ring-4 ring-violet-400" : "cursor-default"}
                ${isCurrent ? "ring-4 ring-emerald-400" : ""}
                ${isConsumed && node.kind !== "boss" ? "opacity-50" : ""}
                ${bossLocked ? "opacity-60 grayscale" : ""}
                ${isDiscovered && !isVisited ? "opacity-70 saturate-50" : ""}
                ${corrupted ? "shadow-[0_0_18px_rgba(220,38,38,0.55)] border-red-700" : ""}
              `}
              style={{
                left: node.x,
                top: node.y,
              }}
            >
              <div className="text-lg leading-none">
                {!shouldRevealDetails ? "?" : display.icon}
              </div>

              <div className="text-[10px] font-bold text-center px-1 mt-1 leading-tight">
                {!shouldRevealDetails ? "?" : display.label}
              </div>
            </div>
          );
        })}

        {players.map((p) => {
          const currentNode = nodes.find((n) => n.id === p.currentNode);

          if (!currentNode || (!DEBUG_SHOW_ALL_MAP && currentNode.visibility === "hidden")) {
            return null;
          }

          const effectiveStats = getDerivedPlayerStats(p);
          const isActive = currentPlayer?.id === p.id && !p.isDead;

          return (
            <motion.div
              key={p.id}
              initial={false}
              animate={{
                left: currentNode.x,
                top: currentNode.y,
              }}
              transition={{ type: "spring", stiffness: 90, damping: 14 }}
              className="absolute z-30"
            >
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -top-20 left-1/2 -translate-x-1/2 w-36 bg-black/85 border border-violet-500 rounded-lg px-2 py-1 shadow-[0_0_15px_rgba(168,117,255,0.35)] backdrop-blur-sm z-50"
                >
                  <div className="text-[11px] text-violet-100 font-bold text-center truncate">
                    {p.name}
                  </div>

                  <div className="mt-1">
                    <div className="flex justify-between text-[9px] text-red-200 mb-0.5">
                      <span>PV</span>
                      <span>
                        {effectiveStats.hp}/{effectiveStats.maxHp}
                      </span>
                    </div>
                    <div className="h-1.5 bg-black/60 rounded overflow-hidden border border-red-900">
                      <div
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{
                          width: `${(effectiveStats.hp / effectiveStats.maxHp) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-1">
                    <div className="flex justify-between text-[9px] text-blue-200 mb-0.5">
                      <span>Mana</span>
                      <span>
                        {effectiveStats.mana}/{effectiveStats.maxMana}
                      </span>
                    </div>
                    <div className="h-1.5 bg-black/60 rounded overflow-hidden border border-blue-900">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{
                          width: `${(effectiveStats.mana / effectiveStats.maxMana) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div
                className={`absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-2 border-white shadow-[0_0_20px_black] overflow-hidden ${
                  isActive ? "ring-4 ring-violet-500 scale-110 z-40" : ""
                }`}
              >
                {p.isDead ? (
                  <div className="w-full h-full bg-red-950 flex items-center justify-center border-4 border-black">
                    <span className="text-3xl drop-shadow-md">💀</span>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={p.portrait}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-violet-700 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center border border-white shadow">
                      {p.level}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}