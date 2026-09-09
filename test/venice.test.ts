import { describe, expect, it } from "vitest";
import { explainTerm, VeniceError } from "../src/venice";
import type { Env } from "../src/types";

const env: Env = { DISCORD_PUBLIC_KEY: "", DISCORD_APPLICATION_ID: "app", VENICE_API_KEY: "key", VENICE_MODEL: "qwen3-5-9b" };
const response = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

describe("Venice client", () => {
  it("parses a structured explanation", async () => {
    const result = await explainTerm("cooked", env, async () => response({ choices: [{ message: { content: JSON.stringify({ meaning: "詰んだ", nuance: "カジュアル", example: "I'm cooked → 詰んだ" }) } }] }));
    expect(result.meaning).toBe("詰んだ");
  });
  it.each([401, 429, 500])("maps HTTP %s safely", async (status) => {
    await expect(explainTerm("sus", env, async () => response({}, { status }))).rejects.toBeInstanceOf(VeniceError);
  });
  it("rejects malformed model output", async () => {
    await expect(explainTerm("sus", env, async () => response({ choices: [{ message: { content: "{}" } }] }))).rejects.toMatchObject({ kind: "invalid_response" });
  });
});
