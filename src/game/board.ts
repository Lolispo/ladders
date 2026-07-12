import { Board, BoardElement, ElementType, Rng, Settings, WinCondition } from "./types";

export interface RollResult {
  forfeited: boolean;      // exact-mode overshoot: turn wasted, no move
  landing: number;         // square reached by the dice before any element
  finalPosition: number;   // square after applying a snake/ladder (if any)
  element?: BoardElement;  // the snake/ladder traversed, if any
  won: boolean;            // reached the last square
}

const randInt = (rng: Rng, minInclusive: number, maxInclusive: number): number =>
  minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));

// ~8 ladders + ~8 snakes per 100 cells, scaled by area, never below 0.
const elementCount = (size: number): number => Math.max(0, Math.round((8 * size) / 100));

export function generateBoard(settings: Settings, rng: Rng = Math.random): Board {
  const size = settings.rows * settings.cols;
  const maxSpan = Math.floor(size / 2);
  const used = new Set<number>([1, size]); // reserve first & last squares
  const elements: BoardElement[] = [];

  const targets: ElementType[] = [];
  const perType = elementCount(size);
  for (let i = 0; i < perType; i++) targets.push("ladder", "snake");

  for (const type of targets) {
    // Bounded attempts so tiny/full boards can't loop forever.
    for (let attempt = 0; attempt < 100; attempt++) {
      const start = randInt(rng, 2, size - 1);
      if (used.has(start)) continue;

      const span = randInt(rng, 1, maxSpan);
      const end = type === "ladder" ? start + span : start - span;
      if (end <= 1 || end >= size) continue; // keep off first & last squares
      if (used.has(end)) continue;

      elements.push({ type, start, end });
      used.add(start);
      used.add(end);
      break;
    }
  }

  // Sort descending by start so the board list reads top-to-bottom.
  elements.sort((a, b) => b.start - a.start);
  return { rows: settings.rows, cols: settings.cols, size, elements };
}

export function rollDie(dieSides: number, rng: Rng = Math.random): number {
  return randInt(rng, 1, dieSides);
}

export function resolveRoll(
  position: number,
  roll: number,
  board: Board,
  winCondition: WinCondition
): RollResult {
  const { size, elements } = board;
  const raw = position + roll;

  // Exact-roll mode: an overshoot forfeits the move (stay put).
  if (winCondition === "exact" && raw > size) {
    return { forfeited: false, landing: position, finalPosition: position, won: false };
  }

  const landing = Math.min(raw, size);
  if (landing === size) {
    return { forfeited: false, landing, finalPosition: size, won: true };
  }

  const element = elements.find((el) => el.start === landing);
  const finalPosition = element ? element.end : landing;
  return { forfeited: false, landing, finalPosition, element, won: false };
}
