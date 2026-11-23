import { getCards } from '@/lib/cards/data';
import { renderCardImage } from '@/lib/cards/render';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cards/<drep id>/image → the card front as a 500×700 PNG.
 * ?download=1 saves it as a file. Used by Discord embeds and share buttons.
 */
export async function GET(request: Request, { params }: { params: { drepId: string } }) {
  if (!/^drep1[02-9ac-hj-np-z]{20,100}$/.test(params.drepId)) return new Response('Expected a DRep ID (drep1…).', { status: 400 });
  const card = (await getCards()).cards.find((c) => c.drep_id === params.drepId);
  if (!card) return new Response('No card for that DRep.', { status: 404 });
  try {
    const image = await renderCardImage(card);
    const headers = new Headers(image.headers);
    headers.set('Cache-Control', 'public, max-age=21600');
    if (new URL(request.url).searchParams.get('download') === '1') {
      const slug = (card.name ?? card.drep_id).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'drep';
      headers.set('Content-Disposition', `attachment; filename="adapolis-${slug}.png"`);
    }
    return new Response(image.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'card_image_failed', drep_id: params.drepId, error: message }));
    return new Response(`Couldn't draw this card: ${message}`, { status: 500 });
  }
}
