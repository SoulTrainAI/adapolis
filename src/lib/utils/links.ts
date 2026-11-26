import { PUBLIC_IPFS_GATEWAY } from './ipfs';

/**
 * Browser-openable URL for a DRep-published document. Rationales are often
 * ipfs:// anchors, which browsers can't open directly. Anything that isn't
 * http(s) or IPFS is dropped rather than rendered as a link.
 */
export function publicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const ipfs = trimmed.match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/i);
  if (ipfs) return `${PUBLIC_IPFS_GATEWAY}${ipfs[1]}`;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
