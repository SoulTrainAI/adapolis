/**
 * Fetches a vote's rationale document ourselves when Koios couldn't (its
 * meta_json is null after an IPFS timeout or a non-standard document), so a
 * DRep who did explain their vote isn't shown as silent.
 *
 * The URL comes from the chain, i.e. from anyone, so the fetch is fenced:
 * https or IPFS only, no IP literals or internal hostnames, a short timeout
 * and a size cap.
 */

import { blake2bHex } from 'blakejs';
import { IPFS_GATEWAYS } from '@/lib/utils/ipfs';

const TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024;

export interface AnchorDocument {
  json: unknown | null;
  text: string;
  /** null when no on-chain hash was available to check against. */
  hashMatches: boolean | null;
}

export function candidateUrls(anchorUrl: string): string[] {
  const trimmed = anchorUrl.trim();
  const ipfs = trimmed.match(/^ipfs:\/\/(?:ipfs\/)?([A-Za-z0-9]+(?:\/[^\s?#]*)?)$/i);
  if (ipfs) return IPFS_GATEWAYS.map((g) => g + ipfs[1]);
  return isSafeHttpsUrl(trimmed) ? [trimmed] : [];
}

export function isSafeHttpsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.internal') || host.endsWith('.local') || host === 'localhost') return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) return false;
  return true;
}

async function readCapped(res: Response): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES || !res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export function parseAnchorBytes(bytes: Uint8Array, expectedHash: string | null): AnchorDocument {
  const text = new TextDecoder().decode(bytes);
  let json: unknown | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const hashMatches = expectedHash ? blake2bHex(bytes, undefined, 32) === expectedHash.toLowerCase() : null;
  return { json, text, hashMatches };
}

/** Follows up to 3 redirects by hand so every hop passes the same URL fence (some IPFS gateways redirect to subdomains). */
async function safeFetch(start: string): Promise<Response | null> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'manual' });
    if (res.status < 300 || res.status >= 400) return res;
    const next = res.headers.get('location');
    if (!next) return null;
    url = new URL(next, url).toString();
    if (!isSafeHttpsUrl(url)) return null;
  }
  return null;
}

export async function fetchAnchor(anchorUrl: string, expectedHash: string | null): Promise<AnchorDocument | null> {
  for (const url of candidateUrls(anchorUrl)) {
    try {
      const res = await safeFetch(url);
      if (!res || !res.ok) continue;
      const bytes = await readCapped(res);
      if (bytes) return parseAnchorBytes(bytes, expectedHash);
    } catch (error) {
      console.error(
        JSON.stringify({ event: 'rationale_anchor_fetch_failed', url, error: error instanceof Error ? error.message : String(error) })
      );
    }
  }
  return null;
}
