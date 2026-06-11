"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { MapNode, Player } from "@/shared/types/game";
import { getDerivedPlayerStats } from "@/shared/lib/playerStats";
import { BIOME_VISUALS } from "@/shared/data/biomes";
import { FloorBiome } from "@/shared/data/floors";
import MobileMapControls from "./mobile/MobileMapControls";
import MobileMapLegend from "./mobile/MobileMapLegend";
import MobileNodeActionSheet from "./mobile/MobileNodeActionSheet";
import { useIsMobile } from "./mobile/useIsMobile";
import { getMapNodeDisplay } from "@/shared/engine/map/mapPresentation";

const DEBUG_SHOW_ALL_MAP = true;

type Props = {
  mapRef: RefObject<HTMLDivElement | null>;
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
  const isMobile = useIsMobile();
  const [mapScale, setMapScale] = useState(1);
  const [selectedMobileNodeId, setSelectedMobileNodeId] = useState<number | null>(null);

  const currentNode = useMemo(
    () => nodes.find((node) => node.id === currentPlayer?.currentNode),
    [currentPlayer?.currentNode, nodes]
  );

  const reachableCount = useMemo(() => {
    if (phase !== "MOVE" || !currentNode) return 0;
    return currentNode.neighbors.filter((neighborId) => {
      const neighbor = nodes.find((node) => node.id === neighborId);
      return !!neighbor && (DEBUG_SHOW_ALL_MAP || neighbor.visibility !== "hidden");
    }).length;
  }, [currentNode, nodes, phase]);

  useEffect(() => {
    setMapScale(isMobile ? 0.72 : 1);
  }, [isMobile]);

  const centerOnCurrentPlayer = useCallback(() => {
    const container = mapRef.current;
    if (!container || !currentNode) return;

    container.scrollTo({
      left: Math.max(0, currentNode.x * mapScale - container.clientWidth / 2),
      top: Math.max(0, currentNode.y * mapScale - container.clientHeight / 2),
      behavior: "smooth",
    });
  }, [currentNode, mapRef, mapScale]);

  useEffect(() => {
    if (!isMobile) return;
    const timeout = window.setTimeout(centerOnCurrentPlayer, 80);
    return () => window.clearTimeout(timeout);
  }, [centerOnCurrentPlayer, currentPlayer?.currentNode, isMobile]);

  const zoomIn = () => setMapScale((scale) => Math.min(1.1, Number((scale + 0.12).toFixed(2))));
  const zoomOut = () => setMapScale((scale) => Math.max(0.55, Number((scale - 0.12).toFixed(2))));

  const selectedMobileNode = useMemo(
    () => nodes.find((node) => node.id === selectedMobileNodeId) ?? null,
    [nodes, selectedMobileNodeId]
  );

  const selectedMobileNodeState = useMemo(() => {
    if (!selectedMobileNode) {
      return {
        isCurrent: false,
        isReachable: false,
        isCorrupted: false,
        isConsumed: false,
        bossLocked: false,
      };
    }

    const activeNode = nodes.find((node) => node.id === currentPlayer?.currentNode);

    return {
      isCurrent: currentPlayer?.currentNode === selectedMobileNode.id,
      isReachable:
        phase === "MOVE" && !!activeNode?.neighbors.includes(selectedMobileNode.id),
      isCorrupted: isNodeCorrupted(selectedMobileNode),
      isConsumed: !!selectedMobileNode.isConsumed,
      bossLocked: selectedMobileNode.kind === "boss" && currentFloorStatues < requiredStatues,
    };
  }, [currentFloorStatues, currentPlayer?.currentNode, isNodeCorrupted, nodes, phase, requiredStatues, selectedMobileNode]);

  return (
    <div
      ref={mapRef}
      className="relative flex-1 overflow-auto bg-[#0a0510] cursor-grab active:cursor-grabbing hide-scrollbar touch-pan-x touch-pan-y pb-32 md:pb-0"
    >
      {isMobile && (
        <>
          <MobileMapLegend
            currentPlayerName={currentPlayer?.name}
            currentNodeLabel={currentNode?.label}
            reachableCount={reachableCount}
          />
          <MobileMapControls
            scale={mapScale}
            canZoomIn={mapScale < 1.1}
            canZoomOut={mapScale > 0.55}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onCenterPlayer={centerOnCurrentPlayer}
          />
          <MobileNodeActionSheet
            node={selectedMobileNode}
            open={!!selectedMobileNode}
            isCurrent={selectedMobileNodeState.isCurrent}
            isReachable={selectedMobileNodeState.isReachable}
            isCorrupted={selectedMobileNodeState.isCorrupted}
            isConsumed={selectedMobileNodeState.isConsumed}
            bossLocked={selectedMobileNodeState.bossLocked}
            onClose={() => setSelectedMobileNodeId(null)}
            onConfirm={() => {
              if (selectedMobileNode) {
                handleNodeClick(selectedMobileNode.id);
              }
            }}
          />
        </>
      )}

      <div style={{ width: mapWidth * mapScale, height: mapHeight * mapScale }}>
        <div
          style={{
            width: mapWidth,
            height: mapHeight,
            transform: `scale(${mapScale})`,
            transformOrigin: "top left",
          }}
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
                (node.visibility === "hidden" || neighbor.visibility === "hidden")
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
            node.kind === "boss"

          const sizeClass = isMobile
            ? isSpecial ? "w-14 h-14" : "w-12 h-12"
            : isSpecial ? "w-16 h-16" : "w-14 h-14";

          const display = getMapNodeDisplay(node);

          let borderClass = display.border;
          let bgClass = display.bg;

          if (isCorrupted) {
            bgClass = "bg-red-950/70 text-white";
            borderClass = "border-red-700";
          }

          return (
            <div
              key={node.id}
              onClick={() => {
                if (isMobile) {
                  setSelectedMobileNodeId(node.id);
                  return;
                }
                handleNodeClick(node.id);
              }}
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
              <div className={isMobile ? "text-base leading-none" : "text-lg leading-none"}>
                {!shouldRevealDetails ? "?" : display.icon}
              </div>

              <div className={isMobile ? "text-[9px] font-bold text-center px-1 mt-0.5 leading-tight" : "text-[10px] font-bold text-center px-1 mt-1 leading-tight"}>
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
                  className={isMobile
                    ? "absolute -top-16 left-1/2 -translate-x-1/2 w-32 bg-black/85 border border-violet-500 rounded-lg px-2 py-1 shadow-[0_0_15px_rgba(168,117,255,0.35)] backdrop-blur-sm z-50"
                    : "absolute -top-20 left-1/2 -translate-x-1/2 w-36 bg-black/85 border border-violet-500 rounded-lg px-2 py-1 shadow-[0_0_15px_rgba(168,117,255,0.35)] backdrop-blur-sm z-50"
                  }
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
                className={`absolute ${isMobile ? "w-12 h-12 -ml-6 -mt-6" : "w-16 h-16 -ml-8 -mt-8"} rounded-full border-2 border-white shadow-[0_0_20px_black] overflow-hidden ${
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
    </div>
  );
}