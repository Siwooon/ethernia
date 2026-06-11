import { GameAction } from "./gameActions";
import { EtherniaRunSave } from "./gameTypes";
import { createPlayer } from "./playerFactory";

export type GameReducerState = EtherniaRunSave;

export function gameReducer(state: GameReducerState, action: GameAction): GameReducerState {
  switch (action.type) {
    case "ADD_PLAYER":
      return {
        ...state,
        players: [
          ...state.players,
          createPlayer({
            id: state.players.length + 1,
            name: action.name,
            classType: action.classType,
          }),
        ],
      };

    case "MOVE_PLAYER":
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.playerId ? { ...player, currentNode: action.nodeId } : player
        ),
      };

    case "RESOLVE_NODE":
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId ? { ...node, isConsumed: true } : node
        ),
      };

    case "END_TURN":
      return {
        ...state,
        currentPlayerIndex:
          state.players.length === 0 ? 0 : (state.currentPlayerIndex + 1) % state.players.length,
      };

    default:
      return state;
  }
}
