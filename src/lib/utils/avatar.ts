/**
 * Avatar generation utilities
 * Generates deterministic gradient avatars based on DRep ID
 */

export function hashDRepId(drepId: string): number {
  let hash = 0;
  for (let i = 0; i < drepId.length; i++) {
    const char = drepId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

interface AvatarGradient {
  from: string;
  to: string;
  bgClass: string;
}

export function getAvatarGradient(drepId: string): AvatarGradient {
  const hash = hashDRepId(drepId);
  const colorPalettes = [
    { from: '#8b5cf6', to: '#ec4899', bgClass: 'from-violet-500 to-pink-500' },
    { from: '#06b6d4', to: '#0ea5e9', bgClass: 'from-cyan-500 to-sky-500' },
    { from: '#10b981', to: '#06b6d4', bgClass: 'from-emerald-500 to-cyan-500' },
    { from: '#f59e0b', to: '#ef4444', bgClass: 'from-amber-500 to-red-500' },
    { from: '#6366f1', to: '#8b5cf6', bgClass: 'from-indigo-500 to-violet-500' },
    { from: '#14b8a6', to: '#10b981', bgClass: 'from-teal-500 to-emerald-500' },
    { from: '#f97316', to: '#f59e0b', bgClass: 'from-orange-500 to-amber-500' },
    { from: '#d946ef', to: '#ec4899', bgClass: 'from-fuchsia-500 to-pink-500' },
  ];

  const palette = colorPalettes[hash % colorPalettes.length];
  return palette;
}

export function generateAvatarSVG(drepId: string): string {
  const gradient = getAvatarGradient(drepId);
  const initials = drepId.substring(0, 2).toUpperCase();

  return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.from};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradient.to};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad)" />
      <text x="50" y="50" font-size="40" font-weight="bold" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial, sans-serif">
        ${initials}
      </text>
    </svg>
  `;
}

export function getAvatarDataUri(drepId: string): string {
  const svg = generateAvatarSVG(drepId);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}
