import { buildMessages } from "./prompts";
import type { Env, Explanation } from "./types";
const VENICE_URL = "https://api.venice.ai/api/v1/chat/completions";
const TIMEOUT_MS = 15_000;
export class VeniceError extends Error { constructor(public readonly kind: "auth" | "rate_limit" | "upstream" | "timeout" | "invalid_response") { super(`Venice API error: ${kind}`); } }
function parseExplanation(content: unknown): Explanation {
  if (typeof content !== "string" || !content.trim()) throw new VeniceError("invalid_response");
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== "object") throw new VeniceError("invalid_response");
  const value = parsed as Record<string, unknown>;
  if (["meaning", "nuance", "example"].some((key) => typeof value[key] !== "string" || !value[key])) throw new VeniceError("invalid_response");
  return { meaning: value.meaning as string, nuance: value.nuance as string, example: value.example as string, ...(typeof value.warning === "string" && value.warning ? { warning: value.warning } : {}) };
}
export async function explainTerm(term: string, env: Env, fetcher: typeof fetch = fetch): Promise<Explanation> {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(VENICE_URL, { method: "POST", headers: { Authorization: `Bearer ${env.VENICE_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: env.VENICE_MODEL || "qwen3-5-9b", messages: buildMessages(term), max_tokens: 300, temperature: 0.3 }), signal: controller.signal });
    if (response.status === 401) throw new VeniceError("auth");
    if (response.status === 429) throw new VeniceError("rate_limit");
    if (response.status >= 500 || !response.ok) throw new VeniceError("upstream");
    const body: unknown = await response.json();
    const content = (body as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
    return parseExplanation(content);
  } catch (error) {
    if (error instanceof VeniceError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new VeniceError("timeout");
    if (error instanceof SyntaxError) throw new VeniceError("invalid_response");
    throw new VeniceError("upstream");
  } finally { clearTimeout(timeout); }
}
