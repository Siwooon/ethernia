"use client";

import { AnimatePresence, motion } from "framer-motion";

type BossPhaseTransitionProps = {
  transition: { label: string } | null;
};

export default function BossPhaseTransition({ transition }: BossPhaseTransitionProps) {
  return (
    <AnimatePresence>
      {transition && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          className="absolute inset-0 z-[140] flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.9, 1] }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-900/25"
          />

          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.45 }}
            className="px-8 py-5 rounded-2xl border border-red-500 bg-black/80 shadow-[0_0_35px_rgba(239,68,68,0.45)]"
          >
            <div className="text-center">
              <div className="text-sm uppercase tracking-[0.35em] text-red-300 mb-2">Transformation</div>
              <div className="text-4xl font-fantasy text-red-100">{transition.label}</div>
              <div className="text-sm text-red-200 mt-2">Le Cœur sauvage devient incontrôlable</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
