import { getRace } from '@/lib/season/race';
import { renderRaceSnapshot } from '@/lib/season/race-snapshot';

export const dynamic = 'force-dynamic';

const TTL_MS = 10 * 60 * 1000;
let cached: { at: number; png: ArrayBuffer } | null = null;
let inflight: Promise<ArrayBuffer> | null = null;

async function snapshot(): Promise<ArrayBuffer> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.png;
  inflight ??= renderRaceSnapshot(await getRace())
    .then((img) => img.arrayBuffer())
    .then((png) => {
      cached = { at: Date.now(), png };
      return png;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * GET /api/cardanathon/image → the Cardanathon as it stands right now, as a
 * 1200×630 PNG (homepage, and the share image for /cardanathon). Drawn at
 * most every 10 minutes; the homepage loads it on every visit.
 */
export async function GET() {
  try {
    const png = await snapshot();
    return new Response(png, { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'race_image_failed', error: message }));
    return new Response(`Couldn't draw the Cardanathon: ${message}. Try again in a minute; if it keeps failing, check the server logs for race_image_failed.`, { status: 500 });
  }
}
