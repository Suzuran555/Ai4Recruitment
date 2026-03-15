import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const DEFAULT_CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

export type GenerateTextInput = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
};

export type GenerateJsonInput<TSchema extends z.ZodTypeAny> = {
  system?: string;
  prompt: string;
  schema: TSchema;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
};

export class LlmError extends Error {
  public readonly code:
    | "MISSING_API_KEY"
    | "TIMEOUT"
    | "UPSTREAM"
    | "BAD_OUTPUT";

  public readonly publicMessage: string;
  public readonly status?: number;
  public readonly retryable: boolean;

  public constructor(opts: {
    code: LlmError["code"];
    message: string;
    publicMessage: string;
    status?: number;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = "LlmError";
    this.code = opts.code;
    this.publicMessage = opts.publicMessage;
    this.status = opts.status;
    this.retryable = Boolean(opts.retryable);
    if (opts.cause !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      (this as any).cause = opts.cause;
    }
  }
}

let cachedClient: Anthropic | null = null;

const DEFAULT_RETRY_COUNT = 2;

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new LlmError({
      code: "MISSING_API_KEY",
      message:
        "Missing CLAUDE_API_KEY. Set CLAUDE_API_KEY in the server environment.",
      publicMessage:
        "AI 服务未配置（缺少 CLAUDE_API_KEY），请联系管理员配置后重试。",
    });
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

function extractTextFromMessage(message: unknown) {
  const m = message as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const parts = Array.isArray(m.content) ? m.content : [];
  const texts: string[] = [];
  for (const p of parts) {
    if (p && p.type === "text" && typeof p.text === "string") {
      texts.push(p.text);
    }
  }
  return texts.join("").trim();
}

function isAbortError(err: unknown) {
  if (!err || typeof err !== "object") {
    return false;
  }
  const name = (err as { name?: unknown }).name;
  return name === "AbortError";
}

function extractHttpStatus(err: unknown) {
  if (!err || typeof err !== "object") {
    return undefined;
  }
  const candidates: unknown[] = [
    (err as { status?: unknown }).status,
    (err as { statusCode?: unknown }).statusCode,
    (err as { response?: { status?: unknown } }).response?.status,
    (err as { error?: { status?: unknown } }).error?.status,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) {
      return c;
    }
    if (typeof c === "string") {
      const n = Number(c);
      if (Number.isFinite(n)) {
        return n;
      }
    }
  }
  return undefined;
}

function extractErrorCode(err: unknown) {
  if (!err || typeof err !== "object") {
    return undefined;
  }
  const v = (err as { code?: unknown }).code;
  if (typeof v === "string" && v) {
    return v;
  }
  return undefined;
}

function isRetryableUpstream(status?: number, code?: string) {
  if (status === 429) {
    return true;
  }
  if (status === 408) {
    return true;
  }
  if (status !== undefined && status >= 500 && status <= 599) {
    return true;
  }

  // Network-ish error codes (best-effort).
  if (code) {
    const c = code.toUpperCase();
    if (
      c === "ECONNRESET" ||
      c === "ECONNREFUSED" ||
      c === "ETIMEDOUT" ||
      c === "EAI_AGAIN" ||
      c === "ENOTFOUND"
    ) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function computeBackoffMs(attemptIndex: number) {
  const base = 300;
  const max = 1200;
  const exp = Math.min(max, base * Math.pow(2, attemptIndex));
  const jitter = Math.floor(Math.random() * 120);
  return exp + jitter;
}

async function callClaude(opts: {
  system?: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  timeoutMs: number;
  retryCount?: number;
}) {
  const client = getClient();
  const deadline = Date.now() + opts.timeoutMs;
  const retryCount = opts.retryCount ?? DEFAULT_RETRY_COUNT;
  const maxAttempts = Math.max(1, retryCount + 1);

  try {
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        break;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, remainingMs);

      try {
        const res = await client.messages.create(
          {
            model: opts.model,
            max_tokens: opts.maxTokens,
            temperature: opts.temperature,
            system: opts.system,
            messages: [{ role: "user", content: opts.prompt }],
          },
          {
            signal: controller.signal,
          },
        );
        return res;
      } catch (e) {
        lastErr = e;

        if (isAbortError(e)) {
          throw new LlmError({
            code: "TIMEOUT",
            message: `Claude request timed out after ${opts.timeoutMs}ms`,
            publicMessage: "AI 响应超时，请稍后重试。",
            retryable: true,
            cause: e,
          });
        }

        const status = extractHttpStatus(e);
        const code = extractErrorCode(e);
        const retryable = isRetryableUpstream(status, code);

        if (retryable && attempt < maxAttempts - 1) {
          const backoffMs = computeBackoffMs(attempt);
          const afterBackoffMs = deadline - Date.now() - backoffMs;
          if (afterBackoffMs > 150) {
            clearTimeout(timer);
            await sleep(backoffMs);
            continue;
          }
        }

        throw new LlmError({
          code: "UPSTREAM",
          message: e instanceof Error ? e.message : "Claude request failed",
          publicMessage: "AI 服务暂时不可用，请稍后重试。",
          status,
          retryable,
          cause: e,
        });
      } finally {
        clearTimeout(timer);
      }
    }

    throw new LlmError({
      code: "TIMEOUT",
      message: `Claude request timed out after ${opts.timeoutMs}ms`,
      publicMessage: "AI 响应超时，请稍后重试。",
      retryable: true,
      cause: lastErr,
    });
  } catch (e) {
    if (e instanceof LlmError) {
      throw e;
    }
    throw new LlmError({
      code: "UPSTREAM",
      message: e instanceof Error ? e.message : "Claude request failed",
      publicMessage: "AI 服务暂时不可用，请稍后重试。",
      cause: e,
    });
  }
}

