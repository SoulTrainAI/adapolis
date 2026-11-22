import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { embeddedImage } from '@/lib/metadata/profile-display';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dreps/<drep id>/image
 * Serves a profile image the DRep embedded in its CIP-119 metadata as a data
 * URI (PNG, JPEG, GIF or WebP only, up to 1 MB), so pages can link to it.
 */
export async function GET(_request: Request, { params }: { params: { drepId: string } }) {
  if (!/^drep1[02-9ac-hj-np-z]{20,100}$/.test(params.drepId)) return new Response('Expected a DRep ID (drep1…).', { status: 400 });
  const { data, error } = await supabaseAdmin.from('dreps').select('metadata').eq('drep_id', params.drepId).maybeSingle();
  if (error) return new Response(`Couldn't read this DRep's metadata: ${error.message}`, { status: 503 });
  const image = embeddedImage((data as { metadata: unknown } | null)?.metadata ?? null);
  if (!image) return new Response('This DRep has no embedded profile image.', { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      'Content-Type': image.type === 'image/jpg' ? 'image/jpeg' : image.type,
      'Cache-Control': 'public, max-age=21600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
