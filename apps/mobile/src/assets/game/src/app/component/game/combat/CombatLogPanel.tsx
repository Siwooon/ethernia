"use client";

type CombatLogPanelProps = {
  logs: string[];
};

export default function CombatLogPanel({ logs }: CombatLogPanelProps) {
  return (
    <div className="rounded-2xl border border-violet-900 bg-[#1b0a3d]/70 p-4 flex-1 min-h-[180px] xl:min-h-[220px]">
      <div className="text-sm font-bold text-violet-200 mb-3">Journal du combat</div>
      <div className="space-y-2 max-h-[220px] xl:max-h-[340px] overflow-auto pr-1 text-sm">
        {logs.slice(0, 12).map((log, index) => (
          <div
            key={`${log}-${index}`}
            className="rounded-lg border border-violet-900/60 bg-black/20 px-3 py-2 text-violet-100"
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
