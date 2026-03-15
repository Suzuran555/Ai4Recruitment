"use client";

import { useMemo, useState } from "react";
import {
  createEmptyBoard,
  formatMoveLabel,
  getGameOutcome,
  getNextPlayer,
  type Cell,
  type Player,
} from "../lib/tictactoe";

type HistoryEntry = {
  board: Cell[];
  nextPlayer: Player;
  lastMove: number | null;
};

function Square({
  value,
  onClick,
  isWinning,
  isPlayable,
}: {
  value: Cell;
  onClick: () => void;
  isWinning: boolean;
  isPlayable: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isPlayable}
      className={[
        "group relative flex h-20 w-20 items-center justify-center rounded-2xl border text-3xl font-semibold select-none",
        "transition-colors focus:ring-2 focus:ring-zinc-900/20 focus:outline-none",
        "disabled:cursor-not-allowed",
        isWinning
          ? "border-emerald-500/50 bg-emerald-50 text-emerald-900"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
      ].join(" ")}
      aria-label={value === null ? "空格" : `落子 ${value}`}
    >
      <span className="leading-none">{value ?? ""}</span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-emerald-400/30 transition group-focus-visible:ring-4" />
    </button>
  );
}

export function TicTacToe() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { board: createEmptyBoard(), nextPlayer: "X", lastMove: null },
  ]);
  const [stepIndex, setStepIndex] = useState(0);

  const current = history[stepIndex]!;
  const outcome = useMemo(() => {
    return getGameOutcome(current.board);
  }, [current.board]);

  const canPlay = outcome.kind === "playing";
  const winningSet = useMemo(() => {
    if (outcome.kind !== "won") {
      return new Set<number>();
    }
    return new Set<number>(outcome.winningLine);
  }, [outcome]);

  function handlePlayAt(index: number) {
    if (!canPlay) {
      return;
    }
    if (current.board[index] !== null) {
      return;
    }

    const nextBoard = current.board.slice();
    nextBoard[index] = current.nextPlayer;

    const nextEntry: HistoryEntry = {
      board: nextBoard,
      nextPlayer: getNextPlayer(current.nextPlayer),
      lastMove: index,
    };

    const nextHistory = history.slice(0, stepIndex + 1);
    nextHistory.push(nextEntry);

    setHistory(nextHistory);
    setStepIndex(nextHistory.length - 1);
  }

  function handleJumpTo(nextStepIndex: number) {
    setStepIndex(nextStepIndex);
  }

  function handleReset() {
    setHistory([
      { board: createEmptyBoard(), nextPlayer: "X", lastMove: null },
    ]);
    setStepIndex(0);
  }

  const statusText = useMemo(() => {
    if (outcome.kind === "won") {
      return `胜者：${outcome.winner}`;
    }
    if (outcome.kind === "draw") {
      return "平局：棋盘已满";
    }
    return `当前回合：${current.nextPlayer}`;
  }, [current.nextPlayer, outcome]);

  return (
    <section className="w-full">
      <div className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              井字棋（Tic Tac Toe）
            </h1>
            <p className="text-sm text-zinc-600">
              规则：先连成一条直线（横/竖/斜）的一方获胜。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                outcome.kind === "won"
                  ? "bg-emerald-50 text-emerald-900"
                  : outcome.kind === "draw"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-zinc-100 text-zinc-900",
              ].join(" ")}
              aria-live="polite"
            >
              {statusText}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              重新开始
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center gap-3">
            <div className="grid grid-cols-3 gap-3">
              {current.board.map((cell, idx) => {
                return (
                  <Square
                    key={idx}
                    value={cell}
                    onClick={() => {
                      handlePlayAt(idx);
                    }}
                    isWinning={winningSet.has(idx)}
                    isPlayable={canPlay && cell === null}
                  />
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              提示：点击空格落子；获胜后会高亮连线。
            </p>
          </div>

          <aside className="w-full md:w-[280px]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">步数历史</h2>
              <span className="text-xs text-zinc-500">
                当前：第 {stepIndex} 步
              </span>
            </div>
            <ol className="mt-3 flex max-h-[360px] flex-col gap-2 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              {history.map((entry, idx) => {
                const isCurrent = idx === stepIndex;
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => {
                        handleJumpTo(idx);
                      }}
                      className={[
                        "w-full rounded-xl px-3 py-2 text-left text-sm transition",
                        isCurrent
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-900 hover:bg-zinc-100",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">
                          {formatMoveLabel(idx, entry.lastMove)}
                        </span>
                        <span
                          className={[
                            "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium",
                            isCurrent
                              ? "bg-white/15 text-white"
                              : "bg-zinc-100",
                          ].join(" ")}
                        >
                          下一个：{entry.nextPlayer}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}
