import { GameAction, GameActionLogEntry, describeGameAction } from "./gameActions";
import { gameReducer, GameReducerState } from "./gameReducer";
import { GameClock, systemClock } from "@/shared/platform/time";

export type GameDispatchResult = {
  state: GameReducerState;
  logEntry: GameActionLogEntry;
};

export function applyGameAction(
  state: GameReducerState,
  action: GameAction,
  clock: GameClock = systemClock
): GameDispatchResult {
  const createdAt = clock.now();
  const stateAfterAction = gameReducer(state, action);

  return {
    state: stateAfterAction,
    logEntry: {
      id: `${createdAt}-${action.type}`,
      type: action.type,
      label: describeGameAction(action),
      createdAt,
    },
  };
}

export function applyGameActions(
  initialState: GameReducerState,
  actions: GameAction[],
  clock: GameClock = systemClock
): GameDispatchResult {
  let result: GameDispatchResult = {
    state: initialState,
    logEntry: {
      id: `${clock.now()}-INIT`,
      type: "CONTINUE_RUN",
      label: "Initialiser",
      createdAt: clock.now(),
    },
  };

  for (const action of actions) {
    result = applyGameAction(result.state, action, clock);
  }

  return result;
}
