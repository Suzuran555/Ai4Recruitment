import { renderTrpcPanel } from "trpc-panel";
import { appRouter } from "~/server/api/root";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get the origin from headers (works in both dev and production)
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" 
      ? (headersList.get("x-forwarded-proto") ?? "https")
      : "http";
    const url = `${protocol}://${host}/api/trpc`;

    const panelHtml = renderTrpcPanel(appRouter, {
      url,
      transformer: "superjson", // 匹配 tRPC 配置中的 transformer
    });

    return new Response(panelHtml, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error rendering tRPC Panel:", error);
    const errorMessage = error instanceof Error 
      ? `${error.message}\n\nStack:\n${error.stack}` 
      : String(error);
    
    // Redirect to the info page instead of showing error
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>tRPC Panel - Compatibility Issue</title>
  <meta http-equiv="refresh" content="2;url=/trpc-panel">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      padding: 40px 20px; 
      background: #0a0a0a; 
      color: #fff; 
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      text-align: center;
    }
    h1 { color: #ef4444; margin-bottom: 20px; }
    p { color: #a0a0a0; line-height: 1.6; margin-bottom: 16px; }
    .link {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }
    .link:hover { background: #2563eb; }
    pre { 
      background: #1a1a1a; 
      padding: 15px; 
      border-radius: 6px; 
      overflow: auto; 
      white-space: pre-wrap;
      text-align: left;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ tRPC Panel 兼容性问题</h1>
    <p>
      项目已降级到 <code>@trpc/server ^10.0.0</code> 以兼容 trpc-panel。
      如果仍然遇到错误，请检查控制台日志。
    </p>
    <p>这可能导致解析错误。推荐使用以下替代方案：</p>
    <a href="/api/trpc" class="link">使用 tRPC Playground（推荐）</a>
    <br />
    <a href="/trpc-panel" class="link" style="background: #059669; margin-top: 10px;">
      查看替代方案
    </a>
    <details style="margin-top: 30px; text-align: left;">
      <summary style="cursor: pointer; color: #a0a0a0;">错误详情</summary>
      <pre>${errorMessage}</pre>
    </details>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  }
}

