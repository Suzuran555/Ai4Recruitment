# Lyrathon-12.12

The application in this repository is located inside `ai_recruitment_app/`.  
It is an AI recruitment / demonstration platform built with:

**Next.js (App Router) + tRPC + Drizzle (Postgres) + Better Auth**

---

# Repository Structure

```
Ai4Recruitment/
  README.md
  ai_recruitment_app/
    package.json                 # pnpm scripts / dependencies
    next.config.js               # Next configuration (auth env included)
    drizzle.config.ts            # Drizzle Kit config (reads DATABASE_URL)
    start-database.sh            # Docker/Podman script for Postgres (reads .env)
    public/                      # static resources
    src/
      app/                       # Next.js App Router
        api/
          auth/[...all]/route.ts # Better Auth router
          trpc/[trpc]/route.ts   # tRPC router
        assessment/              # assessment pages
        evaluation/              # evaluation pages
        review/                  # review pages
        candidate/               # candidate-specific pages
        hr/                      # HR pages
        layout.tsx               # root layout (Theme / tRPC Provider etc.)
        page.tsx                 # landing page
      components/                # reusable components (UI, auth components, etc.)
      server/
        db/                      # Drizzle + Postgres connection and schema
        api/                     # tRPC routers
        better-auth/             # Better Auth client/server setup
      trpc/                      # tRPC React / Query client encapsulation
      styles/                    # global styles
      env.js                     # environment schema (@t3-oss/env-nextjs)
```

---

# Required Commands

All commands should be executed inside `ai_recruitment_app/`.

Enter the directory first:

```bash
cd ai_recruitment_app
```

---

## Install Dependencies

```bash
pnpm install
```

---

## Start Local Development Server

```bash
pnpm dev
```

The application will run at:

```
http://localhost:3000
```

Better Auth callbacks will also default to this port unless `PORT` is specified.

---

## Build / Preview

Build the production bundle:

```bash
pnpm build
pnpm start
```

Or preview with a single command:

```bash
pnpm preview
```

---

## Code Checking / Formatting

```bash
pnpm check
pnpm lint
pnpm typecheck
pnpm format:check
pnpm format:write
```

---

# Quick Start (Run the project locally)

Follow the steps below in order.

Install dependencies:

```bash
cd ai_recruitment_app
pnpm install
```

---

## 1. Create a local `.env`

```bash
cd ai_recruitment_app

# macOS / Linux
cat > .env <<'EOF'
DATABASE_URL="postgres://postgres:password@localhost:5432/ai_recruitment"
BETTER_AUTH_SECRET="dev-secret-change-me"
BETTER_AUTH_GOOGLE_CLIENT_ID=""
BETTER_AUTH_GOOGLE_CLIENT_SECRET=""
BETTER_AUTH_GITHUB_CLIENT_ID=""
BETTER_AUTH_GITHUB_CLIENT_SECRET=""
EOF
```

---

## 2. Start the local Postgres database (Docker / Podman)

```bash
./start-database.sh
```

---

## 3. Sync database schema (Drizzle)

```bash
pnpm db:push
```

---

## 4. Start the development server

```bash
pnpm dev
```

Open:

- Homepage  
  `http://localhost:3000`

- Feature pages  
  `/assessment`  
  `/evaluation`  
  `/review`

These routes correspond to folders inside `src/app/`.

---

# Database (Postgres + Drizzle)

## 1. Prepare `.env`

The file `.env` is ignored in `ai_recruitment_app/.gitignore`.

Create a local `.env` file containing at least:

```bash
DATABASE_URL="postgres://postgres:password@localhost:5432/ai_recruitment"

BETTER_AUTH_SECRET="your-secret"

BETTER_AUTH_GITHUB_CLIENT_ID=""
BETTER_AUTH_GITHUB_CLIENT_SECRET=""
BETTER_AUTH_GOOGLE_CLIENT_ID=""
BETTER_AUTH_GOOGLE_CLIENT_SECRET=""
```

Explanation:

- `DATABASE_URL` is required by both **Drizzle** and the application.
- OAuth credentials are optional for development but required in production.

The script `start-database.sh` will automatically parse the port, database name, and password from `DATABASE_URL`.

---

## 2. Start the database container

Make sure **Docker or Podman** is installed and running.

Then run:

```bash
./start-database.sh
```

---

## 3. Common Drizzle commands

```bash
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:studio
```

Note:

`package.json` contains a command `db:local` pointing to `./scripts/db-local.sh`, but the `scripts/` directory is currently not included in the repository.  
If needed, you may replace it with `./start-database.sh`.

---

# Code Demos

All demos assume the existing project architecture and path alias (`~/*`).

---

# Demo 1 — Using tRPC in a Client Component

The project already includes an example:

```
src/app/_components/post.tsx
```

It demonstrates:

- `useSuspenseQuery` for fetching the latest post
- `useMutation` for creating a post
- `api.useUtils()` for invalidating cache after mutation

You can call other procedures in the same way.

Example:

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

# Demo 2 — Add a new tRPC Router (Backend) and call it from frontend

### 1. Create a router

`src/server/api/routers/candidate.ts`

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

---

### 2. Register the router

`src/server/api/root.ts`

```ts
import { candidateRouter } from "~/server/api/routers/candidate";

export const appRouter = createTRPCRouter({
  candidate: candidateRouter,
});
```

---

### 3. Call it in a Client Component

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

# Demo 3 — Access session in a Server Component (Better Auth)

The helper `getSession()` is implemented in:

```
src/server/better-auth/server.ts
```

Example page:

`src/app/demo-auth/page.tsx`

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

To enable Google login, configure the following variables in `.env`:

```
BETTER_AUTH_GOOGLE_CLIENT_ID
BETTER_AUTH_GOOGLE_CLIENT_SECRET
```

Then configure the callback URL in Google Cloud Console:

```
/api/auth/callback/google
```

---

# Demo 4 — RSC Prefetch + Client Hydration (avoid waterfall requests)

The project provides RSC helpers:

```
src/trpc/server.ts
```

which exports:

- `api`
- `HydrateClient`

Example usage:

```tsx
import { HydrateClient, api } from "~/trpc/server";
import { LatestPost } from "~/app/_components/post";

export default async function PrefetchDemoPage() {
  await api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <LatestPost />
    </HydrateClient>
  );
}
```

Note:

`getLatest` is a `protectedProcedure`, so it requires a valid login session.

---

# Common Issues

## Environment validation prevents startup

`next.config.js` imports `src/env.js` to validate environment variables.

If you temporarily want to skip validation (for example during container builds), run:

```bash
SKIP_ENV_VALIDATION=1 pnpm dev
```