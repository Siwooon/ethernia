"use client";

import { AnimatePresence, motion } from "framer-motion";

type EnemyAttackBannerData = {
  name: string;
  description?: string;
  kind: "physical" | "magical" | "hybrid";
  enemyName?: string;
};

type EnemyAttackBannerProps = {
  banner: EnemyAttackBannerData | null;
};

function getEnemyAttackBannerIcon(kind: EnemyAttackBannerData["kind"]) {
  switch (kind) {
    case "physical":
      return "⚔️";
    case "magical":
      return "✨";
    case "hybrid":
      return "☄️";
    default:
      return "👹";
  }
}

export default function EnemyAttackBanner({ banner }: EnemyAttackBannerProps) {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          className="absolute top-4 xl:top-8 left-1/2 -translate-x-1/2 z-[120] pointer-events-none px-4 w-full flex justify-center"
        >
          <div className="rounded-2xl border border-red-500/70 bg-black/85 px-4 xl:px-6 py-3 xl:py-4 shadow-[0_0_25px_rgba(239,68,68,0.35)] w-full max-w-[460px] text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-red-300 mb-1">Attaque ennemie</div>
            <div className="text-sm text-red-200/80 mb-1">{banner.enemyName ?? "Ennemi"}</div>
            <div className="text-2xl font-fantasy text-red-100">
              {getEnemyAttackBannerIcon(banner.kind)} {banner.name}
            </div>
            {banner.description && <div className="text-sm text-red-200/85 mt-2">{banner.description}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
