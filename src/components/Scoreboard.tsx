// components/Scoreboard.tsx
import React from "react";
import { MIN_PLAYERS, Player } from "../game/types";

interface ScoreboardProps {
  players: Player[];
  currentTurnId: number | null;
  onRemove: (id: number) => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ players, currentTurnId, onRemove }) => {
  const canRemove = players.length > MIN_PLAYERS;
  return (
    <div className="card">
      <h2 className="card__title">Players</h2>
      <div className="players">
        {players.map((p) => (
          <div
            key={p.id}
            className={`player-row ${p.id === currentTurnId ? "player-row--turn" : ""}`}
          >
            <span className="player-chip" style={{ backgroundColor: p.color }} />
            <span className="player-row__name" style={{ color: p.color }}>{p.name}</span>
            {p.rank ? (
              <span className="player-row__rank">#{p.rank}</span>
            ) : (
              <span className="player-row__meta">sq {p.position} · {p.diceRolls} rolls</span>
            )}
            {canRemove && (
              <button
                className="icon-btn"
                onClick={() => onRemove(p.id)}
                aria-label={`Remove ${p.name}`}
                title={`Remove ${p.name}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;
