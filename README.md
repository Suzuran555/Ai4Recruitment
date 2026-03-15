# Lyrathon-12.12

本仓库的主要应用位于 `ai_recruitment_app/`，是一个基于 **Next.js (App Router) + tRPC + Drizzle(Postgres) + Better Auth** 的 AI 招聘/评估演示项目。

---

## 目录结构（核心）

```
Lyrathon-12.12/
  README.md
  ai_recruitment_app/
    package.json                 # pnpm scripts / 依赖
    next.config.js               # Next 配置（包含 env 校验引入）
    drizzle.config.ts            # Drizzle Kit 配置（读取 DATABASE_URL）
    start-database.sh            # 使用 Docker/Podman 启动本地 Postgres（读取 .env）
    public/                      # 静态资源
    src/
      app/                       # Next.js App Router（页面与路由）
        api/
          auth/[...all]/route.ts # Better Auth 路由入口
          trpc/[trpc]/route.ts   # tRPC 路由入口
        assessment/              # 评估相关页面
        evaluation/              # 评价相关页面
        review/                  # 复盘相关页面
        candidate/               # 候选人页面/详情
        hr/                      # HR 页面
        layout.tsx               # 根布局（Theme/TRPC Provider 等）
        page.tsx                 # 首页
      components/                # 可复用组件（含 UI、auth 组件等）
      server/
        db/                      # Drizzle + Postgres 连接与 schema
        api/                     # tRPC routers
        better-auth/             # Better Auth 配置/客户端/服务端封装
      trpc/                      # tRPC react/query client 封装
      styles/                    # 全局样式
      env.js                     # 环境变量 schema（@t3-oss/env-nextjs）
```

---

## 必备指令（在 `ai_recruitment_app/` 下执行）

先进入目录：

```bash
cd ai_recruitment_app
```

### 安装依赖

```bash
pnpm install
```

### 本地开发启动

```bash
pnpm dev
```

默认会在 `http://localhost:3000` 启动（Better Auth 回调也默认基于 `PORT` 或 3000）。

### 构建 / 预览

```bash
pnpm build
pnpm start
```

或一键预览：

```bash
pnpm preview
```

### 代码检查 / 格式化

```bash
pnpm check
pnpm lint
pnpm typecheck
pnpm format:check
pnpm format:write
```

---

## 快速开始（本地跑起来，建议按顺序）

在项目根目录执行（第一次运行建议新开一个终端）：

```bash
cd ai_recruitment_app
pnpm install
```

1. **创建本地 `.env`**

```bash
cd ai_recruitment_app

# macOS/Linux
cat > .env <<'EOF'
DATABASE_URL="postgres://postgres:password@localhost:5432/ai_recruitment"
BETTER_AUTH_SECRET="dev-secret-change-me"
BETTER_AUTH_GOOGLE_CLIENT_ID=""
BETTER_AUTH_GOOGLE_CLIENT_SECRET=""
BETTER_AUTH_GITHUB_CLIENT_ID=""
BETTER_AUTH_GITHUB_CLIENT_SECRET=""
EOF
```

2. **启动本地 Postgres（Docker/Podman）**

```bash
./start-database.sh
```

3. **同步数据库 schema（Drizzle）**

```bash
pnpm db:push
```

4. **启动开发服务器**

```bash
pnpm dev
```

然后打开：

- 首页：`http://localhost:3000`
- 评估/评价/复盘等页面：`/assessment`、`/evaluation`、`/review`（见 `src/app/`）

---

## 数据库（Postgres + Drizzle）

### 1) 准备 `.env`

`ai_recruitment_app/.gitignore` 已忽略 `.env`，请在 `ai_recruitment_app/` 下创建本地 `.env` 文件，至少包含：

```bash
# 必填：Drizzle/应用都依赖它
DATABASE_URL="postgres://postgres:password@localhost:5432/ai_recruitment"

# 建议：Better Auth（生产环境必填；开发环境可选但推荐填）
BETTER_AUTH_SECRET="your-secret"

# 可选：开启 GitHub/Google 登录（生产环境必填；开发环境可选）
BETTER_AUTH_GITHUB_CLIENT_ID=""
BETTER_AUTH_GITHUB_CLIENT_SECRET=""
BETTER_AUTH_GOOGLE_CLIENT_ID=""
BETTER_AUTH_GOOGLE_CLIENT_SECRET=""
```

> 说明：`start-database.sh` 会从 `DATABASE_URL` 自动解析 **端口/库名/密码** 来创建或启动本地容器。

