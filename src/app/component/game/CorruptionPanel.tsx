"use client";

type CorruptionPanelProps = {
  corruptionLevel: number;
  corruptionLevelLabel: string;
  corruptionCharge: number;
  corruptionChargeMax: number;
  floorCorruptionTurn: number;
  floorCorruptionStartDelay: number;
  floorCorruptionInterval: number;
  corruptedNodesCount: number;
};

export default function CorruptionPanel({
  corruptionLevel,
  corruptionLevelLabel,
  corruptionCharge,
  corruptionChargeMax,
  floorCorruptionTurn,
  floorCorruptionStartDelay,
  floorCorruptionInterval,
  corruptedNodesCount,
}: CorruptionPanelProps) {
  return (
    <div className="bg-black/90 text-red-200 px-5 py-3 rounded border border-red-700 backdrop-blur-sm shadow-[0_0_15px_rgba(220,38,38,0.35)] text-sm">
      <div>
        Corruption globale :{" "}
        <span className="font-bold text-red-400">{corruptionLevelLabel}</span>
      </div>

      <div className="text-xs text-red-300/80 mt-1">Niveau global : {corruptionLevel}</div>
      <div className="text-xs text-red-300/80 mt-1">
        Jauge : {corruptionCharge}/{corruptionChargeMax}
      </div>

      <div className="mt-2 h-2 w-52 bg-black/60 rounded overflow-hidden border border-red-900">
        <div
          className="h-full bg-red-500 transition-all duration-300"
          style={{ width: `${(corruptionCharge / corruptionChargeMax) * 100}%` }}
        />
      </div>

      <div className="text-xs text-red-300/70 mt-2">
        Corruption du niveau : tour {floorCorruptionTurn}
      </div>
      <div className="text-xs text-red-300/70 mt-1">
        Propagation après {floorCorruptionStartDelay} tours, puis tous les {floorCorruptionInterval} tours
      </div>
      <div className="text-xs text-red-300/70 mt-1">Cases corrompues : {corruptedNodesCount}</div>
    </div>
  );
}
