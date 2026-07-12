// App.tsx
import React, { useEffect } from "react";
import Grid from "./components/Grid";
import Dice from "./components/Dice";
import TurnIndicator from "./components/TurnIndicator";
import SetupPanel from "./components/SetupPanel";
import Scoreboard from "./components/Scoreboard";
import MoveLog from "./components/MoveLog";
import { useGame } from "./hooks/useGame";
import { MAX_PLAYERS } from "./game/types";
import "./styles/tokens.css";
import "./styles/app.css";

const App: React.FC = () => {
  const { state, rollDice, addPlayer, removePlayer, reset, toggleAuto, updateSettings } = useGame();
  const { players, board, currentTurnId, dice, auto, status, animating, settings } = state;
  const current = players.find((p) => p.id === currentTurnId);

  useEffect(() => {
    document.title = "Snakes & Ladders";
  }, []);

  const gameOver = status === "over";

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-eyebrow">Climb • Slide • Race to 100</p>
        <h1 className="app-title">
          Snakes <span className="amp">&amp;</span> Ladders
        </h1>
      </header>

      <div className="layout">
        <div className="layout__board">
          <div className="board-wrap">
            <Grid board={board} players={players} currentTurnId={currentTurnId} />
          </div>
        </div>

        <div className="layout__side">
          <TurnIndicator current={current} status={status} players={players} />

          <div className="card">
            <div className="dice-area" style={{ justifyContent: "space-between" }}>
              <Dice value={dice.value} rolling={dice.rolling} />
            </div>
            <div className="btn-row">
              <button
                className="btn btn--primary"
                onClick={rollDice}
                disabled={animating || gameOver}
              >
                🎲 Roll dice
              </button>
              <button
                className={`btn ${auto ? "btn--on" : ""}`}
                onClick={toggleAuto}
                disabled={gameOver}
                aria-pressed={auto}
              >
                {auto ? "Auto: ON" : "Auto: OFF"}
              </button>
              <button
                className="btn"
                onClick={addPlayer}
                disabled={players.length >= MAX_PLAYERS || animating}
              >
                + Add player
              </button>
            </div>
            <div className="legend" style={{ marginTop: "var(--space-4)" }}>
              <span className="legend__item">
                <span className="legend__swatch legend__swatch--ladder" /> Ladder (up)
              </span>
              <span className="legend__item">
                <span className="legend__swatch legend__swatch--snake" /> Snake (down)
              </span>
            </div>
          </div>

          <Scoreboard players={players} currentTurnId={currentTurnId} onRemove={removePlayer} />
          <MoveLog player={current} />
          <SetupPanel settings={settings} onSettings={updateSettings} onReset={reset} disabled={animating} />
        </div>
      </div>
    </div>
  );
};

export default App;
