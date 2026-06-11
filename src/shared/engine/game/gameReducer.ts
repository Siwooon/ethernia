import { GameAction } from "./gameActions";
import { EtherniaRunSave } from "./gameTypes";
import { createPlayer } from "./playerFactory";
import { CORRUPTION_CHARGE_MAX, movePlayersToStartNode } from "./gameState";
import { applyCorruptionMutations, markNodeConsumed, markNodeResolved, revealAroundNode } from "@/shared/engine/map/mapEngine";
import { applyCorruptionChargeToState } from "./corruptionEngine";

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

    case "REMOVE_PLAYER": {
      const players = state.players.filter((player) => player.id !== action.playerId);
      return {
        ...state,
        players,
        currentPlayerIndex: Math.min(state.currentPlayerIndex, Math.max(players.length - 1, 0)),
      };
    }

    case "START_RUN":
      return {
        ...state,
        runSeed: action.runSeed,
        players: movePlayersToStartNode(state.players, action.floorState.startNodeId),
        currentPlayerIndex: 0,
        currentFloor: action.floorState.currentFloor,
        currentFloorBiome: action.floorState.currentFloorBiome,
        nodes: action.floorState.nodes,
        mapWidth: action.floorState.mapWidth,
        mapHeight: action.floorState.mapHeight,
        previousNode: null,
        corruptionLevel: action.floorState.corruptionLevel,
        corruptionCharge: action.floorState.corruptionCharge,
        corruptedNodeIds: action.floorState.corruptedNodeIds,
        floorCorruptionTurn: action.floorState.floorCorruptionTurn,
        currentFloorStatues: action.floorState.currentFloorStatues,
      };

    case "MOVE_PLAYER":
      return {
        ...state,
        previousNode: action.previousNode ?? state.previousNode,
        players: state.players.map((player) =>
          player.id === action.playerId ? { ...player, currentNode: action.nodeId } : player
        ),
        nodes: action.revealAroundTarget ? revealAroundNode(state.nodes, action.nodeId) : state.nodes,
      };

    case "SET_PLAYERS":
      return {
        ...state,
        players: action.players,
        currentPlayerIndex: Math.min(state.currentPlayerIndex, Math.max(action.players.length - 1, 0)),
      };

    case "UPDATE_PLAYER":
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.playerId ? action.player : player
        ),
      };

    case "UPDATE_CURRENT_PLAYER":
      return {
        ...state,
        players: state.players.map((player, idx) =>
          idx === state.currentPlayerIndex ? action.player : player
        ),
      };

    case "SET_CURRENT_PLAYER_INDEX":
      return {
        ...state,
        currentPlayerIndex: action.playerIndex,
      };

    case "CONSUME_NODE":
      return {
        ...state,
        nodes: markNodeConsumed(state.nodes, action.nodeId),
      };

    case "RESOLVE_NODE":
      return {
        ...state,
        nodes: action.label
          ? markNodeResolved(state.nodes, action.nodeId, action.label)
          : state.nodes.map((node) =>
              node.id === action.nodeId ? { ...node, isConsumed: true } : node
            ),
      };

    case "SET_NODES":
      return {
        ...state,
        nodes: action.nodes,
      };

    case "ADD_CORRUPTION_CHARGE": {
      const result = applyCorruptionChargeToState({
        currentCharge: state.corruptionCharge,
        currentLevel: state.corruptionLevel,
        amount: action.amount,
        chargeMax: CORRUPTION_CHARGE_MAX,
      });

      return {
        ...state,
        corruptionCharge: result.nextCharge,
        corruptionLevel: result.nextLevel,
        nodes: applyCorruptionMutations({
          nodes: state.nodes,
          corruptedNodeIds: state.corruptedNodeIds,
          corruptionLevel: result.nextLevel,
          corruptionCharge: result.nextCharge,
        }),
      };
    }

    case "SET_CORRUPTION":
      return {
        ...state,
        corruptionLevel: action.level,
        corruptionCharge: action.charge,
        corruptedNodeIds: action.corruptedNodeIds,
        nodes: applyCorruptionMutations({
          nodes: state.nodes,
          corruptedNodeIds: action.corruptedNodeIds,
          corruptionLevel: action.level,
          corruptionCharge: action.charge,
        }),
      };

    case "SET_CURRENT_FLOOR_STATUES":
      return {
        ...state,
        currentFloorStatues: action.count,
      };

    case "INCREMENT_FLOOR_STATUES":
      return {
        ...state,
        currentFloorStatues: Math.min(action.max, state.currentFloorStatues + 1),
      };

    case "END_TURN":
      return {
        ...state,
        previousNode: null,
        currentPlayerIndex: action.nextPlayerIndex,
        floorCorruptionTurn: action.floorCorruptionTurn,
        corruptedNodeIds: action.corruptedNodeIds ?? state.corruptedNodeIds,
      };

    case "ADVANCE_FLOOR":
      return {
        ...state,
        currentPlayerIndex: 0,
        currentFloor: action.floorState.currentFloor,
        currentFloorBiome: action.floorState.currentFloorBiome,
        nodes: action.floorState.nodes,
        mapWidth: action.floorState.mapWidth,
        mapHeight: action.floorState.mapHeight,
        previousNode: null,
        corruptionLevel: action.floorState.corruptionLevel,
        corruptionCharge: action.floorState.corruptionCharge,
        corruptedNodeIds: action.floorState.corruptedNodeIds,
        floorCorruptionTurn: action.floorState.floorCorruptionTurn,
        currentFloorStatues: action.floorState.currentFloorStatues,
      };

    default:
      return state;
  }
}
