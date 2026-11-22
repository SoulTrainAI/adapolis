import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { postViaWebhook, type WebhookMessage } from './rest';

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
