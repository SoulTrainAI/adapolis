/**
 * Fallback for proposal metadata Koios hasn't resolved yet (meta_json null),
 * which leaves brand-new proposals without a title. Fetches the anchor from a
 * public IPFS gateway and accepts it only if its blake2b-256 hash matches the
 * on-chain anchor hash, so unverified text is never shown.
 */

import { cst } from '@meshsdk/core';

const GATEWAYS = ['https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/', 'https://cloudflare-ipfs.com/ipfs/'];
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 1_000_000;

function candidateUrls(url: string): string[] {
  const ipfs = url.match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/i);
  if (ipfs) return GATEWAYS.map((g) => g + ipfs[1]);
  return /^https:\/\//i.test(url) ? [url] : [];
}

async function fetchBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length <= MAX_BYTES ? buf : null;
  } catch {
    return null;
  }
}

/** Verified anchor JSON, or null if unreachable, too large, not JSON, or the hash doesn't match. */
export async function fetchVerifiedAnchor(url: string, expectedHash: string): Promise<Record<string, unknown> | null> {
  for (const candidate of candidateUrls(url)) {
    const bytes = await fetchBytes(candidate);
    if (!bytes) continue;
    const hash = cst.blake2b.hash(bytes.toString('hex') as Parameters<typeof cst.blake2b.hash>[0], 32);
    if (hash !== expectedHash.toLowerCase()) {
      console.warn(JSON.stringify({ event: 'anchor_hash_mismatch', url, expected: expectedHash, got: hash }));
      return null;
    }
    try {
      const json: unknown = JSON.parse(bytes.toString('utf8'));
      return json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}
