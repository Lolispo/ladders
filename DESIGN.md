# Design System — "Game Night"

A modern take on Snakes & Ladders. The feeling is a premium board game on an
evening game table: a dark jewel-toned surface, luminous porcelain cells, and a
clear up/down semantic language. Deliberately avoids the common AI-design
defaults (cream + serif + terracotta; acid accent on near-black; broadsheet
hairlines).

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| `--table-top` | `#171334` | Page background (top of gradient) — deep indigo |
| `--table-bot` | `#241a45` | Page background (bottom) — plum |
| `--felt` | `#2a2350` | Side-panel surface |
| `--felt-edge` | `#3b3470` | Panel borders / dividers |
| `--cell` | `#fdfcf9` | Board cell base — warm porcelain (near-white, not cream) |
| `--cell-alt` | `#eef0fb` | Alternating checker tint |
| `--ink` | `#221d3d` | Text on light cells |
| `--ink-soft` | `#6f6a90` | Secondary text |
| `--paper` | `#f4f5fb` | Text on the dark table |
| `--ladder` | `#1f9d63` | Ladders (climb / up / good) |
| `--ladder-tint` | `#d3efe0` | Ladder cell fill |
| `--snake` | `#ef6a43` | Snakes (slide / down) |
| `--snake-tint` | `#fbdccf` | Snake cell fill |
| `--gold` | `#f2c14e` | Dice, winner, celebratory accent |

Player seat colors (jewel tones): `#e6194b`, `#3cb44b`, `#4363d8`, `#f58231`,
`#911eb4`, `#17a2b8`.

## Typography

- **Display — Fredoka** (500/600/700): title, headings, dice, big numerals.
  Rounded and friendly but geometric and modern — the intentional anti-Comic-Sans.
- **Body / UI — Nunito** (400/600/700/800): controls, labels, scoreboard.
- **Mono — system `ui-monospace`**: the move log, so `from → to` columns align.

## Layout

Board is the hero, left/center. A single glass control panel sits to its right
holding the turn indicator, dice, primary actions, setup, and scoreboard/log.
Below the board on narrow screens the panel reflows underneath. The board
auto-scales to the viewport (never overflows) regardless of dimensions.

## Signature elements

1. **Player pucks** — glossy chips in seat colors; the player whose turn it is
   gets a glowing ring and a soft pulse.
2. **Pipped die** — a real die face with pips for values 1–6 (falls back to a
   numeral for larger dice), rather than a bare digit.
3. **Directional cell badges** — a ladder/snake start cell shows a small badge
   with its destination square (e.g. `↗ 40`), so the board encodes the jumps.

## Motion

Restrained: dice tumble on roll, token hop between squares, turn-ring pulse.
All disabled under `prefers-reduced-motion`.
