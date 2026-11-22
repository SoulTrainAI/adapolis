/**
 * Turns stored CIP-119 metadata into what the scoreboard may display.
 *
 * Profile content is written by DReps themselves, so every URL is checked
 * here, server-side, before it reaches the page: only https links and images
 * pass (ipfs:// images go through a public gateway). This blocks javascript:
 * links and mixed-content images.
 */

const MAX_LINKS = 8;
const MAX_BIO_CHARS = 1500;
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

export interface DisplayProfile {
  name: string | null;
  image: string | null;
  bio: string | null;
  links: Array<{ label: string; url: string }>;
  doNotList: boolean;
}

export const EMPTY_PROFILE: DisplayProfile = { name: null, image: null, bio: null, links: [], doNotList: false };

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeImageUrl(value: unknown): string | null {
  if (typeof value === 'string' && value.startsWith('ipfs://')) {
    const cid = value.slice('ipfs://'.length).replace(/^ipfs\//, '');
    return /^[A-Za-z0-9/._-]+$/.test(cid) ? `${IPFS_GATEWAY}${cid}` : null;
  }
  return safeHttpsUrl(value);
}

function cleanText(value: unknown, maxChars: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

function hostLabel(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

export function toDisplayProfile(metadata: unknown, fetchStatus: string | null): DisplayProfile {
  if (fetchStatus !== 'ok' || typeof metadata !== 'object' || metadata === null) return EMPTY_PROFILE;
  const m = metadata as Record<string, unknown>;

  const links: DisplayProfile['links'] = [];
  if (Array.isArray(m.references)) {
    for (const ref of m.references) {
      if (links.length >= MAX_LINKS || typeof ref !== 'object' || ref === null) continue;
      const r = ref as Record<string, unknown>;
      const url = safeHttpsUrl(r.uri);
      if (url) links.push({ label: cleanText(r.label, 40) ?? hostLabel(url), url });
    }
  }

  return {
    name: cleanText(m.givenName, 80),
    image: safeImageUrl(m.image),
    bio: cleanText(m.objectives, MAX_BIO_CHARS) ?? cleanText(m.motivations, MAX_BIO_CHARS),
    links,
    doNotList: m.doNotList === true,
  };
}
