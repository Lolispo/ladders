// components/SetupPanel.tsx
import React from "react";
import { Settings, WinCondition } from "../game/types";

interface SetupPanelProps {
  settings: Settings;
  onSettings: (partial: Partial<Settings>) => void;
  onReset: () => void;
  disabled: boolean;
}

const DIE_OPTIONS = [4, 6, 8, 10, 12, 20];
const MIN_DIM = 3;
const MAX_DIM = 14;

const Stepper: React.FC<{
  label: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}> = ({ label, value, disabled, onChange }) => (
  <div className="control-inline">
    <span className="field__label" style={{ margin: 0 }}>{label}</span>
    <div className="stepper">
      <button
        onClick={() => onChange(Math.max(MIN_DIM, value - 1))}
        disabled={disabled || value <= MIN_DIM}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="stepper__val">{value}</span>
      <button
        onClick={() => onChange(Math.min(MAX_DIM, value + 1))}
        disabled={disabled || value >= MAX_DIM}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  </div>
);

const SetupPanel: React.FC<SetupPanelProps> = ({ settings, onSettings, onReset, disabled }) => {
  const setWin = (winCondition: WinCondition) => onSettings({ winCondition });

  return (
    <div className="card">
      <h2 className="card__title">Setup</h2>

      <div className="field">
        <span className="field__label">Finish rule</span>
        <div className="segment" role="group" aria-label="Finish rule">
          <button
            aria-pressed={settings.winCondition === "overshoot"}
            onClick={() => setWin("overshoot")}
            disabled={disabled}
          >
            Overshoot wins
          </button>
          <button
            aria-pressed={settings.winCondition === "exact"}
            onClick={() => setWin("exact")}
            disabled={disabled}
          >
            Exact roll
          </button>
        </div>
      </div>

      <div className="field">
        <span className="field__label">Board size (resets game)</span>
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <Stepper label="Rows" value={settings.rows} disabled={disabled} onChange={(rows) => onSettings({ rows })} />
          <Stepper label="Cols" value={settings.cols} disabled={disabled} onChange={(cols) => onSettings({ cols })} />
        </div>
      </div>

      <div className="field">
        <span className="field__label">Dice</span>
        <select
          className="input"
          value={settings.dieSides}
          disabled={disabled}
          onChange={(e) => onSettings({ dieSides: Number(e.target.value) })}
        >
          {DIE_OPTIONS.map((d) => (
            <option key={d} value={d}>d{d}</option>
          ))}
        </select>
      </div>

      <div className="btn-row" style={{ marginTop: 0 }}>
        <button className="btn" onClick={onReset}>New game</button>
      </div>
    </div>
  );
};

export default SetupPanel;
