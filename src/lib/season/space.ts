/**
 * Deep space for the Cardanathon: nebulae, a galaxy band running toward the
 * destination, layered stars, and the destination planet (Planet Cardano, a
 * land of good governance) in the top-right corner. Pure SVG, no text, so the
 * same picture draws on the site and in a minted PNG.
 *
 * The planet carries no logo of its own. Pass `logo` (a data URI or URL of an
 * official, licensed mark) to place one on it.
 */

export interface PlanetSpec {
  cx: number;
  cy: number;
  r: number;
}

export interface SpaceOptions {
  width: number;
  height: number;
  /** Makes the sky unique and repeatable (same seed, same sky). */
  seed: string;
  planet: PlanetSpec;
  logo?: string | null;
  /** Prefix for SVG ids, so several skies can share a page. */
  id?: string;
  /** Density of stars (1 = default). */
  stars?: number;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/** Star colours: mostly white, some blue-white, a few warm. */
const TINTS = ['#ffffff', '#ffffff', '#ffffff', '#dbeafe', '#c7d2fe', '#e0f2fe', '#fef3c7', '#fde68a'];

function gauss(r: () => number): number {
  return (r() + r() + r() - 1.5) / 1.5;
}

/** The sky, everything except the planet, as SVG markup (defs included). */
function sky(o: SpaceOptions, p: string, r: () => number): string {
  const { width: W, height: H } = o;
  const area = (W * H) / (900 * 600);
  const density = (o.stars ?? 1) * Math.max(0.35, area);
  const seedN = Math.floor(r() * 1000);
  const base = 0.9 / Math.max(W, H);

  // The galaxy band runs from the bottom-left toward the planet.
  const bx0 = -0.1 * W;
  const by0 = 1.05 * H;
  const bx1 = o.planet.cx;
  const by1 = o.planet.cy;
  const ang = (Math.atan2(by1 - by0, bx1 - bx0) * 180) / Math.PI;
  const len = Math.hypot(bx1 - bx0, by1 - by0);
  const along = (t: number, spread: number) => {
    const nx = -(by1 - by0) / len;
    const ny = (bx1 - bx0) / len;
    const g = gauss(r) * spread;
    return [bx0 + (bx1 - bx0) * t + nx * g, by0 + (by1 - by0) * t + ny * g];
  };

  const defs =
    `<radialGradient id="${p}bg" cx="0.32" cy="0.72" r="0.95"><stop offset="0" stop-color="#101845"/><stop offset="0.45" stop-color="#070b26"/><stop offset="1" stop-color="#02030c"/></radialGradient>` +
    `<filter id="${p}cloud" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${(base * 2.2).toFixed(5)} ${(base * 3.4).toFixed(5)}" numOctaves="5" seed="${seedN}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.4 -1.05"/></filter>` +
    `<filter id="${p}wisp" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="${(base * 4.5).toFixed(5)} ${(base * 9).toFixed(5)}" numOctaves="4" seed="${seedN + 3}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 3.2 -1.2"/></filter>` +
    `<filter id="${p}dust" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${(base * 7).toFixed(5)}" numOctaves="3" seed="${seedN + 7}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0.02  0 0 0 2.2 -1.25"/></filter>` +
    `<filter id="${p}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${f(Math.max(W, H) * 0.035)}"/></filter>` +
    `<filter id="${p}glint" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter>` +
    `<radialGradient id="${p}n1"><stop offset="0" stop-color="#a78bfa" stop-opacity="0.95"/><stop offset="0.5" stop-color="#7c3aed" stop-opacity="0.45"/><stop offset="1" stop-color="#4c1d95" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}n2"><stop offset="0" stop-color="#67e8f9" stop-opacity="0.85"/><stop offset="0.5" stop-color="#0ea5e9" stop-opacity="0.35"/><stop offset="1" stop-color="#0369a1" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}n3"><stop offset="0" stop-color="#f9a8d4" stop-opacity="0.7"/><stop offset="0.6" stop-color="#db2777" stop-opacity="0.25"/><stop offset="1" stop-color="#9d174d" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}band"><stop offset="0" stop-color="#e0e7ff" stop-opacity="0.1"/><stop offset="0.5" stop-color="#a5b4fc" stop-opacity="0.04"/><stop offset="1" stop-color="#a5b4fc" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}star"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.25" stop-color="#e0f2fe" stop-opacity="0.55"/><stop offset="1" stop-color="#e0f2fe" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}gal"><stop offset="0" stop-color="#fff7ed" stop-opacity="0.9"/><stop offset="0.2" stop-color="#fbcfe8" stop-opacity="0.35"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></radialGradient>` +
    // Nebula colour shows only where the noise is dense: a cloud, not a blob.
    `<mask id="${p}m1"><rect width="${W}" height="${H}" fill="#fff" filter="url(#${p}cloud)"/></mask>` +
    `<mask id="${p}m2"><rect width="${W}" height="${H}" fill="#fff" filter="url(#${p}wisp)"/></mask>` +
    `<radialGradient id="${p}vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>`;

  // Nebulae: violet low-left, teal toward the middle, a touch of rose near the planet.
  const neb = (cx: number, cy: number, rx: number, ry: number, rot: number, fill: string) =>
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(cx)} ${f(cy)})" fill="url(#${fill})"/>`;
  const clouds =
    `<g mask="url(#${p}m1)" opacity="0.45">` +
    neb(W * (0.18 + r() * 0.1), H * (0.68 + r() * 0.1), W * 0.42, H * 0.38, -20, `${p}n1`) +
    neb(W * (0.5 + r() * 0.1), H * (0.42 + r() * 0.1), W * 0.36, H * 0.3, -32, `${p}n2`) +
    neb(o.planet.cx - W * 0.18, o.planet.cy + H * 0.22, W * 0.28, H * 0.22, -35, `${p}n3`) +
    `</g>` +
    // Fine filaments over the clouds, brighter at the band's heart.
    `<g mask="url(#${p}m2)" opacity="0.22">` +
    neb(W * 0.3, H * 0.62, W * 0.34, H * 0.26, -25, `${p}n1`) +
    neb(W * 0.55, H * 0.45, W * 0.26, H * 0.2, -32, `${p}n2`) +
    `</g>` +
    // A soft glow under the clouds so they sit in light, not on black.
    `<g filter="url(#${p}soft)" opacity="0.28">` +
    neb(W * 0.22, H * 0.72, W * 0.3, H * 0.22, -20, `${p}n1`) +
    neb(W * 0.55, H * 0.45, W * 0.22, H * 0.16, -32, `${p}n2`) +
    `</g>` +
    `<rect width="${W}" height="${H}" filter="url(#${p}dust)" opacity="0.8"/>`;

  const band = `<ellipse cx="${f((bx0 + bx1) / 2)}" cy="${f((by0 + by1) / 2)}" rx="${f(len * 0.62)}" ry="${f(Math.min(W, H) * 0.16)}" transform="rotate(${ang.toFixed(1)} ${f((bx0 + bx1) / 2)} ${f((by0 + by1) / 2)})" fill="url(#${p}band)"/>`;

  // A small far-off spiral galaxy for depth.
  const gx = W * (0.08 + r() * 0.2);
  const gy = H * (0.12 + r() * 0.18);
  const gs = Math.min(W, H) * 0.05;
  const galaxy =
    `<g transform="rotate(${Math.round(-30 - r() * 40)} ${f(gx)} ${f(gy)})" opacity="0.35">` +
    `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="${f(gs * 1.6)}" ry="${f(gs * 0.45)}" fill="url(#${p}gal)"/>` +
    `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="${f(gs * 0.35)}" ry="${f(gs * 0.14)}" fill="#fff7ed" opacity="0.8"/>` +
    `</g>`;

  let stars = '';
  // Dust of tiny stars, thicker along the band.
  const tiny = Math.round(240 * density);
  for (let i = 0; i < tiny; i++) {
    const [x, y] = i % 3 === 0 ? along(r(), Math.min(W, H) * 0.12) : [r() * W, r() * H];
    stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${(0.25 + r() * 0.35).toFixed(2)}" fill="${TINTS[Math.floor(r() * TINTS.length)]}" opacity="${(0.15 + r() * 0.45).toFixed(2)}"/>`;
  }
  // Medium stars with a soft halo.
  const mid = Math.round(16 * density);
  for (let i = 0; i < mid; i++) {
    const x = r() * W;
    const y = r() * H;
    const s = 0.55 + r() * 0.5;
    stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 2.6)}" fill="url(#${p}star)" opacity="0.25"/><circle cx="${f(x)}" cy="${f(y)}" r="${s.toFixed(2)}" fill="${TINTS[Math.floor(r() * TINTS.length)]}" opacity="0.75"/>`;
  }
  // A few bright stars with diffraction spikes.
  const bright = Math.max(1, Math.round(2 * Math.sqrt(density)));
  for (let i = 0; i < bright; i++) {
    const x = W * (0.05 + r() * 0.9);
    const y = H * (0.05 + r() * 0.9);
    // Keep the planet's face clear.
    if (Math.hypot(x - o.planet.cx, y - o.planet.cy) < o.planet.r * 1.3) continue;
    const L = Math.min(W, H) * (0.01 + r() * 0.012);
    const tint = TINTS[3 + Math.floor(r() * 3)];
    stars +=
      `<g opacity="${(0.4 + r() * 0.2).toFixed(2)}">` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(L * 0.55)}" fill="url(#${p}star)"/>` +
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(L)}" ry="0.55" fill="${tint}" filter="url(#${p}glint)"/>` +
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="0.55" ry="${f(L)}" fill="${tint}" filter="url(#${p}glint)"/>` +
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(L)}" ry="0.35" fill="#fff"/>` +
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="0.35" ry="${f(L)}" fill="#fff"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="0.9" fill="#fff"/>` +
      `</g>`;
  }

  return `<defs>${defs}</defs><rect width="${W}" height="${H}" fill="url(#${p}bg)"/>${band}${clouds}${galaxy}${stars}`;
}

/** Darkened corners, drawn last so everything sits inside the frame. */
export function vignette(W: number, H: number, p: string): string {
  return `<rect width="${W}" height="${H}" fill="url(#${p}vig)"/>`;
}

/** The destination planet with halo, atmosphere, surface and night side. */
export function planetMarkup(pl: PlanetSpec, p: string, seed: number, logo?: string | null): string {
  const { cx, cy, r } = pl;
  const L = r * 1.05;
  return (
    `<defs>` +
    `<radialGradient id="${p}halo"><stop offset="0.46" stop-color="#60a5fa" stop-opacity="0.5"/><stop offset="0.6" stop-color="#2563eb" stop-opacity="0.18"/><stop offset="1" stop-color="#1e3a8a" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}sphere" cx="0.36" cy="0.32" r="0.78"><stop offset="0" stop-color="#9ec5ff"/><stop offset="0.2" stop-color="#3b7bff"/><stop offset="0.5" stop-color="#0d47d9"/><stop offset="0.8" stop-color="#0033ad"/><stop offset="1" stop-color="#001a5c"/></radialGradient>` +
    `<radialGradient id="${p}shade" cx="0.22" cy="0.18" r="1.05"><stop offset="0.34" stop-color="#01030f" stop-opacity="0"/><stop offset="0.6" stop-color="#01030f" stop-opacity="0.72"/><stop offset="0.82" stop-color="#01030f" stop-opacity="0.96"/></radialGradient>` +
    `<clipPath id="${p}ball"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/></clipPath>` +
    `<filter id="${p}surf" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${(1.6 / r).toFixed(4)} ${(4.2 / r).toFixed(4)}" numOctaves="5" seed="${seed % 997}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 3 -1.45"/></filter>` +
    `<filter id="${p}sea" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${(1.1 / r).toFixed(4)}" numOctaves="4" seed="${(seed % 997) + 11}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0.08  0 0 0 0 0.3  0 0 0 2.4 -1.1"/></filter>` +
    `<filter id="${p}rim" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f(r * 0.05)}"/></filter>` +
    `</defs>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 1.8)}" fill="url(#${p}halo)" opacity="0.7"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${p}sphere)"/>` +
    `<g clip-path="url(#${p}ball)">` +
    `<rect x="${f(cx - r)}" y="${f(cy - r)}" width="${f(r * 2)}" height="${f(r * 2)}" filter="url(#${p}sea)" opacity="0.7"/>` +
    `<rect x="${f(cx - r)}" y="${f(cy - r)}" width="${f(r * 2)}" height="${f(r * 2)}" filter="url(#${p}surf)" opacity="0.55" transform="rotate(-12 ${f(cx)} ${f(cy)})"/>` +
    (logo ? `<image href="${logo}" x="${f(cx - L / 2)}" y="${f(cy - L / 2)}" width="${f(L)}" height="${f(L)}" opacity="0.92" preserveAspectRatio="xMidYMid meet"/>` : '') +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${p}shade)"/>` +
    `</g>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.985)}" fill="none" stroke="#7dd3fc" stroke-width="${f(r * 0.07)}" opacity="0.55" filter="url(#${p}rim)"/>` +
    `<path d="M${f(cx - r * 0.93)},${f(cy - r * 0.37)} A${f(r)},${f(r)} 0 0 1 ${f(cx + r * 0.37)},${f(cy - r * 0.93)}" fill="none" stroke="#e0f2fe" stroke-width="${f(Math.max(1, r * 0.018))}" opacity="0.8" stroke-linecap="round"/>`
  );
}

/** The scene in layers, so callers can draw between them (e.g. flight paths above the planet, under the vignette). */
export function spaceLayers(o: SpaceOptions): { sky: string; planet: string; vignette: string } {
  const p = o.id ?? 'sp';
  const seed = hash(o.seed);
  const r = rng(seed);
  return { sky: sky(o, p, r), planet: planetMarkup(o.planet, `${p}p`, seed, o.logo), vignette: vignette(o.width, o.height, p) };
}

/** The whole scene as a standalone SVG document. */
export function spaceScene(o: SpaceOptions): string {
  const l = spaceLayers(o);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}" viewBox="0 0 ${o.width} ${o.height}">${l.sky}${l.planet}${l.vignette}</svg>`;
}

/** Where to put the planet so a climb ending at (x, y) arrives just short of it, up and to the right. */
export function planetNear(x: number, y: number, r: number, gap: number, angleDeg = -48): PlanetSpec {
  const a = (angleDeg * Math.PI) / 180;
  return { cx: x + Math.cos(a) * (r + gap), cy: y + Math.sin(a) * (r + gap), r };
}
