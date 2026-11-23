/**
 * Minimal Discord REST client (API v10). REST only, no gateway: setup and
 * feeds run inside the existing app and cron, so no always-on bot process
 * (and no extra hosting) is needed.
 */

import { z } from 'zod';

const API = 'https://discord.com/api/v10';

export class DiscordError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown
  ) {
    super(message);
  }
}

export function discordConfigured(): boolean {
  return Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

export function guildId(): string {
  const id = process.env.DISCORD_GUILD_ID;
  if (!id) throw new Error('DISCORD_GUILD_ID is not set. Add the server ID to Railway variables (right-click the server icon → Copy Server ID).');
  return id;
}

function token(): string {
  const t = process.env.DISCORD_BOT_TOKEN;
  if (!t) throw new Error('DISCORD_BOT_TOKEN is not set. Add the bot token to Railway variables (Developer Portal → your app → Bot → Reset Token).');
  return t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls the Discord API as the bot, waiting out rate limits (up to 4 retries). */
export async function discord<T = unknown>(method: string, path: string, body?: unknown, options: { auth?: boolean; reason?: string } = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'ADApolis (https://adapolis.net, 1.0)' };
    if (options.auth !== false) headers.Authorization = `Bot ${token()}`;
    if (options.reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(options.reason);
    const res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status === 429 && attempt < 4) {
      const retry = z.object({ retry_after: z.number() }).safeParse(await res.json().catch(() => ({})));
      await sleep(Math.ceil((retry.success ? retry.data.retry_after : 1) * 1000) + 100);
      continue;
    }
    if (res.status === 204) return undefined as T;
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = JSON.stringify(json)?.slice(0, 600);
      const hint =
        res.status === 401
          ? ' The bot token is wrong or was reset: update DISCORD_BOT_TOKEN in Railway.'
          : res.status === 403
            ? ' The bot lacks permission: re-invite it with Administrator, and drag its role to the top of Server Settings → Roles.'
            : '';
      // Webhook URLs carry a secret token: never let one into an error message or log.
      const redact = (t: string) => t.replace(/(\/webhooks\/\d+\/)[^/?"\s]+/g, '$1[token]');
      throw new DiscordError(redact(`Discord ${method} ${path} failed: HTTP ${res.status} ${detail}.${hint}`), res.status, json);
    }
    return json as T;
  }
}

/* ---------- Response shapes we rely on ---------- */

export const RoleSchema = z.object({ id: z.string(), name: z.string(), position: z.number(), managed: z.boolean(), permissions: z.string() });
export const ChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  parent_id: z.string().nullable().optional(),
  available_tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});
export const WebhookSchema = z.object({ id: z.string(), name: z.string().nullable(), token: z.string().optional(), channel_id: z.string().nullable().optional() });
export const GuildSchema = z.object({ id: z.string(), name: z.string(), features: z.array(z.string()) });
export const AutoModRuleSchema = z.object({ id: z.string(), name: z.string() });
export const MessageSchema = z.object({ id: z.string(), channel_id: z.string(), webhook_id: z.string().optional(), content: z.string().optional() });

export type Role = z.infer<typeof RoleSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type Webhook = z.infer<typeof WebhookSchema>;

export async function listRoles(): Promise<Role[]> {
  return z.array(RoleSchema).parse(await discord('GET', `/guilds/${guildId()}/roles`));
}

export async function listChannels(): Promise<Channel[]> {
  return z.array(ChannelSchema).parse(await discord('GET', `/guilds/${guildId()}/channels`));
}

export async function channelWebhooks(channelId: string): Promise<Webhook[]> {
  return z.array(WebhookSchema).parse(await discord('GET', `/channels/${channelId}/webhooks`));
}

export const WEBHOOK_NAME = 'ADApolis';
export const AVATAR_URL = 'https://adapolis.net/brand/adapolis-discord-icon-512.png';

/** The ADApolis webhook in a channel, created if missing. */
export async function ensureWebhook(channelId: string): Promise<Webhook & { token: string }> {
  const found = (await channelWebhooks(channelId)).find((w) => w.name === WEBHOOK_NAME && w.token);
  if (found?.token) return { ...found, token: found.token };
  const made = WebhookSchema.parse(await discord('POST', `/channels/${channelId}/webhooks`, { name: WEBHOOK_NAME }, { reason: 'ADApolis feeds' }));
  if (!made.token) throw new Error(`Discord created a webhook in channel ${channelId} without a token; delete it and rerun setup.`);
  return { ...made, token: made.token };
}

export interface Embed {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

export interface WebhookMessage {
  content?: string;
  embeds?: Embed[];
  /** Forum channels: creates a new post with this title */
  thread_name?: string;
  applied_tags?: string[];
  /** Which mentions may ping; defaults to none */
  allowed_mentions?: { parse?: Array<'roles' | 'users' | 'everyone'>; roles?: string[] };
}

/** Posts through a channel's ADApolis webhook (no gateway connection needed). */
export async function postViaWebhook(channelId: string, message: WebhookMessage): Promise<{ id: string; channel_id: string }> {
  const hook = await ensureWebhook(channelId);
  const res = await discord('POST', `/webhooks/${hook.id}/${hook.token}?wait=true`, {
    username: 'ADApolis',
    avatar_url: AVATAR_URL,
    allowed_mentions: { parse: [] },
    ...message,
  }, { auth: false });
  return MessageSchema.parse(res);
}

export const COLORS = { gold: 0xf5b301, violet: 0x8b5cf6, green: 0x10b981, red: 0xf43f5e, slate: 0x64748b } as const;
