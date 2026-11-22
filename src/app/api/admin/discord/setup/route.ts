import { NextResponse } from 'next/server';
import { cronSecretMismatch, hasCronSecret } from '@/lib/auth/cron-secret';
import { discordConfigured } from '@/lib/discord/rest';
import { setupServer } from '@/lib/discord/setup';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/admin/discord/setup            dry run: lists what would change
 * POST /api/admin/discord/setup?apply=1    makes the changes
 * Requires Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: Request) {
  if (!hasCronSecret(request)) return NextResponse.json({ error: `Unauthorized. ${cronSecretMismatch(request)}` }, { status: 401 });
  if (!discordConfigured())
    return NextResponse.json({ error: 'Discord is not configured: add DISCORD_BOT_TOKEN and DISCORD_GUILD_ID to Railway variables, then redeploy.' }, { status: 503 });
  const apply = new URL(request.url).searchParams.get('apply') === '1';
  try {
    const report = await setupServer({ apply });
    console.log(JSON.stringify({ event: 'discord_setup', apply, actions: report.actions.length, warnings: report.warnings.length }));
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'discord_setup_failed', error: message }));
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
