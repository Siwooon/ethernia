export type StorageValue = string | null;
export type MaybePromise<T> = T | Promise<T>;

export type GameStorage = {
  getItem(key: string): MaybePromise<StorageValue>;
  setItem(key: string, value: string): MaybePromise<void>;
  removeItem(key: string): MaybePromise<void>;
};

export type SyncGameStorage = {
  getItem(key: string): StorageValue;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export const memoryStorage = (initialValues?: Record<string, string>): SyncGameStorage => {
  const values = new Map<string, string>(Object.entries(initialValues ?? {}));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};

export const createUnavailableStorage = (): SyncGameStorage => ({
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});
