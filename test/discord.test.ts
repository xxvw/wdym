import { describe, expect, it } from "vitest";
import { createEmbed, getTerm } from "../src/discord";
import type { DiscordInteraction } from "../src/types";

describe("Discord helpers", () => {
  it("extracts and trims term", () => expect(getTerm({ type: 2, application_id: "a", token: "t", data: { name: "wdym", options: [{ name: "term", value: " touch grass " }] } })).toBe("touch grass"));
  it("rejects empty and overlong terms", () => {
    const base: DiscordInteraction = { type: 2, application_id: "a", token: "t", data: { name: "wdym", options: [{ name: "term", value: "" }] } };
    expect(getTerm(base)).toBeNull();
    expect(getTerm({ ...base, data: { ...base.data, options: [{ name: "term", value: "x".repeat(201) }] } })).toBeNull();
  });
  it("creates required fields and optional warning", () => {
    const embed = createEmbed("cooked", { meaning: "詰んだ", nuance: "カジュアル", example: "I'm cooked → 詰んだ", warning: "注意" });
    expect(embed.fields.map((field) => field.name)).toEqual(["意味", "ニュアンス", "例", "注意"]);
  });
});
