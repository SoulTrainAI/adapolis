/**
 * Renders a DRep All-Star Season Trophy as a 1000×1250 PNG: the title, the
 * season's mountain with the winner's climb lit in their medal colour, and a
 * plaque naming the winner. The same image is shown on the site and, once
 * minting is built, minted. Server-only (Satori via next/og).
 */

import { ImageResponse } from 'next/og';
import { format } from 'date-fns';
import { artDataUri, assets } from '@/lib/cards/render';
import { MEDALS, trophyArt, trophyTitle } from './trophy';
import type { SeasonTrophies, TrophyWinner } from './trophy-data';

const W = 1000;
const H = 1250;
const ART_W = 904;
const ART_H = 690;

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => /[A-Za-z0-9]/.test(w))
      .slice(0, 2)
      .map((w) => (w.match(/[A-Za-z0-9]/)?.[0] ?? '').toUpperCase())
      .join('') || '★'
  );
}

export async function renderTrophyImage(season: SeasonTrophies, winner: TrophyWinner): Promise<ImageResponse> {
  const [{ fonts, mark }, photo] = await Promise.all([assets(), winner.kind === 'drep' ? artDataUri(winner.image) : Promise.resolve(null)]);
  const m = MEDALS[winner.medal];
  const svg = trophyArt({
    width: ART_W,
    height: ART_H,
    climbers: winner.kind === 'drep' ? season.drep_climbers : season.team_climbers,
    winner: winner.climber_id,
    medal: winner.medal,
    starts_at: season.starts_at,
    ends_at: season.ends_at,
    t: season.until,
    seed: `${season.key}:${winner.kind}:${winner.place}`,
  });
  const art = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const who = winner.kind === 'drep' ? 'DRep' : 'Team';
  const field = winner.kind === 'drep' ? season.drep_field : season.team_field;
  const nameSize = winner.name.length <= 18 ? 50 : winner.name.length <= 28 ? 40 : 32;
  const dates = `${format(new Date(season.starts_at * 1000), 'MMM d')} – ${format(new Date(season.ends_at * 1000), 'MMM d, yyyy')}`;
  const test = season.sample || season.season_number === 0;
  const badge = season.sample ? 'SAMPLE · NEVER MINTED' : test ? 'PRESEASON TEST · NEVER MINTED' : season.final ? '1 OF 1' : 'PREVIEW · SEASON IN PLAY';
  const badgeColor = season.final && !test ? m.light : '#fbbf24';
  const pts = Number.isInteger(winner.points) ? String(winner.points) : winner.points.toFixed(1);

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', padding: 18, background: `linear-gradient(135deg, ${m.light}, ${m.deep} 55%, ${m.light})`, fontFamily: 'Space Grotesk' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '30px 30px 26px',
            border: '2px solid rgba(255,255,255,0.4)',
            background: 'linear-gradient(180deg, #0b1024 0%, #151a3d 60%, #1e1b4b 100%)',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 700, color: '#cbd5e1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
              <img src={mark} alt="" width={40} height={40} style={{ marginRight: 12 }} />
              ADApolis
            </div>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 3, color: badgeColor, border: `2px solid ${badgeColor}`, borderRadius: 999, padding: '4px 16px' }}>
              {badge}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 22 }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: 8, color: m.light }}>DREP ALL-STAR</div>
            <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, lineHeight: 1.05 }}>{trophyTitle(season.label).replace('DRep All-Star ', '')}</div>
            <div
              style={{
                display: 'flex',
                marginTop: 12,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 4,
                color: '#0b1024',
                background: `linear-gradient(90deg, ${m.light}, ${m.deep})`,
                borderRadius: 999,
                padding: '6px 26px',
              }}
            >
              {`${m.label.toUpperCase()} · ${ordinal(winner.place).toUpperCase()} ${who.toUpperCase()}`}
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 24, borderRadius: 22, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.18)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
            <img src={art} alt="" width={ART_W} height={ART_H} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 24, padding: '16px 22px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 112,
                height: 112,
                flexShrink: 0,
                borderRadius: 999,
                overflow: 'hidden',
                border: `4px solid ${m.light}`,
                background: `linear-gradient(135deg, ${m.deep}, #1e1b4b)`,
                fontSize: 44,
                fontWeight: 700,
              }}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page
                <img src={photo} alt="" width={112} height={112} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials(winner.name)
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24, flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>{winner.name}</div>
              <div style={{ display: 'flex', fontSize: 24, color: '#cbd5e1', marginTop: 2 }}>
                <span style={{ color: m.light, fontWeight: 700, marginRight: 8 }}>{`${pts} ${winner.kind === 'drep' ? 'season points' : 'points'}`}</span>
                {`· ${ordinal(winner.place)} of ${field.toLocaleString('en-US')} ${who === 'DRep' ? 'DReps' : 'teams'}${season.final ? '' : ' so far'}`}
              </div>
              {winner.picks?.length ? (
                <div style={{ display: 'flex', fontSize: 18, color: '#94a3b8', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden' }}>{`Drafted: ${winner.picks.join(' · ')}`}</div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', fontSize: 18, color: '#94a3b8' }}>
            <div style={{ display: 'flex' }}>{`Epochs ${season.start_epoch}–${season.end_epoch} · ${dates}`}</div>
            <div style={{ display: 'flex' }}>adapolis.net</div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts }
  );
}
