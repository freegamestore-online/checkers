import { useState, useCallback, useEffect, useRef } from "react";
import type { Board, Piece, Position, Move, Player, Difficulty } from "../types";
import { DIFFICULTY_DEPTH } from "../types";

// ── Board helpers ──────────────────────────────────────────────

function createInitialBoard(): Board {
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

/** Get all jump sequences (captures) for a piece at (row, col). */
function getJumps(board: Board, row: number, col: number, piece: Piece): Move[] {
  const results: Move[] = [];
  const directions = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === "red"
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

  function dfs(b: Board, r: number, c: number, captures: Position[]) {
    let foundJump = false;
    for (const [dr, dc] of directions) {
      const mr = r + dr!;
      const mc = c + dc!;
      const lr = r + 2 * dr!;
      const lc = c + 2 * dc!;
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
  const directions = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === "red"
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

  for (const [dr, dc] of directions) {
    const nr = row + dr!;
    const nc = col + dc!;
    if (inBounds(nr, nc) && board[nr]?.[nc] === null) {
      moves.push({ from: { row, col }, to: { row: nr, col: nc }, captures: [] });
    }
  }
  return moves;
}

/** All legal moves for a player. Mandatory captures: if any jump exists, only jumps are returned. */
function getAllMoves(board: Board, player: Player): Move[] {
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
function applyMove(board: Board, move: Move): Board {
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

function aiBestMove(board: Board, depth: number): Move | null {
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

// ── Game component ──────────────────────────────────────────────

interface GameProps {
  onGameOver: (playerWon: boolean) => void;
  difficulty: Difficulty;
}

export function Game({ onGameOver, difficulty }: GameProps) {
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [turn, setTurn] = useState<Player>("red");
  const [aiThinking, setAiThinking] = useState(false);
  const gameOverRef = useRef(false);
  const aiActiveRef = useRef(false);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  // Compute all legal moves for the current player
  const allMoves = getAllMoves(board, turn);

  // Check for game over (only when it's the human turn and AI is idle)
  useEffect(() => {
    if (gameOverRef.current || aiThinking) return;
    if (turn === "red" && allMoves.length === 0) {
      gameOverRef.current = true;
      onGameOverRef.current(false); // Red can't move, red loses
    }
  }, [allMoves.length, turn, aiThinking]);

  // AI turn — use a ref guard to survive StrictMode double-fire
  useEffect(() => {
    if (turn !== "black" || gameOverRef.current || aiActiveRef.current) return;
    aiActiveRef.current = true;
    setAiThinking(true);

    const depth = DIFFICULTY_DEPTH[difficulty];
    const timer = setTimeout(() => {
      const move = aiBestMove(board, depth);
      if (!move) {
        if (!gameOverRef.current) {
          gameOverRef.current = true;
          onGameOverRef.current(true); // Computer can't move, player wins
        }
        aiActiveRef.current = false;
        setAiThinking(false);
        return;
      }
      const newBoard = applyMove(board, move);
      setBoard(newBoard);
      setTurn("red");
      setSelected(null);
      setValidMoves([]);
      aiActiveRef.current = false;
      setAiThinking(false);
    }, 400);

    return () => {
      clearTimeout(timer);
      aiActiveRef.current = false;
    };
  }, [turn, board, difficulty]);

  // Get moves for a specific piece (used for highlighting)
  const getMovesForPiece = useCallback(
    (row: number, col: number): Move[] => {
      return allMoves.filter((m) => m.from.row === row && m.from.col === col);
    },
    [allMoves],
  );

  // Which pieces have forced jumps?
  const hasJumps = allMoves.length > 0 && allMoves[0]!.captures.length > 0;
  const forcedPieces = hasJumps
    ? new Set(allMoves.map((m) => `${m.from.row},${m.from.col}`))
    : null;

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (turn !== "red" || aiThinking || gameOverRef.current) return;

      // If we have a selection, check if this is a valid destination
      if (selected) {
        const move = validMoves.find((m) => m.to.row === row && m.to.col === col);
        if (move) {
          const newBoard = applyMove(board, move);
          setBoard(newBoard);
          setSelected(null);
          setValidMoves([]);
          setTurn("black");
          return;
        }
      }

      // Select a piece
      const piece = board[row]?.[col];
      if (piece && piece.player === "red") {
        const moves = getMovesForPiece(row, col);
        if (moves.length > 0) {
          setSelected({ row, col });
          setValidMoves(moves);
        } else {
          setSelected(null);
          setValidMoves([]);
        }
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    },
    [turn, aiThinking, selected, validMoves, board, getMovesForPiece],
  );

  // Pre-compute highlight sets for fast lookup during render
  const validDestinations = new Set(validMoves.map((m) => `${m.to.row},${m.to.col}`));

  return (
    <div className="flex items-center justify-center h-full w-full p-4">
      <div className="flex flex-col items-center gap-3 w-full max-w-[min(90vw,90vh,600px)]">
        {/* Status bar */}
        <div
          className="text-sm font-semibold px-4 py-2 rounded-xl"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: aiThinking ? "var(--warning)" : "var(--ink)",
          }}
        >
          {aiThinking
            ? "Computer is thinking..."
            : turn === "red"
              ? hasJumps
                ? "Your turn — you must jump!"
                : "Your turn"
              : "Computer's turn"}
        </div>

        {/* Board */}
        <div
          className="grid grid-cols-8 w-full border-2 rounded-xl overflow-hidden"
          style={{
            aspectRatio: "1",
            borderColor: "var(--line-strong)",
          }}
        >
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => {
              const isDark = (row + col) % 2 === 1;
              const piece = board[row]?.[col];
              const isSelected =
                selected !== null && selected.row === row && selected.col === col;
              const isValidDest = validDestinations.has(`${row},${col}`);
              const isForced =
                forcedPieces !== null &&
                piece?.player === "red" &&
                forcedPieces.has(`${row},${col}`) &&
                !isSelected;

              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => handleSquareClick(row, col)}
                  className="relative flex items-center justify-center"
                  style={{
                    aspectRatio: "1",
                    background: isSelected
                      ? "#3b82f6"
                      : isValidDest
                        ? isDark
                          ? "#4ade80"
                          : "#86efac"
                        : isDark
                          ? "#7c5e3c"
                          : "#f5deb3",
                    cursor:
                      turn === "red" && !aiThinking && (piece?.player === "red" || isValidDest)
                        ? "pointer"
                        : "default",
                    touchAction: "manipulation",
                  }}
                  aria-label={`Square ${row},${col}${piece ? ` ${piece.player} ${piece.king ? "king" : "piece"}` : ""}`}
                >
                  {/* Forced-jump indicator ring */}
                  {isForced && (
                    <div
                      className="absolute inset-1 rounded-full"
                      style={{
                        border: "3px solid var(--warning)",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* Piece */}
                  {piece && (
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: "75%",
                        height: "75%",
                        background:
                          piece.player === "red"
                            ? "radial-gradient(circle at 35% 35%, #ef4444, #991b1b)"
                            : "radial-gradient(circle at 35% 35%, #555, #1a1a1a)",
                        boxShadow: isSelected
                          ? "0 0 0 3px #fff, 0 4px 12px rgba(0,0,0,0.4)"
                          : "0 2px 6px rgba(0,0,0,0.4)",
                        border:
                          piece.player === "red"
                            ? "2px solid #fca5a5"
                            : "2px solid #666",
                      }}
                    >
                      {/* King crown indicator */}
                      {piece.king && (
                        <div
                          className="rounded-full"
                          style={{
                            width: "45%",
                            height: "45%",
                            border: "2px solid #fbbf24",
                            background: "radial-gradient(circle, #fbbf24 20%, transparent 70%)",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Valid move dot */}
                  {isValidDest && !piece && (
                    <div
                      className="rounded-full"
                      style={{
                        width: "30%",
                        height: "30%",
                        background: "rgba(0,0,0,0.3)",
                      }}
                    />
                  )}
                </button>
              );
            }),
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-6 text-xs" style={{ color: "var(--muted)" }}>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: "#ef4444", border: "1px solid #fca5a5" }}
            />
            You (Red)
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: "#333", border: "1px solid #666" }}
            />
            Computer (Black)
          </div>
        </div>
      </div>
    </div>
  );
}
