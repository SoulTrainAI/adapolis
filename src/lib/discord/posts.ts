import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { DiscordError, discord, ensureWebhook, postViaWebhook, type WebhookMessage } from './rest';

const MISSING_TABLE = 'Table discord_posts is missing: run supabase/migrations/012_discord_posts.sql in the Supabase SQL Editor, then retry.';

export async function alreadyPosted(keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const { data, error } = await supabaseAdmin.from('discord_posts').select('key').in('key', keys);
  if (error) throw new Error(error.code === '42P01' ? MISSING_TABLE : `Couldn't read discord_posts: ${error.message}`);
  return new Set((data ?? []).map((r: { key: string }) => r.key));
}

/**
 * Posts once per key. The row is written after Discord accepts the message,
 * so a failure retries next run; a crash between the two could repeat one post.
 */
export async function postOnce(key: string, channelId: string, message: WebhookMessage): Promise<{ id: string; channel_id: string } | null> {
  if ((await alreadyPosted([key])).has(key)) return null;
  const sent = await postViaWebhook(channelId, message);
  const { error } = await supabaseAdmin.from('discord_posts').insert({ key, channel_id: channelId, message_id: sent.id });
  if (error) throw new Error(error.code === '42P01' ? MISSING_TABLE : `Posted ${key} to Discord but couldn't record it: ${error.message}`);
  return sent;
}

/**
 * Brings an already-posted message in line with `message` (same webhook,
 * edited in place). If the message was deleted in Discord, posts it again.
 * `channelId` is where the webhook lives; for a forum post, the thread is the row's channel_id.
 */
export async function refreshPosted(
  key: string,
  channelId: string,
  message: WebhookMessage,
  repost?: WebhookMessage
): Promise<{ status: 'unchanged' | 'updated' | 'stale' } | { status: 'reposted'; id: string; channel_id: string }> {
  const { data, error } = await supabaseAdmin.from('discord_posts').select('channel_id, message_id').eq('key', key).maybeSingle();
  if (error) throw new Error(error.code === '42P01' ? MISSING_TABLE : `Couldn't read discord_posts: ${error.message}`);
  if (!data) return { status: 'unchanged' };
  const row = data as { channel_id: string; message_id: string };
  const hook = await ensureWebhook(channelId);
  const thread = row.channel_id !== channelId ? `?thread_id=${row.channel_id}` : '';
  const path = `/webhooks/${hook.id}/${hook.token}/messages/${row.message_id}${thread}`;
  let current: { content?: string; embeds?: Array<{ title?: string; description?: string }> };
  try {
    current = (await discord('GET', path, undefined, { auth: false })) as typeof current;
  } catch (e) {
    if (!(e instanceof DiscordError) || e.status !== 404) throw e;
    // The webhook can't see it. Ask the bot whether the message still exists before reposting,
    // so a message from an older webhook is never duplicated.
    const exists = await discord('GET', `/channels/${row.channel_id}/messages/${row.message_id}`)
      .then(() => true)
      .catch((err: unknown) => {
        if (err instanceof DiscordError && err.status === 404) return false;
        throw err;
      });
    if (exists) return { status: 'stale' };
    const sent = await postViaWebhook(channelId, repost ?? message);
    const { error: upsertError } = await supabaseAdmin
      .from('discord_posts')
      .upsert({ key, channel_id: sent.channel_id, message_id: sent.id, posted_at: new Date().toISOString() });
    if (upsertError) throw new Error(`Reposted ${key} but couldn't record it: ${upsertError.message}`);
    return { status: 'reposted', ...sent };
  }
  const want = { content: message.content ?? '', embeds: (message.embeds ?? []).map((e) => [e.title ?? '', e.description ?? '']) };
  const have = { content: current.content ?? '', embeds: (current.embeds ?? []).map((e) => [e.title ?? '', e.description ?? '']) };
  if (JSON.stringify(want) === JSON.stringify(have)) return { status: 'unchanged' };
  await discord('PATCH', path, { content: message.content ?? '', embeds: message.embeds ?? [] }, { auth: false });
  return { status: 'updated' };
}
