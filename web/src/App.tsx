import { useState, useCallback } from "react";
import { GameShell, GameTopbar, GameAuth } from "@freegamestore/games";
import { Game } from "./components/Game";
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
    setPhase("playing");
  }, []);

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Checkers"
          stats={[{ label: "Wins", value: bestScore }]}
          actions={
            <>
              {phase !== "playing" && (
                <button onClick={start}>{phase === "menu" ? "Start" : "Play Again"}</button>
              )}
              <GameAuth />
            </>
          }
          rules={
            <div>
              <h3 style={{ fontWeight: 700 }}>Checkers</h3>
              <h4 style={{ fontWeight: 600 }}>Rules</h4>
              <ul><li>Play red vs computer (black)</li><li>Move diagonally forward; jump to capture (mandatory)</li><li>Reach the far row to king — kings move backward too</li><li>Capture all opponent pieces to win</li></ul>
              <h4 style={{ fontWeight: 600 }}>Controls</h4>
              <ul><li>Tap a piece to select, tap a valid square to move</li></ul>
            </div>
          }
        />
      }
    >
      <div className="relative w-full h-full">
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
    </GameShell>
  );
}
