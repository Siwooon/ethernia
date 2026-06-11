import type { EnemyIntentionView } from "@/shared/engine/combat/combatTypes";
export type { EnemyIntentionView } from "@/shared/engine/combat/combatTypes";

type Props = {
  intentions: EnemyIntentionView[];
  selectedEnemyId?: string | null;
  onSelectEnemy?: (enemyId: string) => void;
};

const toneClasses: Record<EnemyIntentionView["tone"], string> = {
  attack: "border-red-700 bg-red-950/20 text-red-100",
  magic: "border-violet-600 bg-violet-950/25 text-violet-100",
  support: "border-sky-600 bg-sky-950/25 text-sky-100",
  danger: "border-amber-500 bg-amber-950/30 text-amber-100",
};

export default function EnemyIntentionsPanel({
  intentions,
  selectedEnemyId,
  onSelectEnemy,
}: Props) {
  if (!intentions.length) return null;

  return (
    <div className="rounded-2xl border border-violet-900/70 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-violet-400">
            Intentions ennemies
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Actions planifiées : elles seront exécutées au tour ennemi.
          </div>
        </div>
        <div className="text-lg">🔮</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {intentions.map((intention) => {
          const selected = selectedEnemyId === intention.enemyId;

          return (
            <button
              key={intention.enemyId}
              type="button"
              onClick={() => onSelectEnemy?.(intention.enemyId)}
              className={`text-left rounded-xl border p-3 transition-all ${toneClasses[intention.tone]} ${
                selected ? "ring-2 ring-amber-300/70" : "hover:border-violet-400"
              }`}
              title={intention.description}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-gray-300 truncate">
                    {intention.enemyName}
                  </div>
                  <div className="text-sm font-bold truncate mt-0.5">
                    {intention.icon} {intention.actionName}
                  </div>
                </div>
                {intention.isBoss && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-amber-400/70 bg-amber-500/15 text-amber-100">
                    Boss
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1 text-[11px] text-gray-200">
                <div>
                  <span className="text-gray-400">Cible :</span> {intention.targetLabel}
                  {intention.isArea ? " · zone" : ""}
                </div>
                <div>
                  <span className="text-gray-400">Dégâts :</span> {intention.damageLabel}
                </div>
                {intention.effectLabel && (
                  <div>
                    <span className="text-gray-400">Effet :</span> {intention.effectLabel}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
