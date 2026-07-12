import { generateBoard } from "./board";
import {
  Board, MAX_PLAYERS, MIN_PLAYERS, Move, Player,
  PLAYER_COLORS, Rng, Settings,
} from "./types";

export interface GameState {
  players: Player[];
  currentTurnId: number | null;
  board: Board;
  settings: Settings;
  dice: { value: number | null; rolling: boolean };
  auto: boolean;
  animating: boolean;
  status: "playing" | "over";
  nextPlayerId: number; // monotonic id source
}

export type Action =
  | { type: "RESET"; rng?: Rng }
  | { type: "ADD_PLAYER" }
  | { type: "REMOVE_PLAYER"; id: number }
  | { type: "SET_SETTINGS"; settings: Partial<Settings>; rng?: Rng }
  | { type: "SET_ROLLING"; rolling: boolean }
  | { type: "SET_DICE"; value: number }
  | { type: "SET_POSITION"; id: number; position: number }
  | { type: "RECORD_MOVE"; id: number; move: Move }
  | { type: "FINISH_PLAYER"; id: number }
  | { type: "ADVANCE_TURN" }
  | { type: "SET_ANIMATING"; animating: boolean }
  | { type: "SET_AUTO"; auto: boolean };

function makePlayer(id: number, seat: number): Player {
  return {
    id,
    name: `Player ${seat}`,
    color: PLAYER_COLORS[(seat - 1) % PLAYER_COLORS.length],
    position: 1,
    diceRolls: 0,
    moveHistory: [],
    finished: false,
    rank: null,
  };
}

export function createInitialState(settings: Settings, rng: Rng = Math.random): GameState {
  const players = [makePlayer(1, 1), makePlayer(2, 2)];
  return {
    players,
    currentTurnId: players[0].id,
    board: generateBoard(settings, rng),
    settings,
    dice: { value: null, rolling: false },
    auto: false,
    animating: false,
    status: "playing",
    nextPlayerId: 3,
  };
}

// Next unfinished player after currentId, wrapping around. Null if none.
export function nextActiveTurnId(players: Player[], currentId: number | null): number | null {
  const active = players.filter((p) => !p.finished);
  if (active.length === 0) return null;
  const order = players.map((p) => p.id);
  const start = currentId === null ? -1 : order.indexOf(currentId);
  for (let step = 1; step <= players.length; step++) {
    const candidate = players[(start + step + players.length) % players.length];
    if (!candidate.finished) return candidate.id;
  }
  return active[0].id;
}

function mapPlayer(players: Player[], id: number, fn: (p: Player) => Player): Player[] {
  return players.map((p) => (p.id === id ? fn(p) : p));
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "RESET":
      return createInitialState(state.settings, action.rng);

    case "SET_SETTINGS": {
      const settings = { ...state.settings, ...action.settings };
      const dimsChanged =
        settings.rows !== state.settings.rows || settings.cols !== state.settings.cols;
      if (dimsChanged) {
        // Board dimensions changed -> start a fresh game on the new board.
        return { ...createInitialState(settings, action.rng), settings };
      }
      return { ...state, settings };
    }

    case "ADD_PLAYER": {
      if (state.players.length >= MAX_PLAYERS) return state;
      const seat = state.players.length + 1;
      const player = makePlayer(state.nextPlayerId, seat);
      return { ...state, players: [...state.players, player], nextPlayerId: state.nextPlayerId + 1 };
    }

    case "REMOVE_PLAYER": {
      if (state.players.length <= MIN_PLAYERS) return state;
      const players = state.players.filter((p) => p.id !== action.id);
      const currentTurnId =
        state.currentTurnId === action.id
          ? nextActiveTurnId(state.players, action.id)
          : state.currentTurnId;
      return { ...state, players, currentTurnId };
    }

    case "SET_ROLLING":
      return { ...state, dice: { ...state.dice, rolling: action.rolling } };

    case "SET_DICE":
      return { ...state, dice: { value: action.value, rolling: false } };

    case "SET_POSITION":
      return { ...state, players: mapPlayer(state.players, action.id, (p) => ({ ...p, position: action.position })) };

    case "RECORD_MOVE":
      return {
        ...state,
        players: mapPlayer(state.players, action.id, (p) => ({
          ...p,
          moveHistory: [...p.moveHistory, action.move],
          diceRolls: action.move.dice ? p.diceRolls + 1 : p.diceRolls,
        })),
      };

    case "FINISH_PLAYER": {
      const rank = state.players.filter((p) => p.finished).length + 1;
      const players = mapPlayer(state.players, action.id, (p) => ({ ...p, finished: true, rank }));
      const stillPlaying = players.filter((p) => !p.finished).length;
      return { ...state, players, status: stillPlaying < 2 ? "over" : "playing" };
    }

    case "ADVANCE_TURN":
      return { ...state, currentTurnId: nextActiveTurnId(state.players, state.currentTurnId) };

    case "SET_ANIMATING":
      return { ...state, animating: action.animating };

    case "SET_AUTO":
      return { ...state, auto: action.auto };

    default:
      return state;
  }
}
