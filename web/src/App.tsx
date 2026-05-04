import { useState, useCallback } from "react";
import { Shell } from "./components/Shell";
import { Game } from "./components/Game";
import { Leaderboard } from "./components/Leaderboard";
import { useLeaderboard } from "./hooks/useLeaderboard";
import type { GamePhase } from "./types";

const BEST_SCORE_KEY = "freecheckers-best";

function getBestScore(): number {
  const v = localStorage.getItem(BEST_SCORE_KEY);
  return v ? parseInt(v, 10) : 0;
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [won, setWon] = useState(false);
  const [bestScore, setBestScore] = useState(getBestScore);
  const { topScores, recentScores, submitScore, loading } = useLeaderboard("checkers");

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
    setPhase("playing");
  }, []);

  return (
    <Shell
      sidebar={
        <nav className="flex-1 px-4 flex flex-col gap-3 py-4">
          <div className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Wins
          </div>
          <div
            className="text-3xl font-bold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {bestScore}
          </div>
          {phase !== "playing" && (
            <button
              onClick={start}
              className="mt-4 px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {phase === "menu" ? "Start" : "Play Again"}
            </button>
          )}
          <div
            className="mt-2 border-t"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="text-xs font-semibold px-4 pt-3" style={{ color: "var(--muted)" }}>
              Leaderboard
            </div>
            <Leaderboard topScores={topScores} recentScores={recentScores} loading={loading} />
          </div>
        </nav>
      }
      dock={
        <>
          <div className="text-sm font-semibold">
            Wins: {bestScore}
          </div>
        </>
      }
    >
      <div className="relative w-full h-full min-h-[400px]">
        {phase === "playing" ? (
          <Game onGameOver={handleGameOver} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <h1
              className="text-4xl font-bold"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Checkers
            </h1>
            {phase === "over" && (
              <p
                className="text-xl font-bold"
                style={{
                  color: won ? "var(--success)" : "var(--error)",
                  fontFamily: "Fraunces, serif",
                }}
              >
                {won ? "You Win!" : "You Lose!"}
              </p>
            )}
            <p style={{ color: "var(--muted)" }}>
              Play checkers against the AI. Red moves first.
            </p>
            <button
              onClick={start}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {phase === "menu" ? "Start Game" : "Play Again"}
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
