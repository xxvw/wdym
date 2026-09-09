const applicationId = process.env.DISCORD_APPLICATION_ID; const botToken = process.env.DISCORD_BOT_TOKEN; const guildId = process.env.DISCORD_GUILD_ID;
if (!applicationId || !botToken || !guildId) throw new Error("DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and DISCORD_GUILD_ID are required");
const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`, { method: "PUT", headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" }, body: JSON.stringify([{ name: "wdym", description: "スラングやネット用語の意味を説明します", options: [{ name: "term", description: "意味を知りたい単語やフレーズ", type: 3, required: true, max_length: 200 }] }]) });
if (!response.ok) throw new Error(`Discord command registration failed: ${response.status}`); console.log("Guild command registered successfully.");
export {};
