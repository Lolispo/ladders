# Ladders — Core Fixes + Modern Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Snakes & Ladders game logic and auto-mode, add real player management, and give the app a modern responsive redesign.

**Architecture:** Move all game rules into pure, RNG-injectable functions (`src/game/`), drive UI state through a `useReducer`-backed `useGame` hook that async actions dispatch against (killing the stale-closure bugs), then rebuild the UI on a clean design system. Phase 1 = correctness, Phase 2 = UI.

**Tech Stack:** React 18 + TypeScript (Create React App / react-scripts), Jest + React Testing Library (bundled with react-scripts).

## Global Constraints

- TypeScript `strict` is on (`tsconfig.json`) — no implicit `any`, handle `null`/`undefined`.
- No new runtime dependencies without calling it out; the game logic uses only stdlib + React.
- All randomness goes through an injected `Rng = () => number` (default `Math.random`) so logic is deterministic in tests.
- Ladders always go **up** (`end > start`); snakes always go **down** (`end < start`).
- No snake/ladder endpoint on the first square (1) or the last square (`size`); every endpoint square is unique across all elements.
- Each snake/ladder spans at most **half the board** (`Math.floor(size / 2)`).
- Board default 10×10; start a game with 2 players; soft max 6 players.
- Run a single (non-watch) test with: `CI=true npm test -- <path>`.
- Commit after every green step. Commit messages use Conventional Commits and end with the `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer.

---

## File Structure

**Phase 1 (logic + wiring):**
- Create `src/game/types.ts` — shared game types (replaces `src/models/Player.tsx`).
- Create `src/game/board.ts` — pure board generation + move resolution.
- Create `src/game/board.test.ts` — unit tests for board.ts.
- Create `src/game/reducer.ts` — pure game reducer + action types + initial-state factory.
- Create `src/game/reducer.test.ts` — unit tests for the reducer.
- Create `src/hooks/useGame.ts` — the hook: wraps reducer, async roll animation, auto-mode.
- Modify `src/App.tsx` — consume `useGame`, wire controls (thin).
- Modify `src/components/Grid.tsx` — snakes vs ladders rendering, dynamic dimensions.
- Delete `src/models/Player.tsx` after imports are migrated.

**Phase 2 (UI):**
- Create `src/styles/tokens.css`, `src/styles/app.css` — design system + layout (replaces `src/styles.css`).
- Create `src/components/SetupPanel.tsx`, `src/components/Scoreboard.tsx`, `src/components/MoveLog.tsx`, `src/components/Dice.tsx`, `src/components/TurnIndicator.tsx`.
- Modify `src/App.tsx`, `src/components/Grid.tsx` for the new layout.

---

## PHASE 1 — CORRECTNESS

### Task 1: Install deps + game types + failing board test scaffold

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/board.test.ts`

**Interfaces:**
- Produces: all types below; `generateBoard(settings, rng?)`, `resolveRoll(position, roll, board, winCondition)` (implemented in Task 2).

- [ ] **Step 1: Install dependencies**

Run: `npm install`
Expected: `node_modules/` populated, no fatal errors (deprecation warnings are fine).

- [ ] **Step 2: Create the types file**

Create `src/game/types.ts`:

```ts
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
```

- [ ] **Step 3: Write failing tests for board generation**

Create `src/game/board.test.ts`:

```ts
import { generateBoard } from "./board";
import { Rng, Settings } from "./types";

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
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `CI=true npm test -- src/game/board.test.ts`
Expected: FAIL — `Cannot find module './board'`.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/board.test.ts package-lock.json
git commit -m "test: add game types and failing board generation tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Board generation + move resolution (pure)

**Files:**
- Create: `src/game/board.ts`
- Test: `src/game/board.test.ts` (extend with move-resolution tests)

**Interfaces:**
- Consumes: types from `src/game/types.ts`.
- Produces:
  - `generateBoard(settings: Settings, rng?: Rng): Board`
  - `rollDie(dieSides: number, rng?: Rng): number` — integer in `[1, dieSides]`
  - `resolveRoll(position: number, roll: number, board: Board, winCondition: WinCondition): RollResult`
  - `interface RollResult { forfeited: boolean; landing: number; finalPosition: number; element?: BoardElement; won: boolean; }`

- [ ] **Step 1: Implement `board.ts`**

Create `src/game/board.ts`:

```ts
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
```

> Note: `forfeited` is reserved for a future "wasted turn" UI cue; it is always
> `false` today because an exact-mode overshoot simply keeps `position`. Keeping
> the field avoids a signature change later.

- [ ] **Step 2: Run board-generation tests to verify they pass**

Run: `CI=true npm test -- src/game/board.test.ts`
Expected: PASS (all generation tests green).

- [ ] **Step 3: Add move-resolution tests**

Append to `src/game/board.test.ts`:

```ts
import { resolveRoll, rollDie } from "./board";
import { Board } from "./types";

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
```

- [ ] **Step 4: Run all board tests to verify they pass**

Run: `CI=true npm test -- src/game/board.test.ts`
Expected: PASS (generation + resolution).

- [ ] **Step 5: Commit**

```bash
git add src/game/board.ts src/game/board.test.ts
git commit -m "feat: pure snakes-and-ladders board generation and move resolution

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Game reducer (pure state transitions)

**Files:**
- Create: `src/game/reducer.ts`
- Test: `src/game/reducer.test.ts`

**Interfaces:**
- Consumes: `board.ts`, `types.ts`.
- Produces:
  - `interface GameState { players: Player[]; currentTurnId: number | null; board: Board; settings: Settings; dice: { value: number | null; rolling: boolean }; auto: boolean; animating: boolean; status: "playing" | "over"; nextPlayerId: number; }`
  - `type Action =` (union below)
  - `function createInitialState(settings: Settings, rng?: Rng): GameState`
  - `function gameReducer(state: GameState, action: Action): GameState`
  - `function nextActiveTurnId(players: Player[], currentId: number | null): number | null`

- [ ] **Step 1: Write failing reducer tests**

Create `src/game/reducer.test.ts`:

```ts
import { createInitialState, gameReducer } from "./reducer";
import { DEFAULT_SETTINGS } from "./types";

const rng = () => 0.42; // fixed so board generation is deterministic

describe("createInitialState", () => {
  test("starts a game with 2 players on square 1", () => {
    const s = createInitialState(DEFAULT_SETTINGS, rng);
    expect(s.players).toHaveLength(2);
    expect(s.players.every((p) => p.position === 1)).toBe(true);
    expect(s.currentTurnId).toBe(s.players[0].id);
    expect(s.status).toBe("playing");
  });

  test("player ids are unique", () => {
    const s = createInitialState(DEFAULT_SETTINGS, rng);
    const ids = s.players.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("gameReducer", () => {
  test("ADD_PLAYER appends a player with a fresh id up to the max", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    s = gameReducer(s, { type: "ADD_PLAYER" });
    expect(s.players).toHaveLength(3);
    expect(new Set(s.players.map((p) => p.id)).size).toBe(3);
  });

  test("ADD_PLAYER is capped at MAX_PLAYERS (6)", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    for (let i = 0; i < 10; i++) s = gameReducer(s, { type: "ADD_PLAYER" });
    expect(s.players).toHaveLength(6);
  });

  test("REMOVE_PLAYER cannot drop below MIN_PLAYERS (2)", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    s = gameReducer(s, { type: "REMOVE_PLAYER", id: s.players[0].id });
    expect(s.players).toHaveLength(2); // refused
  });

  test("REMOVE_PLAYER removes when above the minimum", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    s = gameReducer(s, { type: "ADD_PLAYER" });
    const victim = s.players[2].id;
    s = gameReducer(s, { type: "REMOVE_PLAYER", id: victim });
    expect(s.players.map((p) => p.id)).not.toContain(victim);
  });

  test("FINISH_PLAYER assigns an increasing rank and ends the game at one survivor", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    const [p1, p2] = s.players;
    s = gameReducer(s, { type: "FINISH_PLAYER", id: p1.id });
    expect(s.players.find((p) => p.id === p1.id)?.rank).toBe(1);
    expect(s.status).toBe("over"); // only p2 left unfinished
  });

  test("ADVANCE_TURN skips finished players", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    s = gameReducer(s, { type: "ADD_PLAYER" }); // 3 players
    const [p1, p2, p3] = s.players;
    // mark p2 finished, current turn is p1 -> should skip to p3
    s = { ...s, players: s.players.map((p) => (p.id === p2.id ? { ...p, finished: true, rank: 1 } : p)) };
    s = gameReducer(s, { type: "ADVANCE_TURN" });
    expect(s.currentTurnId).toBe(p3.id);
  });

  test("RESET regenerates board and returns to 2 players", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    s = gameReducer(s, { type: "ADD_PLAYER" });
    s = gameReducer(s, { type: "RESET", rng });
    expect(s.players).toHaveLength(2);
    expect(s.status).toBe("playing");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `CI=true npm test -- src/game/reducer.test.ts`
Expected: FAIL — `Cannot find module './reducer'`.

- [ ] **Step 3: Implement `reducer.ts`**

Create `src/game/reducer.ts`:

```ts
import { generateBoard } from "./board";
import {
  Board, ElementType, MAX_PLAYERS, MIN_PLAYERS, Move, Player,
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `CI=true npm test -- src/game/reducer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/reducer.ts src/game/reducer.test.ts
git commit -m "feat: pure game reducer with turns, ranking, player caps

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `useGame` hook (async roll animation + auto-mode)

**Files:**
- Create: `src/hooks/useGame.ts`

**Interfaces:**
- Consumes: `reducer.ts`, `board.ts`, `types.ts`.
- Produces: `useGame(): { state: GameState; rollDice: () => Promise<void>; addPlayer: () => void; removePlayer: (id: number) => void; reset: () => void; toggleAuto: () => void; updateSettings: (s: Partial<Settings>) => void; }`

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useGame.ts`:

```ts
import { useCallback, useEffect, useReducer, useRef } from "react";
import { rollDie, resolveRoll } from "../game/board";
import { createInitialState, gameReducer, GameState } from "../game/reducer";
import { DEFAULT_SETTINGS, Move, Settings } from "../game/types";

const STEP_MS = 150;   // per-square hop
const ROLL_SPIN_MS = 400;
const ROLL_REVEAL_MS = 500;
const ELEMENT_PAUSE_MS = 350;
const AUTO_GAP_MS = 700;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, DEFAULT_SETTINGS, (s) =>
    createInitialState(s)
  );

  // Always-fresh snapshot for async/auto loops (avoids stale closures).
  const stateRef = useRef<GameState>(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const rollDice = useCallback(async () => {
    const s = stateRef.current;
    if (s.animating || s.status === "over" || s.currentTurnId === null) return;
    const player = s.players.find((p) => p.id === s.currentTurnId);
    if (!player || player.finished) return;

    const { board, settings } = s;
    const id = player.id;
    const from = player.position;

    dispatch({ type: "SET_ANIMATING", animating: true });
    dispatch({ type: "SET_ROLLING", rolling: true });
    await delay(ROLL_SPIN_MS);

    const roll = rollDie(settings.dieSides);
    dispatch({ type: "SET_DICE", value: roll });
    await delay(ROLL_REVEAL_MS);

    const result = resolveRoll(from, roll, board, settings.winCondition);

    // Hop one square at a time to the dice landing square.
    for (let pos = from + 1; pos <= result.landing; pos++) {
      dispatch({ type: "SET_POSITION", id, position: pos });
      await delay(STEP_MS);
    }

    const diceMove: Move = {
      moveNumber: player.diceRolls + 1,
      from,
      to: result.landing,
      dice: roll,
    };
    dispatch({ type: "RECORD_MOVE", id, move: diceMove });

    // Snake or ladder traversal.
    if (result.element) {
      await delay(ELEMENT_PAUSE_MS);
      dispatch({ type: "SET_POSITION", id, position: result.finalPosition });
      dispatch({
        type: "RECORD_MOVE",
        id,
        move: {
          moveNumber: player.diceRolls + 1,
          from: result.landing,
          to: result.finalPosition,
          elementType: result.element.type,
        },
      });
    }

    if (result.won) {
      dispatch({ type: "FINISH_PLAYER", id });
    }

    dispatch({ type: "ADVANCE_TURN" });
    dispatch({ type: "SET_ANIMATING", animating: false });
  }, []);

  // Keep a ref to the latest rollDice for the auto-mode loop.
  const rollDiceRef = useRef(rollDice);
  useEffect(() => {
    rollDiceRef.current = rollDice;
  });

  // Auto-mode: schedule the next roll only after the current one settles.
  useEffect(() => {
    if (!state.auto) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled) return;
      const s = stateRef.current;
      if (s.status === "over") return; // stop at game end
      if (!s.animating) await rollDiceRef.current();
      if (!cancelled) timer = setTimeout(tick, AUTO_GAP_MS);
    };
    timer = setTimeout(tick, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.auto]);

  const addPlayer = useCallback(() => dispatch({ type: "ADD_PLAYER" }), []);
  const removePlayer = useCallback((id: number) => dispatch({ type: "REMOVE_PLAYER", id }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const toggleAuto = useCallback(
    () => dispatch({ type: "SET_AUTO", auto: !stateRef.current.auto }),
    []
  );
  const updateSettings = useCallback((s: Partial<Settings>) => dispatch({ type: "SET_SETTINGS", settings: s }), []);

  return { state, rollDice, addPlayer, removePlayer, reset, toggleAuto, updateSettings };
}
```

- [ ] **Step 2: Typecheck the hook**

Run: `npx tsc --noEmit`
Expected: no errors (existing `src/App.tsx`/`Grid.tsx` still compile against old models for now).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGame.ts
git commit -m "feat: useGame hook with fresh-state roll animation and auto-mode

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wire `App.tsx` + `Grid.tsx` to the new engine

**Files:**
- Modify: `src/App.tsx` (replace body)
- Modify: `src/components/Grid.tsx`
- Delete: `src/models/Player.tsx` (after migration)
- Remove: `src/models/Constants.tsx` usage (dimensions now come from `board`)

**Interfaces:**
- Consumes: `useGame`, `Board`, `Player`, `BoardElement` from `src/game/*`.

- [ ] **Step 1: Rewrite `Grid.tsx` to take board + players and render snakes/ladders distinctly**

Replace `src/components/Grid.tsx` with:

```tsx
// components/Grid.tsx
import React from "react";
import { Board, Player } from "../game/types";

interface GridProps {
  board: Board;
  players: Player[];
}

const elementAt = (board: Board, position: number) => {
  const start = board.elements.find((e) => e.start === position);
  if (start) return { role: "start" as const, el: start };
  const end = board.elements.find((e) => e.end === position);
  if (end) return { role: "end" as const, el: end };
  return null;
};

const symbolFor = (board: Board, position: number): { symbol: string; className: string } => {
  const hit = elementAt(board, position);
  if (!hit) return { symbol: "", className: "" };
  const { role, el } = hit;
  if (el.type === "ladder") {
    return role === "start"
      ? { symbol: "🪜↗", className: "cell-ladder-start" }
      : { symbol: "⤴", className: "cell-ladder-end" };
  }
  return role === "start"
    ? { symbol: "🐍↘", className: "cell-snake-start" }
    : { symbol: "⤵", className: "cell-snake-end" };
};

const Grid: React.FC<GridProps> = ({ board, players }) => {
  const { rows, cols, size } = board;

  const rowEls = Array.from({ length: rows }, (_, row) => (
    <div key={row} className="row">
      {Array.from({ length: cols }, (_, col) => {
        const adjustedRow = rows - 1 - row; // bottom row is squares 1..cols
        const position =
          adjustedRow % 2 === 0
            ? adjustedRow * cols + col + 1
            : adjustedRow * cols + (cols - 1 - col) + 1;
        const { symbol, className } = symbolFor(board, position);
        const here = players.filter((p) => p.position === position);
        return (
          <div key={col} className={`cell ${className}`} id={`platform-${position}`}>
            <span className="cell-label">
              {position} {symbol}
            </span>
            {here.map((p) => (
              <div key={p.id} className="player-icon" style={{ backgroundColor: p.color }} title={p.name}>
                🧑
              </div>
            ))}
          </div>
        );
      })}
    </div>
  ));

  return (
    <div
      className="grid"
      style={{ ["--grid-rows" as any]: rows, ["--grid-columns" as any]: cols }}
    >
      {rowEls}
      <span hidden data-size={size} />
    </div>
  );
};

export default Grid;
```

- [ ] **Step 2: Rewrite `App.tsx` to consume `useGame` (functional wiring; visual polish comes in Phase 2)**

Replace `src/App.tsx` with:

```tsx
// App.tsx
import React, { useEffect } from "react";
import Grid from "./components/Grid";
import { useGame } from "./hooks/useGame";
import { MAX_PLAYERS } from "./game/types";
import "./styles.css";

const App: React.FC = () => {
  const { state, rollDice, addPlayer, removePlayer, reset, toggleAuto } = useGame();
  const { players, board, currentTurnId, dice, auto, status } = state;
  const current = players.find((p) => p.id === currentTurnId);

  useEffect(() => {
    document.title = "Snakes & Ladders";
  }, []);

  return (
    <div className="grid-container">
      <h1>Snakes &amp; Ladders</h1>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Grid board={board} players={players} />

        <div>
          <div>
            {status === "over"
              ? "Game over"
              : current
              ? `Turn: ${current.name}`
              : ""}
          </div>
          <button onClick={rollDice} disabled={state.animating || status === "over"}>
            Roll Dice
          </button>
          <button onClick={toggleAuto}>{auto ? "Turn OFF Auto" : "Turn ON Auto"}</button>
          <button onClick={addPlayer} disabled={players.length >= MAX_PLAYERS}>
            Add Player
          </button>
          <button onClick={reset}>Reset</button>

          <div className={`dice-display ${dice.rolling ? "rolling" : ""}`} style={{ fontSize: 52 }}>
            {dice.value ?? "-"}
          </div>

          <div className="scoreboard">
            <h2>Players</h2>
            {players.map((p) => (
              <div key={p.id} style={{ color: p.color }}>
                {p.name} — pos {p.position}, rolls {p.diceRolls}
                {p.rank ? ` (#${p.rank})` : ""}
                {players.length > 2 && !p.finished && (
                  <button onClick={() => removePlayer(p.id)} style={{ marginLeft: 8 }}>
                    remove
                  </button>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {p.moveHistory.map((m, i) => (
                    <div className="moveList" key={i}>
                      {`${m.moveNumber}: ${m.from} -> ${m.to} ${
                        m.dice ? `🎲${m.dice}` : ""
                      }${m.elementType ? ` ${m.elementType}` : ""}`}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {board.elements.map((el, i) => (
            <div key={i}>{`${el.type}: ${el.start} -> ${el.end}`}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
```

- [ ] **Step 3: Delete the obsolete models file and confirm no imports remain**

Run: `grep -rn "models/Player\|models/Constants" src ; echo done`
Expected: `done` with no matches. Then:
Run: `git rm src/models/Player.tsx src/models/Constants.tsx`

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit && CI=true npm run build`
Expected: compiles; build succeeds (warnings OK).

- [ ] **Step 5: Manual smoke test in the browser**

Run: `npm start` (opens http://localhost:3000)
Verify: two players; clicking **Roll Dice** advances only the current player then passes the turn; **Add Player** adds up to 6; ladders climb up, snakes slide down; the move log shows the correct `from` square; a player reaching 100 gets a rank and the game ends when one remains. Stop the server (Ctrl-C) when done.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire game engine into App and Grid, drop legacy models

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Auto-mode verification pass

**Files:** none (verification + any fix that surfaces).

- [ ] **Step 1: Run the app and exercise auto-mode**

Run: `npm start`
Verify:
- Toggle **Auto ON**: turns advance automatically, one player per tick, positions and `from` values in the log are correct (this is the original TODO bug — confirm it's gone).
- Toggle **Auto OFF** mid-game: rolling stops immediately; no further moves.
- Let auto-mode run to completion: it **stops** when the game is over (one player left), no runaway timers (check the console for repeated logs — there should be none).
- Toggle auto on/off several times rapidly: no double-rolling, no stuck `animating` state.

- [ ] **Step 2: If any issue is found, fix it in `useGame.ts` and re-verify**

(Only if needed.) Likely touch points: the `state.auto` effect dependency, the `stateRef`/`rollDiceRef` guards, or the `animating` gate. Re-run Step 1.

- [ ] **Step 3: Commit (only if a fix was made)**

```bash
git add src/hooks/useGame.ts
git commit -m "fix: auto-mode edge cases (start/stop, no double-roll)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## PHASE 2 — UI OVERHAUL (full modern redesign)

> Aesthetic specifics (exact palette, type scale, motion) are produced by the
> `design-consultation` / `frontend-design` skills at the start of this phase and
> captured in `DESIGN.md`. The tasks below lock in structure, responsiveness, and
> the component split; apply the design system's tokens as they are decided.

### Task 7: Design tokens + responsive shell (kills dead CSS + "too tall")

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Modify: `src/App.tsx` (swap stylesheet imports + class-based layout)
- Delete: `src/styles.css`

- [ ] **Step 1: Generate the design system**

Invoke the `design-consultation` skill for this app (playful-but-modern board game) to produce `DESIGN.md` with palette, typography, spacing, and motion tokens. Translate its tokens into `src/styles/tokens.css` as CSS custom properties (colors, `--space-*`, `--radius-*`, font families, dark-mode via `@media (prefers-color-scheme: dark)` and `:root[data-theme]`).

- [ ] **Step 2: Write `app.css` with a responsive, auto-scaling board**

Create `src/styles/app.css`. The board must never overflow the viewport regardless of `rows`/`cols`. Use a viewport-relative cell size driven by the CSS vars the Grid already sets (`--grid-rows`, `--grid-columns`):

```css
.grid {
  --cell-size: min(
    calc((92vw - (var(--grid-columns) - 1) * var(--grid-gap)) / var(--grid-columns)),
    calc((78vh - (var(--grid-rows) - 1) * var(--grid-gap)) / var(--grid-rows)),
    64px
  );
  display: grid;
  grid-template-rows: repeat(var(--grid-rows), var(--cell-size));
  grid-template-columns: repeat(var(--grid-columns), var(--cell-size));
  gap: var(--grid-gap);
}
```

Replace the two-column `display:flex` inline layout in `App.tsx` with a class-based responsive layout (board + side panel; panel wraps below the board on narrow screens via `flex-wrap`/grid + a media query). Remove Comic Sans; use the token font.

- [ ] **Step 3: Swap imports and delete old stylesheet**

In `App.tsx` replace `import "./styles.css";` with `import "./styles/tokens.css"; import "./styles/app.css";`. Then:
Run: `git rm src/styles.css`
Run: `grep -rn "app-container\|left-container\|right-container\|Comic Sans" src ; echo done`
Expected: `done` with no matches (dead CSS gone).

- [ ] **Step 4: Verify responsiveness in the browser**

Run: `npm start`
Verify: board fits without vertical scroll at default 10×10; try a large board via reset after changing dimensions (Task 9) — still fits; resize the window narrow — the panel reflows below the board. Take before/after screenshots.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): design tokens and responsive auto-scaling board layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Board visual polish (snakes vs ladders)

**Files:**
- Modify: `src/components/Grid.tsx`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Style ladder/snake cells distinctly**

Using the design tokens, style `.cell-ladder-start` / `.cell-ladder-end` (green family, up-arrow motif) and `.cell-snake-start` / `.cell-snake-end` (red/amber family, down motif) so a player can read the board at a glance. Style `.player-icon` as a crisp token, and highlight the current player's token (e.g. a ring). Add a subtle "current turn" pulse using a token-defined animation.

- [ ] **Step 2: Verify**

Run: `npm start` — confirm ladders read as "up/good", snakes as "down/bad", start vs end are visually paired, and the active player's token stands out. Screenshot.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): distinct snake vs ladder board styling and active-player token

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Setup panel + component split (settings surfaced)

**Files:**
- Create: `src/components/SetupPanel.tsx`, `src/components/TurnIndicator.tsx`
- Modify: `src/App.tsx`, `src/hooks/useGame.ts` (already exposes `updateSettings`)

**Interfaces:**
- `SetupPanel` props: `{ settings: Settings; players: Player[]; canAdd: boolean; onAdd(): void; onRemove(id): void; onSettings(s: Partial<Settings>): void; onReset(): void; disabled: boolean; }`
- `TurnIndicator` props: `{ current: Player | undefined; status: "playing" | "over"; players: Player[]; }`

- [ ] **Step 1: Build `SetupPanel`**

Create `src/components/SetupPanel.tsx` with controls bound to `updateSettings`/`reset`:
- Win condition: segmented toggle `overshoot | exact` → `onSettings({ winCondition })`.
- Board size: rows and cols number inputs (clamp 3–14) → `onSettings({ rows })` / `{ cols }` (triggers a fresh board via the reducer's dims-changed path).
- Die sides: select (4, 6, 8, 10, 12, 20; default 6) → `onSettings({ dieSides })`.
- Players: list with per-player remove (respecting min 2), an **Add Player** button (disabled when `!canAdd`), and **Reset**.
Disable size/win/die controls while `disabled` (i.e. `animating`) to avoid mid-move changes.

- [ ] **Step 2: Build `TurnIndicator`**

Create `src/components/TurnIndicator.tsx`: shows whose turn it is, or, when `status === "over"`, the final ranking (players sorted by `rank`).

- [ ] **Step 3: Compose them into `App.tsx`**

Replace the ad-hoc buttons/scoreboard blocks in `App.tsx` with `<TurnIndicator />`, `<SetupPanel />`, and (Task 10) `<Scoreboard />` / `<MoveLog />` / `<Dice />`, laid out with the Task 7 classes.

- [ ] **Step 4: Verify**

Run: `npm start` — change win condition (exact-roll: overshoot near 100 forfeits), change die sides (rolls respect the new max), change board size (new board generates and still fits), add/remove players within 2–6. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): setup panel with settings and turn indicator

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Scoreboard, move log, dice components

**Files:**
- Create: `src/components/Scoreboard.tsx`, `src/components/MoveLog.tsx`, `src/components/Dice.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`

- [ ] **Step 1: Extract and restyle**

- `Dice`: props `{ value: number | null; rolling: boolean }` — restyle the roll animation with token motion.
- `Scoreboard`: props `{ players: Player[] }` — compact per-player rows (color chip, name, position, dice count, rank badge if finished).
- `MoveLog`: props `{ players: Player[] }` — the current player's recent moves, with dice emoji and snake/ladder markers, monospaced and aligned.

Move the corresponding JSX out of `App.tsx` into these components; `App.tsx` should end up thin (composition + layout only).

- [ ] **Step 2: Verify**

Run: `npm start` — dice animation reads well; scoreboard is scannable; move log is aligned and correct. Screenshot before/after.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): scoreboard, move log, and dice components

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Final QA + docs

**Files:**
- Modify: `README.md`, `TODO.md`

- [ ] **Step 1: Full test + build**

Run: `CI=true npm test -- --watchAll=false && npx tsc --noEmit && CI=true npm run build`
Expected: all tests pass, no type errors, build succeeds.

- [ ] **Step 2: QA pass**

Use the `/qa` (gstack) skill or a manual pass covering: turn-by-turn play, auto-mode start/stop/completion, add/remove players (2–6 bounds), both win conditions, several board sizes and die sizes, responsive layout narrow/wide, light/dark. Fix any bug found (root-cause, then re-verify) and commit atomically.

- [ ] **Step 3: Update docs**

Update `README.md` (what the game is, how to run, features) and clear the fixed items from `TODO.md` (the three original bugs/features are now done).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: update README and TODO after core fixes and redesign

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** board generation bugs (Task 2), snakes/ladders semantics (Tasks 2, 8), near-finish clamp (Task 2), correct `from` in log (Tasks 4, 5), stale-closure/auto-mode (Tasks 4, 6), add/remove players + missing button + id collisions + drop auto-spawn (Tasks 3, 5, 9), win-condition modes (Tasks 2, 9), board-size + die-sides settings (Tasks 3, 9), density scaling (Task 2), full UI redesign + dead-CSS removal + "too tall" (Tasks 7–10), testing (Tasks 1–3). All spec sections map to a task.
- **Type consistency:** `GameState`, `Action`, `RollResult`, `Board`, `Player`, `Settings`, `Move` names/signatures are consistent between `board.ts`, `reducer.ts`, `useGame.ts`, and components.
- **No placeholders:** all logic/test steps carry complete code; Phase 2 aesthetic detail is explicitly delegated to the design skills (structural code is complete).
