import { describe, it, expect } from "vitest";
import { createInitialBoard, getAllMoves, applyMove, aiBestMove } from "../logic";
import type { Board } from "../types";

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("checkers rules", () => {
  it("red has 7 opening moves", () => {
    expect(getAllMoves(createInitialBoard(), "red")).toHaveLength(7);
  });

  it("captures are mandatory", () => {
    const b = emptyBoard();
    b[5]![2] = { player: "red", king: false };
    b[5]![6] = { player: "red", king: false };
    b[4]![3] = { player: "black", king: false };
    const moves = getAllMoves(b, "red");
    expect(moves).toHaveLength(1);
    expect(moves[0]!.captures).toEqual([{ row: 4, col: 3 }]);
  });

  it("follows multi-jumps and promotes on the back row", () => {
    const b = emptyBoard();
    b[4]![1] = { player: "red", king: false };
    b[3]![2] = { player: "black", king: false };
    b[1]![4] = { player: "black", king: false };
    const [move] = getAllMoves(b, "red");
    expect(move!.to).toEqual({ row: 0, col: 5 });
    expect(move!.captures).toHaveLength(2);
    const after = applyMove(b, move!);
    expect(after[0]![5]).toEqual({ player: "red", king: true });
    expect(after[3]![2]).toBeNull();
    expect(after[1]![4]).toBeNull();
  });

  it("men only move forward, kings both ways", () => {
    const b = emptyBoard();
    b[4]![3] = { player: "red", king: false };
    expect(getAllMoves(b, "red").every((m) => m.to.row === 3)).toBe(true);
    b[4]![3] = { player: "red", king: true };
    expect(getAllMoves(b, "red")).toHaveLength(4);
  });

  it("AI takes a free capture", () => {
    const b = emptyBoard();
    b[2]![1] = { player: "black", king: false };
    b[3]![2] = { player: "red", king: false };
    const move = aiBestMove(b, 1);
    expect(move!.captures).toEqual([{ row: 3, col: 2 }]);
  });
});
