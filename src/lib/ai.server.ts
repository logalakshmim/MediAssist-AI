type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type AIMessage = { role: "system" | "user" | "assistant"; content: string | Part[] };

async function ensureEnv() {
  if (
    process.env["GROQ_API_KEY"] ||
    process.env["GEMINI_API_KEY"] ||
    process.env["LOVABLE_API_KEY"]
  )
    return;
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch {
    /* not available in this runtime */
  }
}

export class AIError extends Error {
  status?: number;
  retryAfterMs?: number;
  retryable: boolean;

  constructor(message: string, status?: number, retryAfterMs?: number, retryable = true) {
    super(message);
    this.name = "AIError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.retryable = retryable;
  }
}

function statusError(
  provider: string,
  status: number,
  body = "",
  retryAfterHeader: string | null = null,
): AIError {
  let providerMessage = "";
  let retryAfterMs: number | undefined;
  try {
    const payload = JSON.parse(body);
    const error = payload?.error ?? payload;
    providerMessage = [error?.code, error?.status, error?.message]
      .filter(
        (value): value is string | number => typeof value === "string" || typeof value === "number",
      )
      .join(" ");
    const retryDelay = error?.details?.find?.(
      (detail: { retryDelay?: unknown }) => typeof detail.retryDelay === "string",
    )?.retryDelay;
    if (typeof retryDelay === "string") {
      const seconds = Number.parseFloat(retryDelay);
      if (Number.isFinite(seconds)) retryAfterMs = seconds * 1000;
    }
  } catch {
    providerMessage = body;
  }

  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    const retryDate = Date.parse(retryAfterHeader);
    if (Number.isFinite(seconds)) retryAfterMs = seconds * 1000;
    else if (Number.isFinite(retryDate)) retryAfterMs = Math.max(0, retryDate - Date.now());
  }

  const quotaExceeded = /resource_exhausted|quota|billing|daily limit/i.test(providerMessage);
  const retryDelayMs = retryAfterMs;
  if (status === 429 && quotaExceeded && retryDelayMs === undefined) {
    return new AIError(
      `${provider} quota for this API key or model is exhausted. Check the model's request limits and billing in the ${provider} console, then try again after the quota resets.`,
      status,
      undefined,
      false,
    );
  }
  if (status === 429) {
    const retrySeconds = retryDelayMs ? Math.ceil(retryDelayMs / 1000) : undefined;
    const message = retrySeconds
      ? `${provider} is rate-limiting requests. Please try again in about ${retrySeconds} seconds.`
      : `${provider} is rate-limiting requests. Wait a minute before trying again. If this continues, check the model's request limits for your ${provider} account.`;
    const canRetryAutomatically = retryDelayMs !== undefined && retryDelayMs <= 10_000;
    return new AIError(message, status, retryDelayMs, canRetryAutomatically);
  }
  if (status === 402)
    return new AIError(
      "AI usage limit reached. Please add credits or check your API key quota.",
      status,
    );
  if (
    status === 401 &&
    /api key.*(invalid|not valid)|invalid api key|api_key_invalid/i.test(providerMessage)
  ) {
    return new AIError(
      `${provider} rejected the API key. Check that the correct provider key is in .env, then restart the server.`,
      status,
    );
  }
  if (status === 401)
    return new AIError(
      `${provider} authentication failed. Check that the provider key in .env is valid and restart the server.`,
      status,
    );
  if (status === 403)
    return new AIError("Access to the AI service was denied for this request.", status);
  if (status === 400)
    return new AIError(
      "The AI service could not read this input. Please try a clearer image or shorter text.",
      status,
    );
  return new AIError("The AI service could not process this request. Please try again.", status);
}

function isTransientAIError(error: unknown): boolean {
  if (error instanceof AIError) {
    return (
      error.retryable &&
      (error.status === 408 ||
        error.status === 409 ||
        error.status === 429 ||
        (error.status !== undefined && error.status >= 500))
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("busy right now") ||
      message.includes("try again") ||
      message.includes("temporarily") ||
      message.includes("rate limit") ||
      message.includes("429")
    );
  }

  return false;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(provider: string, action: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isTransientAIError(error) || attempt === 2) throw error;
      const waitMs =
        error instanceof AIError && error.retryAfterMs !== undefined
          ? error.retryAfterMs
          : 1500 * (attempt + 1) + Math.floor(Math.random() * 500);
      if (waitMs > 10_000) throw error;
      console.warn(
        `[AI] ${provider} request failed transiently (${attempt + 1}/3); retrying in ${waitMs}ms`,
        error,
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}

/** Local development with your own Google key (set GEMINI_API_KEY in .env). */
async function callGemini(key: string, messages: AIMessage[], json: boolean) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env["GEMINI_MODEL"] || "gemini-3.8-flash",
        messages,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("AI error", res.status, body.slice(0, 500));
    throw statusError("Google AI", res.status, body, res.headers.get("retry-after"));
  }
  const out = await res.json();
  return String(out?.choices?.[0]?.message?.content ?? "");
}

