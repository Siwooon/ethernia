import { EtherniaRunSave } from "./gameTypes";
import { buildRunSaveSnapshot, normalizeLoadedRun } from "./gameState";
import { GameStorage, SyncGameStorage } from "@/shared/platform/storage";
import { GameClock, systemClock } from "@/shared/platform/time";

export const SAVE_KEY = "ethernia-save";
export const SAVE_VERSION = 1;

export type SavedRunInfo = {
  savedAt: number;
  currentFloor: number;
  heroCount: number;
  currentPlayerName?: string;
};

export type RunSavePayload<T = EtherniaRunSave> = {
  version: number;
  savedAt: number;
  data: T;
};

type BaseSaveSystemOptions<TStorage> = {
  storage: TStorage;
  clock?: GameClock;
};

function parseSavedRunPayload<T>(raw: string | null): RunSavePayload<T> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RunSavePayload<T>;

    if (parsed.version !== SAVE_VERSION || !parsed.data) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildSavedRunInfo(payload: RunSavePayload<EtherniaRunSave>): SavedRunInfo {
  const currentPlayer = payload.data.players[payload.data.currentPlayerIndex];

  return {
    savedAt: payload.savedAt,
    currentFloor: payload.data.currentFloor,
    heroCount: payload.data.players.length,
    currentPlayerName: currentPlayer?.name,
  };
}

export function createSyncRunSaveSystem({
  storage,
  clock = systemClock,
}: BaseSaveSystemOptions<SyncGameStorage>) {
  const saveRun = (data: EtherniaRunSave) => {
    const payload: RunSavePayload<EtherniaRunSave> = {
      version: SAVE_VERSION,
      savedAt: clock.now(),
      data: buildRunSaveSnapshot(data),
    };

    storage.setItem(SAVE_KEY, JSON.stringify(payload));
  };

  const loadRun = () => {
    const payload = parseSavedRunPayload<EtherniaRunSave>(storage.getItem(SAVE_KEY));
    return payload ? normalizeLoadedRun(payload.data) : null;
  };

  const deleteRun = () => {
    storage.removeItem(SAVE_KEY);
  };

  const getSavedRunInfo = () => {
    const payload = parseSavedRunPayload<EtherniaRunSave>(storage.getItem(SAVE_KEY));
    return payload ? buildSavedRunInfo(payload) : null;
  };

  const hasSavedRun = () => getSavedRunInfo() !== null;

  return {
    saveRun,
    loadRun,
    deleteRun,
    getSavedRunInfo,
    hasSavedRun,
  };
}

export function createAsyncRunSaveSystem({
  storage,
  clock = systemClock,
}: BaseSaveSystemOptions<GameStorage>) {
  const saveRun = async (data: EtherniaRunSave) => {
    const payload: RunSavePayload<EtherniaRunSave> = {
      version: SAVE_VERSION,
      savedAt: clock.now(),
      data: buildRunSaveSnapshot(data),
    };

    await storage.setItem(SAVE_KEY, JSON.stringify(payload));
  };

  const loadRun = async () => {
    const payload = parseSavedRunPayload<EtherniaRunSave>(await storage.getItem(SAVE_KEY));
    return payload ? normalizeLoadedRun(payload.data) : null;
  };

  const deleteRun = async () => {
    await storage.removeItem(SAVE_KEY);
  };

  const getSavedRunInfo = async () => {
    const payload = parseSavedRunPayload<EtherniaRunSave>(await storage.getItem(SAVE_KEY));
    return payload ? buildSavedRunInfo(payload) : null;
  };

  const hasSavedRun = async () => (await getSavedRunInfo()) !== null;

  return {
    saveRun,
    loadRun,
    deleteRun,
    getSavedRunInfo,
    hasSavedRun,
  };
}
