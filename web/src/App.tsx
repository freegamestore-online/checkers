import { useState, useCallback } from "react";
import { GameShell, GameTopbar, GameAuth } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useLeaderboard } from "./hooks/useLeaderboard";
import type { GamePhase, Difficulty } from "./types";

const BEST_SCORE_KEY = "freecheckers-best";
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function getBestScore(): number {
  const v = localStorage.getItem(BEST_SCORE_KEY);
  return v ? parseInt(v, 10) : 0;
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [won, setWon] = useState(false);
  const [bestScore, setBestScore] = useState(getBestScore);
  const [difficulty] = useState<Difficulty>("medium");
  const [gameKey, setGameKey] = useState(0);
  const { submitScore } = useLeaderboard("checkers");

  const handleGameOver = useCallback(
    (playerWon: boolean) => {
      setWon(playerWon);
      if (playerWon) {
        const best = getBestScore();
        const newBest = best + 1;
        localStorage.setItem(BEST_SCORE_KEY, String(newBest));
        setBestScore(newBest);
        submitScore(1);
      }
      setPhase("over");
    },
    [submitScore],
  );

  const start = useCallback(() => {
    setWon(false);
    setGameKey((k) => k + 1);
    setPhase("playing");
  }, []);

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Checkers"
          stats={[
            { label: "Wins", value: bestScore },
            { label: "Difficulty", value: DIFFICULTY_LABELS[difficulty] },
          ]}
          actions={<GameAuth />}
          rules={
            <div>
              <h3 style={{ fontWeight: 700 }}>Checkers</h3>
              <p>Play against the computer.</p>
              <h4 style={{ fontWeight: 600, marginTop: 8 }}>Controls</h4>
              <ul>
                <li>Tap a red piece to select it</li>
                <li>Tap a highlighted square to move</li>
                <li>Jumps are mandatory — if you can capture, you must</li>
              </ul>
              <h4 style={{ fontWeight: 600, marginTop: 8 }}>Rules</h4>
              <ul>
                <li>Red moves first</li>
                <li>Pieces move diagonally forward</li>
                <li>Jump over opponent pieces to capture them</li>
                <li>Multiple jumps allowed in one turn</li>
                <li>Reach the far row to become a King</li>
                <li>Kings can move and capture backward</li>
                <li>Capture all opponent pieces to win</li>
              </ul>
              <h4 style={{ fontWeight: 600, marginTop: 8 }}>Difficulty</h4>
              <ul>
                <li>Easy: computer looks 1 move ahead</li>
                <li>Medium: 3 moves ahead</li>
                <li>Hard: 5 moves ahead</li>
              </ul>
            </div>
          }
        />
      }
    >
      <div className="relative w-full h-full">
        <Game key={gameKey} onGameOver={handleGameOver} difficulty={difficulty} />
        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "rgba(0,0,0,0.55)" }}>
            <p
              className="text-xl font-bold"
              style={{
                color: won ? "var(--success)" : "var(--error)",
                fontFamily: "Fraunces, serif",
              }}
            >
              {won ? "You Win!" : "You Lose!"}
            </p>
            <button
              onClick={start}
              className="px-6 py-3 rounded-xl font-semibold min-h-[2.75rem]"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
