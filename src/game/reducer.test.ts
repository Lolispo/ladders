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
    const [p1] = s.players;
    s = gameReducer(s, { type: "FINISH_PLAYER", id: p1.id });
    expect(s.players.find((p) => p.id === p1.id)?.rank).toBe(1);
    expect(s.status).toBe("over"); // only p2 left unfinished
  });

  test("ADVANCE_TURN skips finished players", () => {
    let s = createInitialState(DEFAULT_SETTINGS, rng);
    s = gameReducer(s, { type: "ADD_PLAYER" }); // 3 players
    const [, p2, p3] = s.players;
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
