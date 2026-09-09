import { createEmbed, getTerm, sendFollowUp, verifySignature } from "./discord";
import { explainTerm } from "./venice";
import type { DiscordInteraction, Env } from "./types";
const ERROR_MESSAGE = "今ちょっと意味を調べられませんでした。少し時間を置いてもう一度試してください。";
export default { async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "POST") return new Response("Not Found", { status: 404 });
  if (!(await verifySignature(request, env.DISCORD_PUBLIC_KEY))) return new Response("Invalid request signature", { status: 401 });
  let interaction: DiscordInteraction; try { interaction = await request.json() as DiscordInteraction; } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (interaction.type === 1) return Response.json({ type: 1 });
  if (interaction.type !== 2 || interaction.data?.name !== "wdym") return new Response("Unsupported interaction", { status: 400 });
  const term = getTerm(interaction); if (!term) return Response.json({ type: 4, data: { content: "単語またはフレーズを入力してください。", flags: 64 } });
  ctx.waitUntil((async () => { const started = Date.now(); try { const explanation = await explainTerm(term, env); await sendFollowUp(interaction, env, { embeds: [createEmbed(term, explanation)] }); console.log(JSON.stringify({ event: "wdym_success", duration_ms: Date.now() - started })); } catch (error) { console.error(JSON.stringify({ event: "wdym_failure", error: error instanceof Error ? error.message : "unknown", duration_ms: Date.now() - started })); await sendFollowUp(interaction, env, { content: ERROR_MESSAGE }); } })());
  return Response.json({ type: 5 });
} };
