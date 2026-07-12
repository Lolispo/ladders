// components/Grid.tsx
import React from "react";
import { Board, Player } from "../game/types";

interface GridProps {
  board: Board;
  players: Player[];
  currentTurnId: number | null;
}

interface CellInfo {
  fillClass: string;
  badge: { className: string; text: string } | null;
  endmark: { className: string; symbol: string } | null;
}

const cellInfo = (board: Board, position: number): CellInfo => {
  const start = board.elements.find((e) => e.start === position);
  if (start) {
    const isLadder = start.type === "ladder";
    return {
      fillClass: isLadder ? "cell-ladder-start" : "cell-snake-start",
      badge: {
        className: isLadder ? "cell__badge--ladder" : "cell__badge--snake",
        text: `${isLadder ? "↗" : "↘"}${start.end}`,
      },
      endmark: null,
    };
  }
  const end = board.elements.find((e) => e.end === position);
  if (end) {
    const isLadder = end.type === "ladder";
    return {
      fillClass: isLadder ? "cell-ladder-end" : "cell-snake-end",
      badge: null,
      endmark: {
        className: isLadder ? "cell__endmark--ladder" : "cell__endmark--snake",
        symbol: isLadder ? "⤴" : "⤵",
      },
    };
  }
  return { fillClass: "", badge: null, endmark: null };
};

const Grid: React.FC<GridProps> = ({ board, players, currentTurnId }) => {
  const { rows, cols } = board;

  const rowEls = Array.from({ length: rows }, (_, row) => (
    <div key={row} className="row">
      {Array.from({ length: cols }, (_, col) => {
        const adjustedRow = rows - 1 - row; // bottom row is squares 1..cols
        const position =
          adjustedRow % 2 === 0
            ? adjustedRow * cols + col + 1
            : adjustedRow * cols + (cols - 1 - col) + 1;
        const info = cellInfo(board, position);
        const alt = (position + Math.floor((position - 1) / cols)) % 2 === 0;
        const here = players.filter((p) => p.position === position);
        return (
          <div
            key={col}
            className={`cell ${alt ? "cell--alt" : ""} ${info.fillClass}`}
            id={`platform-${position}`}
          >
            <span className="cell__num">{position}</span>
            {info.badge && (
              <span className={`cell__badge ${info.badge.className}`}>{info.badge.text}</span>
            )}
            {info.endmark && (
              <span className={`cell__endmark ${info.endmark.className}`}>{info.endmark.symbol}</span>
            )}
            {here.length > 0 && (
              <div className="cell__pucks">
                {here.map((p) => (
                  <span
                    key={p.id}
                    className={`puck ${p.id === currentTurnId ? "puck--active" : ""}`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  ));

  return (
    <div
      className="grid"
      style={{ ["--grid-rows" as string]: rows, ["--grid-columns" as string]: cols } as React.CSSProperties}
    >
      {rowEls}
    </div>
  );
};

export default Grid;
