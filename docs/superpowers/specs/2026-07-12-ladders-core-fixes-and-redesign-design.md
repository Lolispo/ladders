# Ladders — Core Fixes + Modern Redesign

**Date:** 2026-07-12
**Status:** Approved design, pending spec review

## Problem

The Ladders app (a Snakes & Ladders game) has accumulated real defects that make
gameplay feel broken, is missing a way to add players manually, has a buggy
automatic mode, and has an unpolished UI built on dead/ad-hoc CSS. The work is
sequenced **bugs first, then UI**.

Root cause behind most gameplay bugs: `src/App.tsx` is a ~255-line component
where game state lives in scattered `useState` hooks and async move-loops read
**stale closures**. The automatic-mode bug, the "wrong from position" log entry,
and general fragility all trace back to this.

## Goals

- Fix the game logic so ladders/snakes behave correctly and predictably.
- Add explicit, always-available player management (the "missing button").
- Rebuild automatic mode so it reads fresh state and starts/stops cleanly.
- Full modern UI redesign (drop Comic Sans, responsive auto-scaling board).
- Make win condition and board size configurable.

## Non-goals

- Networked/multiplayer-over-internet play.
- Persistence/save games across reloads.
- Sound effects.

---

## Phase 1 — Correctness

### A. `useGame` hook (foundation)

Extract all game logic from `App.tsx` into a `useGame` custom hook backed by
`useReducer`. This is the keystone change: async actions dispatch against
always-fresh reducer state (and refs where needed for the animation loop)
instead of captured closures.

The hook owns: `players`, `currentTurn` (whose turn it is), `board` (snakes +
ladders), `dice` display state, `mode` (manual/auto), and `settings` (win
condition, board dimensions, die sides). It exposes:

- `rollDice()` — roll + animate for the **current player only**, then advance
  the turn to the next active (unfinished) player.
- `addPlayer()` / `removePlayer(id)`
- `reset()` — regenerate board, reset players.
- `toggleAuto()`
- `updateSettings(partial)`

**Turn model (turn-by-turn):** state tracks the current player. Each
`rollDice()` advances only that player, then hands the turn to the next
unfinished player (wrapping around, skipping finished players). Auto-mode
advances one turn per tick. The UI shows whose turn it is.

Animated stepping (moving one square at a time with a delay) is preserved, but
all state reads go through the reducer/refs so there is no stale data.

**What this fixes:** the entire stale-closure class of bugs, including the
auto-mode failure and the wrong `from` position in the log.

### B. Board generation — snakes & ladders, no overlaps

Replace the current generator (which calls `getNewValidLadderPosition(..., true)`
for both start and end, so ends are only de-duplicated against *starts*).

Rules for the new generator (pure function, RNG injectable for testing):

- **Ladders always go up** (`end > start`); **snakes always go down**
  (`end < start`). Distinct types, not a single bidirectional "ladder".
- **Every endpoint square is unique** across all snakes and ladders — no square
  is used by more than one snake/ladder, and no chaining (a start can't be
  another element's end). Eliminates the overlap/chain bugs.
- **Distance cap:** each snake/ladder spans at most **half the board** (TODO:
  "Ladder max gain/loss half the map").
- Never place a start or end on the first square or the last square.
- **Moderate density that scales with board area:** target ~8 ladders + ~8
  snakes on a 10×10 board, scaling proportionally with cell count for other
  sizes. Small boards degrade gracefully (place as many as fit).

### C. Move + trigger fixes

- Clamp the target used for snake/ladder lookup to the last square so an
  element near the finish still triggers (currently `position + roll` can
  exceed the board and silently miss).
- Record the correct `from` position in move history (fixes the TODO bug).
- Stop mutating state arrays in place (the ladder move currently does
  `player.moveHistory.push(...)` on existing state).

### D. Automatic mode rebuild

A loop that:
- Reads fresh state each tick (via reducer/ref, not closure).
- Waits for the current round's animation to finish before scheduling the next.
- Starts/stops cleanly on toggle and on unmount.
- Halts appropriately (e.g. when no active players remain).

### E. Player management

- **Start a fresh game with 2 players**; soft **max of 6** (Add Player disabled
  at the cap, to keep the board readable).
- **Always-available "Add Player" button** (the missing control) + a **Remove**
  control per player.
- Fix id/name collisions: currently `id`/`name` use `prevPlayers.length + 1`,
  which reuses ids as players finish. Use a monotonic counter.
- **Drop** the auto-spawn-on-finish behavior now that adding is explicit.

### F. Turn flow & game end

- A player who reaches the last square is marked `finished` with a **finish
  rank** (1st, 2nd, … by order of finishing) and is skipped in the turn
  rotation.
- Remaining players keep taking turns for placement. The game is **over** when
  fewer than two unfinished players remain; the UI announces the winner /
  final ranking and offers Reset.

### G. Win condition (configurable)

Setting with two modes:
- **Overshoot wins (default):** landing on or past the last square wins (clamps).
- **Exact roll required:** a roll that would overshoot forfeits that move
  (player stays put) until an exact roll lands on the last square.

---

## Phase 2 — UI overhaul (full modern redesign)

- New design system: real typography (drop Comic Sans), cohesive palette,
  consistent spacing, light/dark aware. Run through the
  design-consultation / frontend-design skills so it reads intentional.
- **Responsive, auto-scaling board** using viewport-relative sizing so it never
  overflows regardless of dimensions (fixes "too tall").
- Polished cells with clear, distinct snake vs ladder visualization; refined
  dice animation; redesigned scoreboard + move-log; a proper controls/setup
  panel (add/remove players, win-condition toggle, board dimensions, die sides,
  turn indicator, reset).
- Remove all dead CSS (`.app-container`/`.left-container`/`.right-container` are
  unused) and inline-style layout.

## Configurable settings (surfaced in setup panel)

- Win condition: overshoot-wins | exact-roll.
- Board dimensions: rows × columns (default 10 × 10). Snake/ladder counts scale
  with area.
- Die sides: configurable, default 6 (d6).

---

## Architecture / file layout

- `src/hooks/useGame.ts` — reducer + actions (new).
- `src/game/board.ts` — pure board generation + move resolution (new, testable).
- `src/game/types.ts` — shared types (moved/expanded from `models/Player.tsx`).
- `src/App.tsx` — thin composition + layout, consumes `useGame`.
- `src/components/` — `Grid`, `Controls`/`SetupPanel`, `Scoreboard`, `Dice`,
  `MoveLog` (split out during Phase 2; Phase 1 may keep some inline).
- `src/styles/` — design-system CSS (Phase 2).

Exact component split finalized during implementation; boundaries chosen so each
piece has one clear purpose and can be reasoned about independently.

## Testing

- Pure logic (`src/game/board.ts`) gets unit tests with **injected RNG**:
  generation invariants (ladders up, snakes down, unique endpoints, distance
  cap, no endpoints on first/last square), move resolution, snake/ladder
  triggering incl. near-finish clamp, and both win-condition modes.
- UI verified in-browser (build + manual/QA pass) during Phase 2.

## Risks / edge cases

- Small boards may not fit the requested snake/ladder counts — generator must
  degrade gracefully (place as many as fit, no infinite loop).
- Auto-mode + rapid manual clicks must not double-run a round.
- Exact-roll mode must not deadlock (always eventually winnable — it is, since
  rolls 1–6 cover every remaining distance).
