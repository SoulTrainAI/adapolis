/**
 * Renders a DRep All-Star Season Trophy as a card, front or back, at the same
 * 500×700 size and in the same metal frame as the DRep All-Star cards. The
 * front is the winner's flight to the destination planet; the back is the
 * season's record. These images are shown on the site and, once minting is
 * built, minted. Server-only (Satori via next/og).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import { format } from 'date-fns';
import { artDataUri, assets } from '@/lib/cards/render';
import { MEDALS, trophyArt, type Medal } from './trophy';
import type { SeasonTrophies, TrophyWinner } from './trophy-data';

const W = 500;
const H = 700;
const ART_W = 436;
const ART_H = 440;

/** Same metals as the All-Star card frames (Legend, Silver, Bronze). */
const FRAME: Record<Medal, [string, string, string]> = {
  gold: ['#fef08a', '#f59e0b', '#fde047'],
  silver: ['#f1f5f9', '#94a3b8', '#e2e8f0'],
  bronze: ['#fdba74', '#c2410c', '#fbbf24'],
};

const plate: CSSProperties = { background: 'rgba(255,255,255,0.10)', borderTop: '1px solid rgba(255,255,255,0.22)', borderBottom: '1px solid rgba(0,0,0,0.35)' };

/**
 * An official logo for the destination planet, if one has been added as
 * public/brand/planet-logo.svg or .png (only with the trademark owner's
 * permission). None by default.
 */
let logo: string | null | undefined;
async function planetLogo(): Promise<string | null> {
  if (logo !== undefined) return logo;
  for (const [file, type] of [
    ['planet-logo.svg', 'image/svg+xml'],
    ['planet-logo.png', 'image/png'],
  ] as const) {
    try {
      const bytes = await readFile(path.join(process.cwd(), 'public', 'brand', file));
      logo = `data:${type};base64,${bytes.toString('base64')}`;
      return logo;
    } catch {
      // not added
    }
  }
  logo = null;
  return logo;
}

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

