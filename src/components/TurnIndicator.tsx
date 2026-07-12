// components/TurnIndicator.tsx
import React from "react";
import { Player } from "../game/types";

interface TurnIndicatorProps {
  current: Player | undefined;
  status: "playing" | "over";
  players: Player[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

const TurnIndicator: React.FC<TurnIndicatorProps> = ({ current, status, players }) => {
  if (status === "over") {
    const ranked = players
      .filter((p) => p.rank != null)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    return (
      <div className="card">
        <div className="turn turn--over">
          <div className="turn__label">
            <small>Game over</small>
            {ranked[0] ? `${ranked[0].name} wins!` : "Finished"}
          </div>
        </div>
        <div className="ranking">
          {ranked.map((p, i) => (
            <div className="ranking__row" key={p.id} style={{ color: p.color }}>
              <span className="ranking__medal">{MEDALS[i] ?? `#${p.rank}`}</span>
              {p.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="turn">
        <span className="turn__dot" style={{ backgroundColor: current?.color ?? "#666" }} />
        <div className="turn__label">
          <small>Now playing</small>
          {current?.name ?? "—"}
        </div>
      </div>
    </div>
  );
};

export default TurnIndicator;
