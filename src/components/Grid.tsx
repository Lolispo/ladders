// components/Grid.tsx
import React, { useState, useEffect } from "react";
import { PlayerType } from "../models/Player";
import { GAMEBOARD_SIZE, ROW_LENGTH } from "../models/Constants";

interface GridProps {
  players: PlayerType[];
  ladders: { start: number; end: number }[];
}

const getCellColor = (position: number, ladders: { start: number; end: number }[]) => {
  for (let i = 0; i < ladders.length; i++) {
    if (ladders[i].start === position || ladders[i].end === position) {
      return `ladder-color-${i}`;
    }
  }
  return "";
};

const Grid: React.FC<GridProps> = ({ players, ladders }) => {
  const [cells, setCells] = useState(
    Array.from({ length: GAMEBOARD_SIZE }, (_, index) => ({
      position: index + 1,
      players: [] as PlayerType[],
    }))
  );

  useEffect(() => {
    const updatedCells = cells.map((cell) => ({
      ...cell,
      players: players.filter((player) => player.position === cell.position),
    }));
    setCells(updatedCells);
  }, [players]);

  const getLadderSymbol = (
    ladders: { start: number; end: number }[],
    position: number
  ): { symbol: string; color: string; fontweight: string } => {
    let symbol = "";
    let color = "black";
    let fontweight = "normal";
  
    const ladderStart = ladders.find((ladder) => ladder.start === position);
    const ladderEnd = ladders.find((ladder) => ladder.end === position);
  
    if (ladderStart && ladderStart.end > ladderStart.start) {
      // Ascending ladder starts here
      symbol = "↗";
      color = "green";
      fontweight = "bold";
    } else if (ladderStart && ladderStart.end < ladderStart.start) {
      // Descending ladder starts here
      symbol = "↘";
      color = "red";
      fontweight = "bold";
    } else if (ladderEnd && ladderEnd.end > ladderEnd.start) {
      // Ascending ladder ends here
      symbol = "⤴";
      color = "blue";
      fontweight = "bold";
    } else if (ladderEnd && ladderEnd.end < ladderEnd.start) {
      // Descending ladder ends here
      symbol = "⤵";
      color = "purple";
      fontweight = "bold";
    }
  
    return { symbol, color, fontweight };
  };
  

  const grid = Array.from({ length: GAMEBOARD_SIZE / ROW_LENGTH }, (_, row) => (
    <div key={row} className="row">
      {Array.from({ length: ROW_LENGTH }, (_, col) => {
        const adjustedRow = (GAMEBOARD_SIZE / ROW_LENGTH) - 1 - row; // Reverse the rows
        const position = adjustedRow % 2 === 0
          ? adjustedRow * ROW_LENGTH + col + 1
          : adjustedRow * ROW_LENGTH + ((ROW_LENGTH - 1) - col) + 1;
        const cell = cells.find((c) => c.position === position);
        const cellColor = getCellColor(position, ladders);
        const { symbol, color, fontweight } = getLadderSymbol(ladders, position);

        // console.log('Position', position, symbol, color, fontweight);
        return (
          <div
            key={col}
            className={`cell ${cellColor}`}
            id={`platform-${position}`}
          >
            <span
              style={{
                fontWeight: fontweight,
                color: color,
              }}
            >
              {position}{" "}
              {symbol}
            </span>


            {cell?.players.map((player) => (
              <div key={player.id} className="player-icon" style={{ backgroundColor: player.color }}>🧑</div>
            ))}
          </div>
        );
      })}
    </div>
  ));

  return <div className="grid">{grid}</div>;
};

export default Grid;
