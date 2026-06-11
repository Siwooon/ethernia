export type GameClock = {
  now(): number;
};

export const systemClock: GameClock = {
  now: () => Date.now(),
};
