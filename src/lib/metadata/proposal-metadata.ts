/**
 * Fallback for proposal metadata Koios hasn't resolved yet (meta_json null),
 * which leaves brand-new proposals without a title. Fetches the anchor from a
 * public IPFS gateway and accepts it only if its blake2b-256 hash matches the
 * on-chain anchor hash, so unverified text is never shown.
 */

import { cst } from '@meshsdk/core';

const GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://w3s.link/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.blockfrost.dev/ipfs/',
];
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 1_000_000;

function candidateUrls(url: string): string[] {
  const ipfs = url.match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/i);
  if (ipfs) return GATEWAYS.map((g) => g + ipfs[1]);
  return /^https:\/\//i.test(url) ? [url] : [];
}

async function fetchBytes(url: string): Promise<{ bytes: Buffer } | { reason: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
    if (!res.ok) return { reason: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length <= MAX_BYTES ? { bytes: buf } : { reason: `too large (${buf.length} bytes)` };
  } catch (error) {
    return { reason: error instanceof Error ? error.name === 'TimeoutError' ? 'timed out' : error.message : String(error) };
  }
}

export type AnchorResult = { json: Record<string, unknown> } | { failure: string };

/** Verified anchor JSON, or why it couldn't be used (unreachable, too large, not JSON, hash mismatch). */
export async function fetchVerifiedAnchor(url: string, expectedHash: string): Promise<AnchorResult> {
  const candidates = candidateUrls(url);
  if (candidates.length === 0) return { failure: `unsupported anchor URL scheme: ${url.slice(0, 40)}` };
  const reasons: string[] = [];
  for (const candidate of candidates) {
    const got = await fetchBytes(candidate);
    if ('reason' in got) {
      reasons.push(`${new URL(candidate).host}: ${got.reason}`);
      continue;
    }
    const hash = cst.blake2b.hash(got.bytes.toString('hex') as Parameters<typeof cst.blake2b.hash>[0], 32);
    if (hash !== expectedHash.toLowerCase()) {
      return { failure: `hash mismatch (expected ${expectedHash.slice(0, 12)}…, got ${hash.slice(0, 12)}…); not shown because it isn't the document anchored on-chain` };
    }
    try {
      const json: unknown = JSON.parse(got.bytes.toString('utf8'));
      return json && typeof json === 'object' ? { json: json as Record<string, unknown> } : { failure: 'anchor is not a JSON object' };
    } catch {
      return { failure: 'anchor is not valid JSON' };
    }
  }
  return { failure: `no gateway returned it (${reasons.join('; ')})` };
}
