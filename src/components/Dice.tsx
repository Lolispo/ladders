// components/Dice.tsx
import React from "react";

interface DiceProps {
  value: number | null;
  rolling: boolean;
}

// Pip positions on a 3x3 grid (grid cells 1..9) for die faces 1..6.
const PIP_LAYOUT: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const Dice: React.FC<DiceProps> = ({ value, rolling }) => {
  const pips = value && value >= 1 && value <= 6 ? PIP_LAYOUT[value] : null;
  return (
    <div className="dice-area">
      <div className={`die ${rolling ? "die--rolling" : ""}`} aria-label={value ? `Rolled ${value}` : "Die"}>
        {value == null ? (
          <span className="die__num">–</span>
        ) : pips ? (
          Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="die__pip" style={{ visibility: pips.includes(i + 1) ? "visible" : "hidden" }} />
          ))
        ) : (
          <span className="die__num">{value}</span>
        )}
      </div>
      <span className="dice-hint">{rolling ? "Rolling…" : value ? "" : "Roll to start"}</span>
    </div>
  );
};

export default Dice;
