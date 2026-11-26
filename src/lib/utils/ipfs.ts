/**
 * Public IPFS gateways, in the order we try them. Since late 2026 ipfs.io and
 * dweb.link answer with a Cloudflare "verify you are human" page, which
 * servers can't pass and visitors find confusing, so a gateway without a
 * challenge (Filebase) comes first. Checked 2026-11-25: Filebase ~0.7 s,
 * Pinata ~6 s, ipfs.io / dweb.link / w3s.link / nftstorage.link failing.
 */
export const IPFS_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
];

/** The gateway used for links and images shown to visitors. */
export const PUBLIC_IPFS_GATEWAY = IPFS_GATEWAYS[0];
