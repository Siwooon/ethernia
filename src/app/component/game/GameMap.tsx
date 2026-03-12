"use client";

import { motion } from "framer-motion";
import { MapNode, Player } from "@/app/component/types/game";
import { LOCATION_IMAGES } from "@/app/component/data/locations";
import { getEffectiveStats } from "@/app/component/lib/equipment";

type Props = {
  mapRef: React.RefObject<HTMLDivElement | null>;
  mapWidth: number;
  mapHeight: number;
  floorBiome: "forest" | "ruins" | "crypt";
  nodes: MapNode[];
  players: Player[];
  currentPlayer: Player | undefined;
  phase: "MOVE" | "EVENT" | "COMBAT";
  handleNodeClick: (nodeId: number) => void;
  isNodeCorrupted: (node: MapNode) => boolean;
};

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
}: Props) {
  return (
    <div ref={mapRef} className="flex-1 overflow-auto bg-[#0a0510] relative cursor-grab active:cursor-grabbing hide-scrollbar">
        <div
          style={{ width: mapWidth, height: mapHeight }}
          className={`relative shadow-2xl ${
            floorBiome === "forest"
              ? "bg-green-950"
              : floorBiome === "ruins"
              ? "bg-stone-900"
              : "bg-purple-950"
          }`}>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074')] opacity-40 mix-blend-overlay pointer-events-none" />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.map((node) =>
            node.neighbors.map((neighborId) => {
              const neighbor = nodes.find((n) => n.id === neighborId);
              if (!neighbor || neighbor.id < node.id) return null;

              const corruptedLine = isNodeCorrupted(node) || isNodeCorrupted(neighbor);

              return (
                <line
                  key={`${node.id}-${neighbor.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={neighbor.x}
                  y2={neighbor.y}
                  stroke={corruptedLine ? "#991b1b" : "#5e2cb8"}
                  strokeWidth={corruptedLine ? "5" : "4"}
                  strokeDasharray={node.type === "step" || neighbor.type === "step" ? "6,6" : "0"}
                  opacity={corruptedLine ? "0.95" : "0.8"}
                />
              );
            })
          )}
        </svg>

        {nodes.map((node) => {
          const isReachable =
            phase === "MOVE" &&
            !!nodes.find((n) => n.id === currentPlayer?.currentNode)?.neighbors.includes(node.id);

          const isCorrupted = isNodeCorrupted(node);

          let size = "w-6 h-6";
          let borderColor = "border-[#5e2cb8]";
          let bgImage = "";

          if (node.type !== "step") {
            size = "w-24 h-24";

            borderColor =
              node.type === "start"
                ? "border-green-600"
                : node.type === "boss"
                ? "border-red-600"
                : node.eventType === "rest"
                ? "border-cyan-500"
                : node.eventType === "random"
                ? "border-amber-500"
                : node.eventType === "treasure"
                ? "border-yellow-400"
                : node.eventType === "merchant_blacksmith" ||
                  node.eventType === "merchant_alchemist" ||
                  node.eventType === "merchant_mystic"
                ? "border-emerald-500"
                : node.eventType === "scripted_shrine"
                ? "border-fuchsia-500"
                : "border-violet-600";

            if (node.type === "start") {
              bgImage =
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=200";
            } else if (node.type === "boss" || node.eventType === "boss") {
              bgImage =
                "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=200";
            } else {
              bgImage = LOCATION_IMAGES[node.locationTheme];
            }
          }

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-4 transition-all duration-300
                ${isReachable ? "cursor-pointer animate-pulse ring-4 ring-violet-400 scale-110 z-20" : "z-10"}
                ${node.type === "step" ? "bg-[#2a1d30]" : "bg-black shadow-xl"}
                ${isCorrupted ? "ring-2 ring-red-700 shadow-[0_0_20px_rgba(220,38,38,0.45)]" : ""}
                ${size}
                ${borderColor}
              `}
              style={{ left: node.x, top: node.y }}
            >
              {node.type !== "step" && (
                <>
                  <div className="absolute inset-0 rounded-full overflow-hidden opacity-80">
                    <img src={bgImage} alt={node.label || node.type} className="w-full h-full object-cover" />
                  </div>

                  {node.type === "boss" && (
                    <div className="absolute inset-0 border-4 border-red-900 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                 {node.eventType === "rest" && (
                    <div className="absolute inset-0 border-4 border-cyan-400/60 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                  {node.eventType === "random" && (
                    <div className="absolute inset-0 border-4 border-amber-400/60 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                  {node.eventType === "treasure" && (
                    <div className="absolute inset-0 border-4 border-yellow-300/60 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                  {(node.eventType === "merchant_blacksmith" ||
                    node.eventType === "merchant_alchemist" ||
                    node.eventType === "merchant_mystic") && (
                    <div className="absolute inset-0 border-4 border-emerald-400/60 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                  {node.eventType === "scripted_shrine" && (
                    <div className="absolute inset-0 border-4 border-fuchsia-400/60 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                  {isCorrupted && (
                    <div className="absolute inset-0 rounded-full bg-red-900/25 animate-pulse pointer-events-none"></div>
                  )}

                  <div className="absolute -bottom-10 bg-black/90 px-3 py-1 rounded text-violet-100 text-sm font-bold border border-violet-900 shadow-md whitespace-nowrap z-30 font-rpg">
                    {node.label}
                  </div>
                </>
              )}
            </div>
          );
        })}

      {players.map((p) => {
        const effectiveStats = getEffectiveStats(p);
        const isActive = currentPlayer?.id === p.id && !p.isDead;

        return (
          <motion.div
            key={p.id}
            initial={false}
            animate={{
              left: nodes.find((n) => n.id === p.currentNode)?.x || 0,
              top: nodes.find((n) => n.id === p.currentNode)?.y || 0,
            }}
            transition={{ type: "spring", stiffness: 90, damping: 14 }}
            className="absolute z-30"
          >
          {isActive && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-36 bg-black/85 border border-violet-500 rounded-lg px-2 py-1 shadow-[0_0_15px_rgba(168,117,255,0.35)] backdrop-blur-sm z-50">               
              <div className="text-[11px] text-violet-100 font-bold text-center truncate">
                  {p.name}
                </div>

                <div className="mt-1">
                  <div className="flex justify-between text-[9px] text-red-200 mb-0.5">
                    <span>PV</span>
                    <span>{effectiveStats.hp}/{effectiveStats.maxHp}</span>
                  </div>
                  <div className="h-1.5 bg-black/60 rounded overflow-hidden border border-red-900">
                    <div
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{ width: `${(effectiveStats.hp / effectiveStats.maxHp) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-1">
                  <div className="flex justify-between text-[9px] text-blue-200 mb-0.5">
                    <span>Mana</span>
                    <span>{effectiveStats.mana}/{effectiveStats.maxMana}</span>
                  </div>
                  <div className="h-1.5 bg-black/60 rounded overflow-hidden border border-blue-900">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(effectiveStats.mana / effectiveStats.maxMana) * 100}%` }}
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
                  <img src={p.portrait} alt={p.name} className="w-full h-full object-cover" />
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