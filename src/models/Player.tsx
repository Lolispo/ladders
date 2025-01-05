export interface PlayerType {
  id: number;
  name: string;
  position: number;
  color: string;
  diceRolls: number;
  movedSteps: number;
  moveHistory: Move[];
  finished: boolean;
}

export interface Move {
  dice?: number, 
  from: number, 
  to: number, 
  moveType?: MoveType,
  moveNumber: number,
}

export enum MoveType {
  Ladder = "Ladder",
}