function tryParseJsonLoose(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false as const, error: "empty" };
  }
  try {
    return { ok: true as const, value: JSON.parse(trimmed) as unknown };
  } catch {
    // Try to salvage by extracting the first JSON object/array block.
    const firstObj = trimmed.indexOf("{");
    const lastObj = trimmed.lastIndexOf("}");
    if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
      const slice = trimmed.slice(firstObj, lastObj + 1);
      try {
        return { ok: true as const, value: JSON.parse(slice) as unknown };
      } catch {
        // fall through
      }
    }

    const firstArr = trimmed.indexOf("[");
    const lastArr = trimmed.lastIndexOf("]");
    if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
      const slice = trimmed.slice(firstArr, lastArr + 1);
      try {
        return { ok: true as const, value: JSON.parse(slice) as unknown };
      } catch {
        // fall through
      }
    }

    return { ok: false as const, error: "invalid_json" };
  }
}

export async function generateText(input: GenerateTextInput) {
  const temperature = input.temperature ?? 0.2;
  const maxTokens = input.maxTokens ?? 800;
  const model = input.model ?? DEFAULT_CLAUDE_MODEL;
  const timeoutMs = input.timeoutMs ?? 20_000;

  const res = await callClaude({
    system: input.system,
    prompt: input.prompt,
    temperature,
    maxTokens,
    model,
    timeoutMs,
  });

  const text = extractTextFromMessage(res);
  if (!text) {
    throw new LlmError({
      code: "BAD_OUTPUT",
      message: "Claude returned empty text output",
      publicMessage: "AI 返回内容为空，请稍后重试。",
    });
  }
  return text;
}

export async function generateJson<TSchema extends z.ZodTypeAny>(
  input: GenerateJsonInput<TSchema>,
): Promise<z.infer<TSchema>> {
  const temperature = input.temperature ?? 0;
  const maxTokens = input.maxTokens ?? 1200;
  const model = input.model ?? DEFAULT_CLAUDE_MODEL;
  const timeoutMs = input.timeoutMs ?? 25_000;

  const system = input.system
    ? `${input.system}\n\nReturn ONLY valid JSON. Do not wrap in markdown.`
    : "Return ONLY valid JSON. Do not wrap in markdown.";

  const res = await callClaude({
    system,
    prompt: input.prompt,
    temperature,
    maxTokens,
    model,
    timeoutMs,
  });

  const text = extractTextFromMessage(res);
  const parsed = tryParseJsonLoose(text);
  if (!parsed.ok) {
    throw new LlmError({
      code: "BAD_OUTPUT",
      message: "Claude returned non-JSON output",
      publicMessage: "AI 输出格式错误，请稍后重试。",
    });
  }

  const validated = input.schema.safeParse(parsed.value);
  if (!validated.success) {
    throw new LlmError({
      code: "BAD_OUTPUT",
      message: `Claude JSON schema validation failed: ${validated.error.message}`,
      publicMessage: "AI 输出结构不符合预期，请稍后重试。",
      cause: validated.error,
    });
  }
  return validated.data;
}
