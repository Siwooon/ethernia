import { createAsyncRunSaveSystem } from "@/shared/engine/game/runSaveSystem";
import { repairMobileRunSave } from "@/shared/engine/game/mobileRunRepair";
import { mobileStorage } from "./mobileStorage";

const baseMobileRunSaveSystem = createAsyncRunSaveSystem({
  storage: mobileStorage,
});

export const mobileRunSaveSystem = {
  ...baseMobileRunSaveSystem,
  async loadRun() {
    const run = await baseMobileRunSaveSystem.loadRun();
    if (!run) return null;

    const repair = repairMobileRunSave(run);
    if (repair.changed) {
      await baseMobileRunSaveSystem.saveRun(repair.state);
    }

    return repair.state;
  },
};
