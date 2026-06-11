import { createUnavailableStorage, SyncGameStorage } from "@/shared/platform/storage";

const isBrowser = () => typeof window !== "undefined";

export const webStorage: SyncGameStorage = {
  getItem: (key) => {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (!isBrowser()) return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (!isBrowser()) return;
    window.localStorage.removeItem(key);
  },
};

export const safeWebStorage = isBrowser() ? webStorage : createUnavailableStorage();