function fmtPts(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** What kind of copy this is: the real one-of-one, a live preview, a Preseason test or a Warm-up sample. */
function status(season: SeasonTrophies): { label: string; color: string } {
  if (season.sample) return { label: 'SAMPLE', color: '#7dd3fc' };
  if (season.season_number === 0) return { label: 'TEST', color: '#fbbf24' };
  if (!season.final) return { label: 'PREVIEW', color: '#fbbf24' };
  return { label: '1 OF 1', color: '#f8fafc' };
}

function Frame({ medal, children }: { medal: Medal; children: ReactNode }) {
  const [c1, c2, c3] = FRAME[medal];
  return (
    <div style={{ width: W, height: H, display: 'flex', padding: 17, background: `linear-gradient(135deg, ${c1}, ${c2} 55%, ${c3})`, fontFamily: 'Space Grotesk' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          border: '2px solid rgba(255,255,255,0.35)',
          background: 'linear-gradient(180deg, #1a2150 0%, #10153a 55%, #0a0d26 100%)',
          color: 'white',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Footer({ season, mark, left }: { season: SeasonTrophies; mark: string; left: string }) {
  const st = status(season);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', marginTop: 'auto', ...plate, fontSize: 13, color: '#cbd5e1' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
        <img src={mark} alt="" width={18} height={18} style={{ marginRight: 6 }} />
        ADApolis
      </div>
      <div style={{ display: 'flex' }}>{left}</div>
      <div style={{ display: 'flex', fontWeight: 700, letterSpacing: 1.5, color: st.color }}>{st.label}</div>
    </div>
  );
}

function Front({ season, winner, mark, photo, art }: { season: SeasonTrophies; winner: TrophyWinner; mark: string; photo: string | null; art: string }) {
  const m = MEDALS[winner.medal];
  const who = winner.kind === 'drep' ? 'DRep' : 'Team';
  const field = winner.kind === 'drep' ? season.drep_field : season.team_field;
  const nameSize = winner.name.length <= 16 ? 26 : winner.name.length <= 24 ? 21 : 18;
  return (
    <Frame medal={winner.medal}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', ...plate }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: 4, color: m.light }}>DREP ALL-STAR</div>
          <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, lineHeight: 1.1 }}>{`${season.label} Trophy`}</div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 999,
            background: `radial-gradient(circle at 35% 30%, #ffffff, ${m.light} 30%, ${m.deep} 85%)`,
            border: '2px solid rgba(255,255,255,0.7)',
            color: '#0b1024',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {String(winner.place)}
        </div>
      </div>

      <div style={{ display: 'flex', position: 'relative', margin: '10px 12px 0', border: '3px solid rgba(255,255,255,0.28)', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
        <img src={art} alt="" width={ART_W} height={ART_H} />
        <div style={{ display: 'flex', position: 'absolute', left: 10, top: 10, background: 'rgba(0,0,0,0.55)', color: m.light, fontSize: 13, fontWeight: 700, letterSpacing: 2, padding: '3px 10px' }}>
          {`${m.label.toUpperCase()} · ${ordinal(winner.place).toUpperCase()} ${who.toUpperCase()}`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '12px 12px 0', padding: '10px 12px', ...plate }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            flexShrink: 0,
            borderRadius: 999,
            overflow: 'hidden',
            border: `3px solid ${m.light}`,
            background: `linear-gradient(135deg, ${m.deep}, #1e1b4b)`,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page
            <img src={photo} alt="" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials(winner.name)
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 14, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>{winner.name}</div>
          <div style={{ display: 'flex', fontSize: 14, color: '#cbd5e1', marginTop: 2 }}>
            <span style={{ color: m.light, fontWeight: 700, marginRight: 6 }}>{`${fmtPts(winner.points)} ${winner.kind === 'drep' ? 'season points' : 'points'}`}</span>
            {`· ${ordinal(winner.place)} of ${field.toLocaleString('en-US')} ${who === 'DRep' ? 'DReps' : 'teams'}${season.final ? '' : ' so far'}`}
          </div>
          {winner.picks?.length ? (
            <div style={{ display: 'flex', fontSize: 11, color: '#94a3b8', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden' }}>{winner.picks.join(' · ')}</div>
          ) : null}
        </div>
      </div>

      <Footer season={season} mark={mark} left={`Epochs ${season.start_epoch}–${season.end_epoch}`} />
    </Frame>
  );
}

/** A small trophy in a medal's colours (the lucide "trophy" shape). */
function TrophyIcon({ medal }: { medal: Medal }) {
  const m = MEDALS[medal];
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: 8, flexShrink: 0 }}>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill={m.light} stroke={m.deep} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" fill="none" stroke={m.light} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M4 22h16" fill="none" stroke={m.light} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Row({ label, value, color = '#e2e8f0', strong = false, medal }: { label: string; value: string; color?: string; strong?: boolean; medal?: Medal }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, padding: '3px 0', borderBottom: '1px dashed rgba(148,163,184,0.18)' }}>
      {medal ? <TrophyIcon medal={medal} /> : null}
      <div style={{ display: 'flex', flex: 1, color: strong ? '#f8fafc' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', fontWeight: strong ? 700 : 400 }}>{label}</div>
      <div style={{ display: 'flex', color, fontWeight: 700, marginLeft: 10 }}>{value}</div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '10px 12px 0', padding: '8px 12px', ...plate }}>
      <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#94a3b8', marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function Back({ season, winner, mark }: { season: SeasonTrophies; winner: TrophyWinner; mark: string }) {
  const m = MEDALS[winner.medal];
  const dates = `${format(new Date(season.starts_at * 1000), 'MMM d')} – ${format(new Date(season.ends_at * 1000), 'MMM d, yyyy')}`;
  const dreps = season.winners.filter((w) => w.kind === 'drep');
  const teams = season.winners.filter((w) => w.kind === 'team');
  const b = winner.breakdown;
  const signed = (n: number) => (n > 0 ? `+${fmtPts(n)}` : fmtPts(n));
  return (
    <Frame medal={winner.medal}>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', ...plate }}>
        <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: 4, color: m.light }}>{`${m.label.toUpperCase()} · ${winner.kind === 'drep' ? 'DREP' : 'TEAM'} TROPHY`}</div>
        <div style={{ display: 'flex', fontSize: 22, fontWeight: 700 }}>{`DRep All-Star ${season.label} Trophy`}</div>
        <div style={{ display: 'flex', fontSize: 13, color: '#94a3b8' }}>{`Epochs ${season.start_epoch}–${season.end_epoch} · ${dates}`}</div>
      </div>

      <Box title={winner.kind === 'drep' ? 'THE WINNER' : 'THE WINNING TEAM'}>
        <Row label={winner.name} value={`${fmtPts(winner.points)} pts`} color={m.light} strong />
        {b
          ? [
              <Row key="v" label={`Votes cast${winner.votes_cast !== undefined ? ` (${winner.votes_cast})` : ''}`} value={signed(b.votes)} />,
              <Row key="r" label="Rationales published" value={signed(b.rationales + b.fresh)} />,
              <Row key="e" label="Early votes" value={signed(b.early)} />,
              <Row key="s" label="Streak bonuses" value={signed(b.streak)} />,
              <Row key="m" label="Missed actions" value={signed(b.missed)} color={b.missed < 0 ? '#fca5a5' : '#e2e8f0'} />,
            ]
          : null}
        {(winner.pick_stats ?? []).map((p) => (
          <Row key={p.name} label={`${p.name} · ×${p.multiplier.toFixed(2)}`} value={signed(p.contribution)} />
        ))}
      </Box>

      <Box title="TOP DREPS">
        {dreps.map((d) => (
          <Row key={d.climber_id} medal={d.medal} label={d.name} value={`${fmtPts(d.points)} pts`} color={MEDALS[d.medal].light} strong={d.climber_id === winner.climber_id} />
        ))}
      </Box>

      <Box title="TOP TEAMS">
        {teams.length ? (
          teams.map((t) => <Row key={t.climber_id} medal={t.medal} label={t.name} value={`${fmtPts(t.points)} pts`} color={MEDALS[t.medal].light} strong={t.climber_id === winner.climber_id} />)
        ) : (
          <div style={{ display: 'flex', fontSize: 13, color: '#94a3b8' }}>{season.sample ? 'Team trophies start with the Preseason.' : 'No prize-eligible teams.'}</div>
        )}
      </Box>

      <Box title={season.final ? 'THE SEASON' : 'THE SEASON SO FAR'}>
        <div style={{ display: 'flex', fontSize: 13, color: '#e2e8f0' }}>
          {`${season.drep_field.toLocaleString('en-US')} DReps scored · ${season.team_field.toLocaleString('en-US')} teams · ${season.actions} governance actions voted on`}
        </div>
      </Box>

      <Footer season={season} mark={mark} left="adapolis.net" />
    </Frame>
  );
}

export async function renderTrophyImage(season: SeasonTrophies, winner: TrophyWinner, side: 'front' | 'back' = 'front'): Promise<ImageResponse> {
  const [{ fonts, mark }, photo, planet] = await Promise.all([
    assets(),
    side === 'front' && winner.kind === 'drep' ? artDataUri(winner.image) : Promise.resolve(null),
    planetLogo(),
  ]);
  let element: ReactElement;
  if (side === 'back') element = <Back season={season} winner={winner} mark={mark} />;
  else {
    const svg = trophyArt({
      // Drawn at 2× so lines and stars stay crisp in the art window.
      width: ART_W * 2,
      height: ART_H * 2,
      climbers: winner.kind === 'drep' ? season.drep_climbers : season.team_climbers,
      winner: winner.climber_id,
      medal: winner.medal,
      starts_at: season.starts_at,
      // A preview stretches the race so far across the whole frame.
      ends_at: season.final ? season.ends_at : Math.max(season.until, season.starts_at + 1),
      t: season.until,
      seed: `${season.key}:${winner.kind}:${winner.place}`,
      logo: planet,
    });
    const art = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    element = <Front season={season} winner={winner} mark={mark} photo={photo} art={art} />;
  }
  return new ImageResponse(element, { width: W, height: H, fonts });
}
