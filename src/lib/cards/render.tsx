/**
 * Renders a card front as a PNG (500×700) for Discord embeds, sharing and,
 * later, the minted image. Server-only. Mirrors the on-site card design in
 * the subset of CSS the image renderer (Satori) supports: flexbox, borders,
 * gradients, inline SVG.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { hashDRepId } from '@/lib/utils/avatar';
import { SITE_URL } from '@/lib/site/social';
import { tierFor, type CardSummary } from './types';

const W = 500;
const H = 700;

const FRAMES: Record<string, [string, string, string, string]> = {
  // [frame start, frame middle, frame end, accent text]
  Legend: ['#fef08a', '#f59e0b', '#fde047', '#fcd34d'],
  Silver: ['#f1f5f9', '#94a3b8', '#e2e8f0', '#e2e8f0'],
  Bronze: ['#fdba74', '#c2410c', '#fbbf24', '#fdba74'],
  Holographic: ['#e879f9', '#8b5cf6', '#22d3ee', '#f0abfc'],
  Rare: ['#7dd3fc', '#2563eb', '#38bdf8', '#7dd3fc'],
  Common: ['#e2e8f0', '#94a3b8', '#cbd5e1', '#e2e8f0'],
};

let fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }> | null = null;
let mark: string | null = null;

export async function assets() {
  if (!fonts) {
    const dir = path.join(process.cwd(), 'public', 'fonts');
    const [regular, bold] = await Promise.all([readFile(path.join(dir, 'SpaceGrotesk-400.woff')), readFile(path.join(dir, 'SpaceGrotesk-700.woff'))]);
    const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    fonts = [
      { name: 'Space Grotesk', data: ab(regular), weight: 400, style: 'normal' },
      { name: 'Space Grotesk', data: ab(bold), weight: 700, style: 'normal' },
    ];
  }
  if (!mark) {
    const svg = await readFile(path.join(process.cwd(), 'public', 'brand', 'adapolis-mark-small.svg'));
    mark = `data:image/svg+xml;base64,${svg.toString('base64')}`;
  }
  return { fonts, mark };
}

/** Fetches the DRep's picture as a data URI the renderer can embed; null on anything unusual (then generated art is used). */
export async function artDataUri(image: string | null): Promise<string | null> {
  if (!image) return null;
  const url = image.startsWith('/') ? `${SITE_URL}${image}` : image;
  if (!/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': 'ADApolis card renderer' } });
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    // The renderer reads PNG and JPEG reliably; WebP, SVG and the rest fall back to generated art.
    if (!res.ok || !['image/png', 'image/jpeg', 'image/jpg'].includes(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 3_000_000) return null;
    return `data:${type === 'image/jpg' ? 'image/jpeg' : type};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Satori's gradient parser only takes hex/rgb colours. */
function hslHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function initials(card: CardSummary): string {
  const name = card.name ?? '';
  if (!name || name.startsWith('drep1')) return card.drep_id.slice(-2).toUpperCase();
  return (
    name
      .split(/\s+/)
      .filter((w) => /[A-Za-z0-9]/.test(w))
      .slice(0, 2)
      .map((w) => (w.match(/[A-Za-z0-9]/)?.[0] ?? '').toUpperCase())
      .join('') || card.drep_id.slice(-2).toUpperCase()
  );
}

function sparkPoints(values: Array<number | null>, w: number, h: number): string | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const span = Math.max(...nums) - min || 1;
  const step = w / Math.max(1, values.length - 1);
  return values
    .map((v, i) => (v === null ? null : `${(i * step).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');
}

function formatAda(ada: number): string {
  if (ada >= 1e9) return `${(ada / 1e9).toFixed(1)}B`;
  if (ada >= 1e6) return `${(ada / 1e6).toFixed(1)}M`;
  if (ada >= 1e3) return `${(ada / 1e3).toFixed(1)}K`;
  return `${Math.round(ada)}`;
}

const plate = { background: 'rgba(255,255,255,0.10)', borderTop: '1px solid rgba(255,255,255,0.22)', borderBottom: '1px solid rgba(0,0,0,0.35)' };

export async function renderCardImage(card: CardSummary): Promise<ImageResponse> {
  const [{ fonts: f, mark: m }, art] = await Promise.all([assets(), artDataUri(card.image)]);
  const tier = tierFor(card.rank);
  const [c1, c2, c3, accent] = FRAMES[tier.label] ?? FRAMES.Common;
  const h = hashDRepId(card.drep_id);
  const hue = h % 360;
  const hue2 = (hue + 40 + ((h >>> 9) % 140)) % 360;
  const name = card.name ?? `${card.drep_id.slice(0, 12)}…${card.drep_id.slice(-4)}`;
  const nameSize = name.length <= 18 ? 28 : name.length <= 24 ? 24 : name.length <= 32 ? 21 : 18;
  const gov = sparkPoints(card.govscore_trend, 74, 28);
  const pts = sparkPoints(card.points_trend, 54, 28);
  const delta = card.delta1 === null || Math.abs(card.delta1) < 0.05 ? null : card.delta1;
  const stats: Array<[string, string, string]> = [
    ['POWER', formatAda(card.ada), 'ADA delegated'],
    ['STAMINA', card.participation === null ? '—' : `${Math.round(card.participation * 100)}%`, 'participation'],
    ['XP', String(card.votes_cast), `votes of ${card.votes_eligible}`],
    ['CHARISMA', card.delegators.toLocaleString('en-US'), 'delegators'],
  ];

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', padding: 17, background: `linear-gradient(135deg, ${c1}, ${c2} 55%, ${c3})`, fontFamily: 'Space Grotesk' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            border: '2px solid rgba(255,255,255,0.35)',
            background: 'linear-gradient(180deg, #3d4a73 0%, #2c3659 50%, #222a47 100%)',
            color: 'white',
          }}
        >
          {/* Name bar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', ...plate }}>
            <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>{name}</div>
            {card.rookie && <div style={{ display: 'flex', fontSize: 15, fontWeight: 700, color: '#a7f3d0', background: 'rgba(52,211,153,0.25)', padding: '0 6px' }}>RC</div>}
          </div>

          {/* Art */}
          <div style={{ display: 'flex', position: 'relative', margin: '10px 15px 0', flex: 1, border: '3px solid rgba(255,255,255,0.3)', overflow: 'hidden', background: `linear-gradient(135deg, ${hslHex(hue, 85, 55)}, ${hslHex(hue2, 80, 48)})` }}>
            {art ? (
              // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page
              <img src={art} alt="" width={460} height={330} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', position: 'absolute', left: 40, top: 30, width: 150, height: 150, borderRadius: 999, border: '3px solid rgba(255,255,255,0.3)' }} />
                <div style={{ display: 'flex', position: 'absolute', right: 30, bottom: 20, width: 200, height: 200, borderRadius: 999, border: '3px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', fontSize: 130, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{initials(card)}</div>
              </div>
            )}
            <div style={{ display: 'flex', position: 'absolute', left: 10, top: 10, background: 'rgba(0,0,0,0.6)', color: accent, fontSize: 16, fontWeight: 700, letterSpacing: 2, padding: '3px 10px' }}>
              {`${tier.label.toUpperCase()}${card.rank !== null ? ` · #${card.rank}` : ''}`}
            </div>
            {card.streak > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', right: 10, top: 10, background: 'rgba(0,0,0,0.6)', color: '#fdba74', fontSize: 16, fontWeight: 700, padding: '3px 10px' }}><svg width="14" height="16" viewBox="0 0 24 24" style={{ marginRight: 5, marginTop: 2 }}>
                  <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z" fill="#fdba74" />
                </svg>
                {String(card.streak)}</div>
            )}
            {card.archetype && (
              <div style={{ display: 'flex', position: 'absolute', left: 10, bottom: 8, background: 'rgba(0,0,0,0.65)', color: '#fde68a', fontSize: 17, fontWeight: 700, padding: '3px 10px' }}>
                {card.archetype.label.split(' · ')[0]}
              </div>
            )}
          </div>

          {/* Scores */}
          <div style={{ display: 'flex', gap: 7, padding: '9px 15px 0' }}>
            <div style={{ display: 'flex', flex: 1.3, alignItems: 'flex-end', justifyContent: 'space-between', padding: '6px 10px', ...plate }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, lineHeight: 1, color: card.rank !== null && card.rank <= 3 ? accent : 'white' }}>
                  {card.govscore === null ? '—' : card.govscore.toFixed(1)}
                </div>
                <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#cbd5e1', marginTop: 4 }}>GOVSCORE</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {delta !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 700, color: delta > 0 ? '#6ee7b7' : '#fda4af' }}>
                    <svg width="11" height="10" viewBox="0 0 10 9" style={{ marginRight: 4 }}>
                      <path d={delta > 0 ? 'M5 0L10 9H0Z' : 'M0 0H10L5 9Z'} fill={delta > 0 ? '#6ee7b7' : '#fda4af'} />
                    </svg>
                    {Math.abs(delta).toFixed(1)}
                  </div>
                )}
                {gov && (
                  <svg width="74" height="28" viewBox="0 0 74 28">
                    <polyline points={gov} fill="none" stroke="#ddd6fe" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', justifyContent: 'space-between', padding: '6px 10px', ...plate }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, lineHeight: 1, color: '#fde68a' }}>{String(card.season.points)}</div>
                <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#cbd5e1', marginTop: 4 }}>SEASON PTS</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{card.season.rank ? `#${card.season.rank}` : '—'}</div>
                {pts && (
                  <svg width="54" height="28" viewBox="0 0 54 28">
                    <polyline points={pts} fill="none" stroke="#fcd34d" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Stat plates */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '7px 15px 0' }}>
            {stats.map(([label, value, sub]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', width: 211, padding: '5px 12px', ...plate }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', fontSize: 15, fontWeight: 700, letterSpacing: 1, color: '#cbd5e1' }}>{label}</div>
                  <div style={{ display: 'flex', fontSize: 26, fontWeight: 700 }}>{value}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 14, color: '#94a3b8' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 17px 9px', fontSize: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', color: card.registered ? '#6ee7b7' : '#fca5a5' }}>
              <div style={{ display: 'flex', width: 9, height: 9, borderRadius: 9, marginRight: 6, background: card.registered ? '#34d399' : '#f87171' }} />
              {card.registered ? 'Active' : 'Retired'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#e2e8f0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
              <img src={m} alt="" width={22} height={22} />
              ADApolis
            </div>
            <div style={{ display: 'flex', color: '#cbd5e1' }}>{card.rank !== null ? `No. ${String(card.rank).padStart(3, '0')}` : ''}</div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: f }
  );
}
