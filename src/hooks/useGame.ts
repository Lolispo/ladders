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
