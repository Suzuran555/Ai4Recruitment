"use client";

import { useEffect, useState } from "react";

/**
 * tRPC Panel 替代方案
 * 
 * 由于 trpc-panel 1.3.4 与 @trpc/server 11.x 存在兼容性问题，
 * 这个页面提供了一个简单的测试界面。
 * 
 * 推荐使用 tRPC Playground: http://localhost:3000/api/trpc
 */
export default function TRPCPanelPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold text-white">tRPC 测试工具</h1>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-200">
            <p className="mb-2 font-semibold">⚠️ trpc-panel 兼容性问题</p>
            <p className="text-sm">
              trpc-panel 1.3.4 要求 @trpc/server ^10.0.0，但项目使用 @trpc/server 11.7.2。
              这可能导致兼容性问题。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              🎮 tRPC Playground（推荐）
            </h2>
            <p className="mb-4 text-zinc-400">
              tRPC 内置的交互式测试工具，支持所有 API。
            </p>
            <a
              href="/api/trpc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700"
            >
              打开 tRPC Playground →
            </a>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              🧪 开发测试页面
            </h2>
            <p className="mb-4 text-zinc-400">
              简单的测试界面，可以快速测试各个 API。
            </p>
            <a
              href="/dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              打开测试页面 →
            </a>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              📚 API 文档
            </h2>
            <p className="mb-4 text-zinc-400">
              查看完整的 tRPC API 文档和架构说明。
            </p>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>• <code className="rounded bg-zinc-800 px-2 py-1">api.job.*</code> - 岗位管理</p>
              <p>• <code className="rounded bg-zinc-800 px-2 py-1">api.candidate.*</code> - 候选人管理</p>
              <p>• <code className="rounded bg-zinc-800 px-2 py-1">api.analysis.*</code> - 代码分析</p>
              <p>• <code className="rounded bg-zinc-800 px-2 py-1">api.match.*</code> - 岗位匹配</p>
              <p>• <code className="rounded bg-zinc-800 px-2 py-1">api.post.*</code> - 示例 API</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
