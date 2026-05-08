export type Player = "red" | "black";

export interface Piece {
  player: Player;
  king: boolean;
}

/** Board is 8x8. Only dark squares (where (row+col) is odd) hold pieces. */
export type Board = (Piece | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures: Position[];
}

export type GamePhase = "menu" | "playing" | "over";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};
