# Snakes & Ladders

A modern, single-page Snakes & Ladders game built with React + TypeScript.
Climb the ladders, dodge the snakes, race to the last square.

**Play:** https://ladders.petterbuilds.com/

## Features

- **Turn-by-turn play** for 2–6 players; each roll advances the current player,
  then passes the turn. Finish order is ranked (🥇🥈🥉).
- **Classic rules** — ladders always go up, snakes always go down, with no
  overlapping or chained endpoints and a distance cap of half the board.
- **Automatic mode** — sit back and watch the game play itself; stops cleanly
  when the game is over.
- **Configurable setup** — board size (rows × cols), dice (d4–d20), and finish
  rule (overshoot wins, or exact roll required).
- **Responsive board** that auto-scales to the viewport and reflows on mobile.

## Develop

```bash
npm install
npm start        # dev server at http://localhost:3000
npm test         # unit tests (game logic)
npm run build    # production build
```

Deploys are automatic: pushing to `main` runs `.github/workflows/deploy.yml`, which
calls the shared platform workflow in `Lolispo/ci` to build and publish to
https://ladders.petterbuilds.com/. There is no manual deploy step.

## Architecture

- `src/game/` — pure, RNG-injectable game logic (fully unit-tested):
  - `board.ts` — board generation + move resolution
  - `reducer.ts` — game state transitions (turns, ranking, player caps)
  - `types.ts` — shared types and constants
- `src/hooks/useGame.ts` — wraps the reducer, drives roll animation and auto-mode
  from always-fresh state (no stale closures).
- `src/components/` — `Grid`, `Dice`, `TurnIndicator`, `Scoreboard`, `MoveLog`,
  `SetupPanel`.
- `src/styles/` — design system (`tokens.css`) + layout (`app.css`). See
  `DESIGN.md` for the visual system.
