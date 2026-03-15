import { createAuthClient } from "better-auth/react";

import { env } from "~/env";

function getBaseUrl() {
  // 优先使用环境变量中的 baseURL
  if (env.NEXT_PUBLIC_BASE_URL) return env.NEXT_PUBLIC_BASE_URL;
  
  // 客户端环境：使用当前页面的 origin
  if (typeof window !== "undefined") return window.location.origin;
  
  // 服务器环境：使用 VERCEL_URL 或默认 localhost
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const authClient = createAuthClient({
  baseURL: `${getBaseUrl()}/api/auth`,
});

export type Session = typeof authClient.$Infer.Session;
