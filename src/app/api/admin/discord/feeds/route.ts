import { NextResponse } from 'next/server';
import { hasCronSecret } from '@/lib/auth/cron-secret';
import { discordConfigured } from '@/lib/discord/rest';
import { runFeeds } from '@/lib/discord/feeds';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/admin/discord/feeds            preview: lists what the next feed run would post
 * POST /api/admin/discord/feeds?apply=1    posts it now
 * Requires Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: Request) {
  if (!hasCronSecret(request)) return NextResponse.json({ error: 'Unauthorized: send Authorization: Bearer <CRON_SECRET>.' }, { status: 401 });
  if (!discordConfigured())
    return NextResponse.json({ error: 'Discord is not configured: add DISCORD_BOT_TOKEN and DISCORD_GUILD_ID to Railway variables, then redeploy.' }, { status: 503 });
  const apply = new URL(request.url).searchParams.get('apply') === '1';
  try {
    return NextResponse.json(await runFeeds({ apply }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'discord_feeds_failed', error: message }));
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
