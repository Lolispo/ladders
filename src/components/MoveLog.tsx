// components/MoveLog.tsx
import React from "react";
import { Player } from "../game/types";

interface MoveLogProps {
  player: Player | undefined;
}

const DICE_FACE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const pad = (n: number) => String(n).padStart(3, " ");

const MoveLog: React.FC<MoveLogProps> = ({ player }) => {
  const moves = player ? [...player.moveHistory].reverse() : [];
  return (
    <div className="card">
      <h2 className="card__title">{player ? `${player.name} — moves` : "Moves"}</h2>
      {moves.length === 0 ? (
        <div className="log__empty">No moves yet.</div>
      ) : (
        <div className="log">
          {moves.map((m, i) => {
            const face = m.dice && m.dice >= 1 && m.dice <= 6 ? `${DICE_FACE[m.dice]} ${m.dice}` : "";
            const tag = m.elementType ? (m.elementType === "ladder" ? "🪜 ladder" : "🐍 snake") : "";
            return (
              <div
                key={i}
                className={`log__row ${m.elementType === "ladder" ? "log__row--ladder" : ""} ${
                  m.elementType === "snake" ? "log__row--snake" : ""
                }`}
              >
                {`${pad(m.from)} → ${pad(m.to)}  ${face}${tag}`}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MoveLog;
