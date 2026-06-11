"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

type MobileActionSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function MobileActionSheet({
  open,
  title,
  onClose,
  children,
}: MobileActionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Fermer le panneau"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px] md:hidden"
          />

          <motion.section
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed inset-x-0 bottom-0 z-[80] max-h-[78vh] overflow-y-auto rounded-t-3xl border-t border-violet-700 bg-[#100719]/95 p-4 pb-24 shadow-[0_-16px_45px_rgba(0,0,0,0.55)] backdrop-blur-md md:hidden"
          >
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-violet-500/50" />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-fantasy text-xl text-violet-100">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full border border-violet-500/70 bg-black/40 px-3 py-1.5 text-sm text-violet-100"
              >
                Fermer
              </button>
            </div>
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
