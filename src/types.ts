export interface Env { DISCORD_PUBLIC_KEY: string; DISCORD_APPLICATION_ID: string; DISCORD_BOT_TOKEN?: string; VENICE_API_KEY: string; VENICE_MODEL?: string; ENVIRONMENT?: string; }
export interface DiscordInteraction { type: number; application_id: string; token: string; data?: { name?: string; options?: Array<{ name: string; value?: unknown }> }; }
export interface Explanation { meaning: string; nuance: string; example: string; warning?: string; }
export interface DiscordEmbed { title: string; fields: Array<{ name: string; value: string; inline: false }>; }
