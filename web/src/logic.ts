import type { Board, Piece, Position, Move, Player } from "./types";

// ── Board helpers ──────────────────────────────────────────────

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r]![c] = { player: "black", king: false };
        if (r > 4) board[r]![c] = { player: "red", king: false };
      }
    }
  }
  return board;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/** Diagonal directions a piece may move in: kings both ways, men forward only. */
function directionsFor(piece: Piece): [number, number][] {
  if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return piece.player === "red" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

/** Get all jump sequences (captures) for a piece at (row, col). */
function getJumps(board: Board, row: number, col: number, piece: Piece): Move[] {
  const results: Move[] = [];
  const directions = directionsFor(piece);

  function dfs(b: Board, r: number, c: number, captures: Position[]) {
    let foundJump = false;
    for (const [dr, dc] of directions) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + 2 * dr;
      const lc = c + 2 * dc;
      if (!inBounds(lr, lc)) continue;
      const mid = b[mr]?.[mc];
      const land = b[lr]?.[lc];
      if (mid && mid.player !== piece.player && land === null) {
        foundJump = true;
        const nb = cloneBoard(b);
        nb[mr]![mc] = null;
        nb[r]![c] = null;
        nb[lr]![lc] = piece;
        dfs(nb, lr, lc, [...captures, { row: mr, col: mc }]);
      }
    }
    if (!foundJump && captures.length > 0) {
      results.push({ from: { row, col }, to: { row: r, col: c }, captures });
    }
  }

  dfs(board, row, col, []);
  return results;
}

/** Get simple (non-jump) moves for a piece. */
function getSimpleMoves(board: Board, row: number, col: number, piece: Piece): Move[] {
  const moves: Move[] = [];
  const directions = directionsFor(piece);

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc) && board[nr]?.[nc] === null) {
      moves.push({ from: { row, col }, to: { row: nr, col: nc }, captures: [] });
    }
  }
  return moves;
}

/** All legal moves for a player. Mandatory captures: if any jump exists, only jumps are returned. */
export function getAllMoves(board: Board, player: Player): Move[] {
  const jumps: Move[] = [];
  const simple: Move[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r]?.[c];
      if (!piece || piece.player !== player) continue;
      jumps.push(...getJumps(board, r, c, piece));
      simple.push(...getSimpleMoves(board, r, c, piece));
    }
  }

  // Mandatory capture rule
  if (jumps.length > 0) return jumps;
  return simple;
}

/** Apply a move to a board clone and promote kings. */
export function applyMove(board: Board, move: Move): Board {
  const nb = cloneBoard(board);
  const piece = nb[move.from.row]?.[move.from.col];
  if (!piece) return nb;

  nb[move.from.row]![move.from.col] = null;
  for (const cap of move.captures) {
    nb[cap.row]![cap.col] = null;
  }

  // Promote to king
  const promoted =
    (piece.player === "red" && move.to.row === 0) ||
    (piece.player === "black" && move.to.row === 7);
  nb[move.to.row]![move.to.col] = promoted ? { ...piece, king: true } : piece;

  return nb;
}

// ── AI (minimax with alpha-beta) ────────────────────────────────

function evaluate(board: Board): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r]?.[c];
      if (!p) continue;
      const val = p.king ? 5 : 3;
      // Positional bonus: advanced pieces are worth more
      const posBonus = p.player === "black" ? r * 0.1 : (7 - r) * 0.1;
      // Center control bonus
      const centerBonus = (c >= 2 && c <= 5) ? 0.2 : 0;
      if (p.player === "black") {
        score += val + posBonus + centerBonus;
      } else {
        score -= val + posBonus + centerBonus;
      }
    }
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  const player: Player = maximizing ? "black" : "red";
  const moves = getAllMoves(board, player);

  if (depth === 0 || moves.length === 0) {
    if (moves.length === 0) {
      // The current player has no moves — they lose
      return maximizing ? -1000 : 1000;
    }
    return evaluate(board);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nb = applyMove(board, move);
      const ev = minimax(nb, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const nb = applyMove(board, move);
      const ev = minimax(nb, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function aiBestMove(board: Board, depth: number): Move | null {
  const moves = getAllMoves(board, "black");
  if (moves.length === 0) return null;

  let bestMove = moves[0]!;
  let bestVal = -Infinity;

  for (const move of moves) {
    const nb = applyMove(board, move);
    const val = minimax(nb, depth, -Infinity, Infinity, false);
    if (val > bestVal) {
      bestVal = val;
      bestMove = move;
    }
  }
  return bestMove;
}
