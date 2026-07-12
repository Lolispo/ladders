export type ElementType = "ladder" | "snake";

export interface BoardElement {
  type: ElementType;
  start: number;
  end: number;
}

export interface Board {
  rows: number;
  cols: number;
  size: number; // rows * cols
  elements: BoardElement[];
}

export type WinCondition = "overshoot" | "exact";

export interface Settings {
  rows: number;
  cols: number;
  dieSides: number;
  winCondition: WinCondition;
}

export interface Move {
  moveNumber: number;
  from: number;
  to: number;
  dice?: number;               // present for a dice move
  elementType?: ElementType;   // present when a snake/ladder was traversed
}

export interface Player {
  id: number;
  name: string;
  color: string;
  position: number;
  diceRolls: number;
  moveHistory: Move[];
  finished: boolean;
  rank: number | null;         // 1-based finishing order, null while playing
}

export type Rng = () => number; // returns [0, 1), like Math.random

export const DEFAULT_SETTINGS: Settings = {
  rows: 10,
  cols: 10,
  dieSides: 6,
  winCondition: "overshoot",
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

// Readable, distinct player colors (indexed by seat).
export const PLAYER_COLORS = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4",
];
