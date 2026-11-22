/**
 * Turns stored CIP-119 metadata into what the scoreboard may display.
 *
 * Profile content is written by DReps themselves, so every URL is checked
 * here, server-side, before it reaches the page: only https links and images
 * pass (ipfs:// images go through a public gateway). This blocks javascript:
 * links and mixed-content images. Images embedded as data URIs are served
 * through /api/dreps/<id>/image instead of being copied into every page.
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

export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Raster images only: an SVG data URI could carry script. */
const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/;
const DATA_IMAGE_PREFIX = /^data:image\/(png|jpe?g|gif|webp);base64,/;
const MAX_DATA_IMAGE_BYTES = 1_000_000;

/** CIP-119 images are ImageObjects ({ contentUrl }); older profiles use a bare string. */
export function imageSource(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null) {
    const v = (value as Record<string, unknown>).contentUrl;
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>)['@value'] === 'string') return ((v as Record<string, string>)['@value']).trim();
  }
  return null;
}

/** The decoded bytes of an embedded profile image, or null if it isn't one we serve. */
export function embeddedImage(metadata: unknown): { type: string; bytes: Buffer } | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const src = imageSource((metadata as Record<string, unknown>).image);
  if (!src || src.length > MAX_DATA_IMAGE_BYTES * 1.4 || !DATA_IMAGE.test(src)) return null;
  const [head, data] = src.split(',', 2);
  const bytes = Buffer.from(data.replace(/\s/g, ''), 'base64');
  return bytes.length > 0 && bytes.length <= MAX_DATA_IMAGE_BYTES ? { type: head.slice(5, head.indexOf(';')), bytes } : null;
}

export function safeImageUrl(raw: unknown, drepId?: string): string | null {
  const value = imageSource(raw);
  // Embedded images are checked in full when served; here the prefix is enough to route them there.
  if (value && drepId && DATA_IMAGE_PREFIX.test(value)) return `/api/dreps/${drepId}/image`;
  if (typeof value === 'string' && value.startsWith('ipfs://')) {
    const cid = value.slice('ipfs://'.length).replace(/^ipfs\//, '');
    return /^[A-Za-z0-9/._-]+$/.test(cid) ? `${IPFS_GATEWAY}${cid}` : null;
  }
  return safeHttpsUrl(value);
}

export function cleanText(value: unknown, maxChars: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

export function hostLabel(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

export function toDisplayProfile(metadata: unknown, fetchStatus: string | null, drepId?: string): DisplayProfile {
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
    image: safeImageUrl(m.image, drepId),
    bio: cleanText(m.objectives, MAX_BIO_CHARS) ?? cleanText(m.motivations, MAX_BIO_CHARS),
    links,
    doNotList: m.doNotList === true,
  };
}
