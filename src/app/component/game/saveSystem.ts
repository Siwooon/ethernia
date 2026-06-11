import { webStorage } from "@/app/platform/webStorage";
import {
  createSyncRunSaveSystem,
  SAVE_KEY,
  SAVE_VERSION,
} from "@/shared/engine/game/runSaveSystem";
import type { SavedRunInfo } from "@/shared/engine/game/runSaveSystem";

export { SAVE_KEY, SAVE_VERSION };
export type { SavedRunInfo };

export const createRunSaveSystem = createSyncRunSaveSystem;

const runSaveSystem = createRunSaveSystem({ storage: webStorage });

export const saveRun = runSaveSystem.saveRun;
export const loadRun = runSaveSystem.loadRun;
export const deleteRun = runSaveSystem.deleteRun;
export const getSavedRunInfo = runSaveSystem.getSavedRunInfo;
export const hasSavedRun = runSaveSystem.hasSavedRun;
