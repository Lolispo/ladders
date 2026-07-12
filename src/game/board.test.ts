import { generateBoard, resolveRoll, rollDie } from "./board";
import { Board, Rng, Settings } from "./types";

const settings: Settings = { rows: 10, cols: 10, dieSides: 6, winCondition: "overshoot" };

// Deterministic RNG: cycles through a fixed sequence.
function seededRng(seq: number[]): Rng {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("generateBoard", () => {
  const board = generateBoard(settings, seededRng([0.05, 0.2, 0.37, 0.5, 0.63, 0.78, 0.91, 0.44, 0.12, 0.66]));

  test("size is rows * cols", () => {
    expect(board.size).toBe(100);
  });

  test("ladders go up and snakes go down", () => {
    for (const el of board.elements) {
      if (el.type === "ladder") expect(el.end).toBeGreaterThan(el.start);
      else expect(el.end).toBeLessThan(el.start);
    }
  });

  test("no endpoint on the first or last square", () => {
    for (const el of board.elements) {
      expect(el.start).not.toBe(1);
      expect(el.end).not.toBe(1);
      expect(el.start).not.toBe(board.size);
      expect(el.end).not.toBe(board.size);
    }
  });

  test("every endpoint square is unique across all elements", () => {
    const squares = board.elements.flatMap((el) => [el.start, el.end]);
    expect(new Set(squares).size).toBe(squares.length);
  });

  test("no element spans more than half the board", () => {
    const maxSpan = Math.floor(board.size / 2);
    for (const el of board.elements) {
      expect(Math.abs(el.end - el.start)).toBeLessThanOrEqual(maxSpan);
    }
  });

  test("produces both snakes and ladders on a full board", () => {
    expect(board.elements.some((e) => e.type === "ladder")).toBe(true);
    expect(board.elements.some((e) => e.type === "snake")).toBe(true);
  });

  test("degrades gracefully on a tiny board (no throw, no infinite loop)", () => {
    const tiny = generateBoard({ ...settings, rows: 2, cols: 2 }, Math.random);
    expect(tiny.size).toBe(4);
    expect(Array.isArray(tiny.elements)).toBe(true);
  });
});

const testBoard: Board = {
  rows: 10,
  cols: 10,
  size: 100,
  elements: [
    { type: "ladder", start: 4, end: 40 },
    { type: "snake", start: 50, end: 10 },
  ],
};

describe("resolveRoll", () => {
  test("plain move with no element", () => {
    const r = resolveRoll(1, 2, testBoard, "overshoot");
    expect(r.landing).toBe(3);
    expect(r.finalPosition).toBe(3);
    expect(r.element).toBeUndefined();
    expect(r.won).toBe(false);
  });

  test("landing on a ladder start climbs to its end", () => {
    const r = resolveRoll(1, 3, testBoard, "overshoot"); // lands on 4
    expect(r.landing).toBe(4);
    expect(r.finalPosition).toBe(40);
    expect(r.element?.type).toBe("ladder");
  });

  test("landing on a snake start slides to its end", () => {
    const r = resolveRoll(45, 5, testBoard, "overshoot"); // lands on 50
    expect(r.finalPosition).toBe(10);
    expect(r.element?.type).toBe("snake");
  });

  test("overshoot mode clamps to size and wins", () => {
    const r = resolveRoll(98, 5, testBoard, "overshoot");
    expect(r.landing).toBe(100);
    expect(r.won).toBe(true);
  });

  test("exact mode forfeits an overshoot (stays put)", () => {
    const r = resolveRoll(98, 5, testBoard, "exact");
    expect(r.landing).toBe(98);
    expect(r.finalPosition).toBe(98);
    expect(r.won).toBe(false);
  });

  test("exact mode wins only on an exact landing", () => {
    const r = resolveRoll(98, 2, testBoard, "exact");
    expect(r.won).toBe(true);
    expect(r.finalPosition).toBe(100);
  });
});

describe("rollDie", () => {
  test("stays within 1..dieSides", () => {
    for (let i = 0; i < 50; i++) {
      const v = rollDie(6, Math.random);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});
