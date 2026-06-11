export type GameRandom = {
  next(): number;
};

export const mathRandom: GameRandom = {
  next: () => Math.random(),
};

export function createSeededRandom(seed: number): GameRandom {
  let value = seed >>> 0;

  return {
    next: () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    },
  };
}

export function createStringSeed(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createRunSeed(prefix = "ETH"): string {
  const randomPart = Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .padStart(7, "0")
    .slice(0, 7)
    .toUpperCase();
  const timePart = Date.now().toString(36).slice(-5).toUpperCase();

  return `${prefix}-${timePart}-${randomPart}`;
}

export function createScopedRandom(seed: string | number, scope: string): GameRandom {
  const baseSeed = typeof seed === "number" ? seed : createStringSeed(seed);
  return createSeededRandom(createStringSeed(`${baseSeed}:${scope}`));
}

export function randomInt(rng: GameRandom, minInclusive: number, maxExclusive: number) {
  return Math.floor(rng.next() * (maxExclusive - minInclusive)) + minInclusive;
}

export function randomChance(rng: GameRandom, chance: number) {
  return rng.next() < chance;
}

export function randomPick<T>(rng: GameRandom, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }

  return items[randomInt(rng, 0, items.length)];
}

export function randomShuffle<T>(rng: GameRandom, items: readonly T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function randomIdSuffix(rng: GameRandom, length = 6) {
  let value = "";
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    value += alphabet[randomInt(rng, 0, alphabet.length)];
  }

  return value;
}
