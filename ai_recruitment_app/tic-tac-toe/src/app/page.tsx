import { TicTacToe } from "../components/TicTacToe";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            Next.js + React + Tailwind 实战示例
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Tic Tac Toe
          </h1>
        </div>

        <TicTacToe />

        <footer className="text-xs text-zinc-500">
          提示：你可以在 `src/components/TicTacToe.tsx` 里继续扩展玩法（例如 AI
          对战、计分板、棋盘大小）。
        </footer>
      </main>
    </div>
  );
}
