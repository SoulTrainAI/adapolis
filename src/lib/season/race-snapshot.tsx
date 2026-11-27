/**
 * The Cardanathon right now as a 1200×630 PNG: the space race with the top 5
 * named on the right. Used on the homepage and as the share image for
 * /cardanathon. Server-only (Satori via next/og).
 */

import { ImageResponse } from 'next/og';
import { artDataUri, assets } from '@/lib/cards/render';
import { DAY_S, displayName } from './commentary';
import { raceArt, RACE_COLORS } from './race-art';
import type { Race } from './race';

const W = 1200;
const H = 630;
const RIGHT = 400;

export async function renderRaceSnapshot(race: Race): Promise<ImageResponse> {
  const until = Math.min(race.now, race.ends_at);
  const ranked = [...race.racers].sort((a, b) => b.points - a.points);
  const top = ranked.slice(0, 10);
  const five = top.slice(0, 5);
  const [{ fonts, mark }, photos] = await Promise.all([assets(), Promise.all(five.map((r) => artDataUri(r.image)))]);
  const { svg } = raceArt({ width: W, height: H, climbers: top, starts_at: race.starts_at, t: until, seed: `race:${race.label}`, right: RIGHT });
  const art = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const totalDays = Math.round((race.ends_at - race.starts_at) / DAY_S);
  const day = Math.min(totalDays, Math.max(1, Math.ceil((until - race.starts_at) / DAY_S)));
  const live = race.now < race.ends_at;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', fontFamily: 'Space Grotesk', color: 'white', background: '#05071a' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
        <img src={art} alt="" width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 44, top: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {live ? (
              <div style={{ display: 'flex', alignItems: 'center', background: '#e11d48', borderRadius: 999, padding: '4px 14px', fontSize: 18, fontWeight: 700, letterSpacing: 2, marginRight: 14 }}>
                <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 999, background: 'white', marginRight: 8 }} />
                LIVE
              </div>
            ) : (
              <div style={{ display: 'flex', background: '#334155', borderRadius: 999, padding: '4px 14px', fontSize: 18, fontWeight: 700, letterSpacing: 2, marginRight: 14 }}>FINAL</div>
            )}
            <div style={{ display: 'flex', fontSize: 22, color: '#cbd5e1' }}>{`${race.label} · Day ${day} of ${totalDays}`}</div>
          </div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, letterSpacing: 1, marginTop: 6, textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>CARDANATHON</div>
          <div style={{ display: 'flex', fontSize: 22, color: '#cbd5e1' }}>{`${race.field.toLocaleString('en-US')} DReps racing to Planet Cardano`}</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            right: 36,
            top: 236,
            width: RIGHT - 60,
            padding: '14px 16px',
            borderRadius: 18,
            background: 'rgba(5,7,26,0.72)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          {five.map((r, i) => (
            <div key={r.drep_id} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderTop: i ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <div style={{ display: 'flex', width: 30, fontSize: 24, fontWeight: 700, color: RACE_COLORS[i] }}>{String(i + 1)}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  overflow: 'hidden',
                  border: `3px solid ${RACE_COLORS[i]}`,
                  background: '#1e1b4b',
                  fontSize: 18,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {photos[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page
                  <img src={photos[i]!} alt="" width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  displayName(r).slice(0, 1).toUpperCase()
                )}
              </div>
              <div style={{ display: 'block', flex: 1, marginLeft: 12, fontSize: 22, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName(r)}</div>
              <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: RACE_COLORS[i], marginLeft: 10 }}>{String(r.points)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', left: 44, bottom: 26, fontSize: 20, color: '#cbd5e1', fontWeight: 700 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
          <img src={mark} alt="" width={28} height={28} style={{ marginRight: 10 }} />
          adapolis.net/cardanathon
        </div>
      </div>
    ),
    { width: W, height: H, fonts }
  );
}
