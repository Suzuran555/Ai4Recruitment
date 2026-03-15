export type Player = "X" | "O";
export type Cell = Player | null;

export const BOARD_SIZE = 9 as const;

export const WIN_LINES: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createEmptyBoard(): Cell[] {
  return Array.from({ length: BOARD_SIZE }, () => null);
}

export function getNextPlayer(current: Player): Player {
  if (current === "X") {
    return "O";
  }
  return "X";
}

export type GameOutcome =
  | { kind: "playing"; winner: null; winningLine: null }
  | { kind: "won"; winner: Player; winningLine: ReadonlyArray<number> }
  | { kind: "draw"; winner: null; winningLine: null };

export function getGameOutcome(board: ReadonlyArray<Cell>): GameOutcome {
  for (const line of WIN_LINES) {
    const [a, b, c] = line as [number, number, number];
    const v = board[a];
    if (v !== null && v !== undefined && v === board[b] && v === board[c]) {
      return { kind: "won", winner: v, winningLine: line };
    }
  }

  const hasEmpty = board.some((cell) => cell === null);
  if (hasEmpty) {
    return { kind: "playing", winner: null, winningLine: null };
  }
  return { kind: "draw", winner: null, winningLine: null };
}

export function formatMoveLabel(moveIndex: number, lastMove: number | null) {
  if (moveIndex === 0) {
    return "回到开局";
  }
  if (lastMove === null) {
    return `回到第 ${moveIndex} 步`;
  }
  const row = Math.floor(lastMove / 3) + 1;
  const col = (lastMove % 3) + 1;
  return `回到第 ${moveIndex} 步（${row}, ${col}）`;
}