/** Groq's OpenAI-compatible API; the default vision model handles prescription images. */
async function callGroq(key: string, messages: AIMessage[], json: boolean) {
  const model = process.env["GROQ_MODEL"] || "qwen/qwen3.8-27b";
  if (
    messages.some(
      (message) =>
        Array.isArray(message.content) &&
        message.content.some(
          (part) =>
            part.type === "image_url" && part.image_url.url.startsWith("data:application/pdf"),
        ),
    )
  ) {
    throw new AIError(
      "Groq cannot read PDF uploads directly. Save the page as a JPG or PNG image and upload it again.",
      undefined,
      undefined,
      false,
    );
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Groq AI error", res.status, body.slice(0, 500));
    throw statusError("Groq", res.status, body, res.headers.get("retry-after"));
  }

  const out = await res.json();
  return String(out?.choices?.[0]?.message?.content ?? "");
}

/** Hosted app: streamed Responses API call. */
async function callHosted(key: string, messages: AIMessage[], json: boolean) {
  const instructions = messages
    .filter((m) => m.role === "system")
    .map((m) => String(m.content))
    .join("\n\n");
  const input = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const textType = m.role === "assistant" ? "output_text" : "input_text";
      const parts =
        typeof m.content === "string" ? [{ type: "text" as const, text: m.content }] : m.content;
      return {
        role: m.role,
        content: parts.map((p) => {
          if (p.type === "text") return { type: textType, text: p.text };
          if (p.image_url.url.startsWith("data:application/pdf"))
            return { type: "input_file", filename: "document.pdf", file_data: p.image_url.url };
          return { type: "input_image", image_url: p.image_url.url };
        }),
      };
    });
  if (json)
    input.push({
      role: "user",
      content: [{ type: "input_text", text: "Respond with a single valid JSON object only." }],
    });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      ...(json ? { text: { format: { type: "json_object" } } } : {}),
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("AI error", res.status, body.slice(0, 500));
    throw statusError("Lovable AI", res.status, body, res.headers.get("retry-after"));
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta" || ev.type === "response.refusal.done")
            throw new AIError("The AI declined to answer this request.");
          else if (ev.type === "error" || ev.type === "response.failed") {
            const detail = [ev.error?.code, ev.error?.message].filter(Boolean).join(" ");
            if (/resource_exhausted|quota|billing|daily limit/i.test(detail)) {
              throw statusError("Lovable AI", 429, JSON.stringify({ error: detail }));
            }
            throw new AIError("The AI service could not process this request. Please try again.");
          }
        } catch (e) {
          if (e instanceof AIError) throw e;
        }
      }
    }
  }
  return text;
}

export async function callAI(messages: AIMessage[], json: boolean): Promise<string> {
  await ensureEnv();
  const configuredGemini = process.env["GEMINI_API_KEY"];
  const groq =
    process.env["GROQ_API_KEY"] ||
    (configuredGemini?.startsWith("gsk_") ? configuredGemini : undefined);
  const gemini = configuredGemini?.startsWith("gsk_") ? undefined : configuredGemini;
  const lovable = process.env["LOVABLE_API_KEY"];

  const providers = [
    ...(groq
      ? [{ name: "Groq", key: groq, call: (key: string) => callGroq(key, messages, json) }]
      : []),
    ...(gemini
      ? [{ name: "Google AI", key: gemini, call: (key: string) => callGemini(key, messages, json) }]
      : []),
    ...(lovable
      ? [
          {
            name: "Lovable AI",
            key: lovable,
            call: (key: string) => callHosted(key, messages, json),
          },
        ]
      : []),
  ];

  if (providers.length === 0) {
    throw new AIError(
      "AI service is not configured. Add GROQ_API_KEY to the .env file and restart the server.",
    );
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const text = await withRetry(provider.name, () => provider.call(provider.key));
      if (!text.trim()) throw new AIError("The AI returned an empty response. Please try again.");
      return text;
    } catch (error) {
      lastError = error;
      console.warn(
        `[AI] ${provider.name} provider failed, trying next provider if available.`,
        error,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AIError("The AI service could not process this request. Please try again.");
}

export function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new AIError("Could not read the AI response. Please try again.");
  }
}