### 2) 启动本地数据库容器

需要安装并启动 Docker 或 Podman，然后在 `ai_recruitment_app/` 下执行：

```bash
./start-database.sh
```

### 3) Drizzle 常用命令

```bash
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:studio
```

> 注意：`package.json` 里存在 `db:local`（指向 `./scripts/db-local.sh`），但当前仓库未包含 `scripts/` 目录；如需该脚本请补充或改用 `./start-database.sh`。

---

## 代码 Demo（可复制）

下面这些 demo 都基于本项目现有的架构与路径别名（`~/*`）。

### Demo 1：Client Component 调用 tRPC（现有可跑）

项目里已经有一个现成例子：`src/app/_components/post.tsx`。

它展示了：

- `useSuspenseQuery`：读取最新 Post
- `useMutation`：创建 Post
- `api.useUtils()`：mutation 成功后 invalidate 缓存

你也可以在任意 Client Component 里按同样模式调用其它 procedure，例如：

```tsx
"use client";

import { api } from "~/trpc/react";

export function HelloTrpcDemo() {
  const hello = api.post.hello.useQuery({ text: "world" });

  if (hello.isLoading) return <div>Loading...</div>;
  if (hello.error) return <div>Error: {hello.error.message}</div>;

  return <div>{hello.data.greeting}</div>;
}
```

---

### Demo 2：新增一个 tRPC Router（后端）+ 前端调用（教学示例）

1. 新建 router：`src/server/api/routers/candidate.ts`

```ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { user } from "~/server/db/schema";

export const candidateRouter = createTRPCRouter({
  byId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, input.id),
      });
      return row ?? null;
    }),
});
```

2. 挂到根 router：`src/server/api/root.ts`

```ts
import { candidateRouter } from "~/server/api/routers/candidate";

export const appRouter = createTRPCRouter({
  // ...
  candidate: candidateRouter,
});
```

3. 前端调用（任意 Client Component）

```tsx
"use client";

import { api } from "~/trpc/react";

export function CandidateByIdDemo(props: { id: string }) {
  const q = api.candidate.byId.useQuery({ id: props.id });
  if (q.isLoading) return <div>Loading...</div>;
  if (q.error) return <div>{q.error.message}</div>;
  if (!q.data) return <div>Not found</div>;
  return <div>{q.data.email}</div>;
}
```

---

### Demo 3：在 Server Component 里拿到登录态（Better Auth）

本项目已经封装了 `getSession()`：`src/server/better-auth/server.ts`。

你可以写一个页面：`src/app/demo-auth/page.tsx`（示例）

```tsx
import { getSession } from "~/server/better-auth/server";
import { GoogleAuthCard } from "~/components/auth/google-auth-card";
import { SignOutButton } from "~/components/auth/sign-out-button";

export default async function DemoAuthPage() {
  const session = await getSession();

  if (!session?.user) {
    return <GoogleAuthCard title="Sign in" callbackURL="/demo-auth" />;
  }

  return (
    <main className="p-6 space-y-4">
      <div>Signed in as: {session.user.email}</div>
      <SignOutButton redirectTo="/demo-auth" />
    </main>
  );
}
```

> 要让 Google 登录真正可用，请在 `.env` 中填写 `BETTER_AUTH_GOOGLE_CLIENT_ID/SECRET`，并在 Google Cloud 控制台配置回调地址（本项目回调路径为 `/api/auth/callback/google`）。

---

### Demo 4：RSC 预取（prefetch）+ 客户端 Hydrate（避免瀑布请求）

项目里已经提供了 RSC helper：`src/trpc/server.ts` 导出 `api` 与 `HydrateClient`。

一个常见用法是：在 Server Component 里先 prefetch，再在 Client Component 里用 `useSuspenseQuery()` 直接读缓存：

```tsx
import { HydrateClient, api } from "~/trpc/server";
import { LatestPost } from "~/app/_components/post";

export default async function PrefetchDemoPage() {
  // 注意：getLatest 是 protectedProcedure，需要登录态；未登录会 UNAUTHORIZED
  await api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <LatestPost />
    </HydrateClient>
  );
}
```

---

## 常见问题

### 环境变量校验导致启动失败？

`next.config.js` 会引入 `src/env.js` 做环境变量校验。若你暂时不想校验（例如在容器构建时），可以在运行时设置：

```bash
SKIP_ENV_VALIDATION=1 pnpm dev
```
