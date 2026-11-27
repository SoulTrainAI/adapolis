import Link from 'next/link';
import { ArrowRight, Play, Trophy } from 'lucide-react';
import { getRace, type Race } from '@/lib/season/race';
import { buildCommentary, type CommentaryLine } from '@/lib/season/commentary';
import { getHallOfFame, type HallOfFame } from '@/lib/season/hall-of-fame';
import { getCards } from '@/lib/cards/data';
import { seasonLabel } from '@/lib/season/points';
import type { CardSummary } from '@/lib/cards/types';
import { TradingCard } from '@/components/cards/TradingCard';

const EMOJI: Record<CommentaryLine['tone'], string> = { lead: '👑', move: '🚀', hot: '⚡', streak: '🔥', slip: '😬', info: '🗳️' };

/** Some calls already open with their own emoji; show it once. */
function leadsWithEmoji(text: string): boolean {
  const cp = text.codePointAt(0) ?? 0;
  return cp >= 0x1f300 || (cp >= 0x2600 && cp <= 0x27bf);
}

async function load(): Promise<{ race: Race | null; lines: CommentaryLine[]; cards: CardSummary[]; hall: HallOfFame | null }> {
  const [race, hall, deck] = await Promise.all([getRace().catch(() => null), getHallOfFame().catch(() => null), getCards().catch(() => null)]);
  const until = race ? Math.min(race.now, race.ends_at) : 0;
  const lines = race ? buildCommentary(race.racers, { starts_at: race.starts_at, until, start_epoch: race.start_epoch }).sort((a, b) => b.t - a.t).slice(0, 3) : [];
  // The Hall of Fame once a season has finished; until then, whoever leads right now.
  const byId = new Map((deck?.cards ?? []).map((c) => [c.drep_id, c]));
  const cards = hall
    ? hall.champions.slice(0, 5).flatMap((c) => (c.card ? [c.card] : []))
    : (race?.racers ?? [])
        .slice(0, 5)
        .map((r) => byId.get(r.drep_id))
        .filter((c): c is CardSummary => !!c);
  return { race, lines, cards, hall };
}

/**
 * The homepage hook for the game: the race right now, the latest calls from
 * the commentary box, the Hall of Fame window and a big Play for free button.
 */
export async function CardanathonHook({ seasonLine }: { seasonLine: string | null }) {
  const { race, lines, cards, hall } = await load();
  const live = race ? race.now < race.ends_at : false;
  return (
    <section className="relative mx-auto mt-20 max-w-6xl" aria-labelledby="cardanathon-hook">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-0 rounded-[3rem] opacity-70"
        style={{ background: 'radial-gradient(50% 40% at 30% 30%, rgba(124,58,237,0.25), transparent 70%), radial-gradient(40% 35% at 80% 20%, rgba(14,165,233,0.18), transparent 70%)' }}
      />
      <div className="relative text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-brand-gold-light">Home of the</p>
        <h2 id="cardanathon-hook" className="font-display text-5xl font-black tracking-tight sm:text-7xl">
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.25)]">CARDANATHON</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-200 sm:text-xl text-balance">
          Cardano’s DReps are racing to <span className="font-semibold text-sky-300">Planet Cardano</span>. Pick five. Cheer them on. Take home the trophy.
        </p>
      </div>

      <div className="relative mt-8 space-y-6">
        <Link
          href="/cardanathon"
          className="group relative block overflow-hidden rounded-2xl border border-slate-700 shadow-2xl shadow-violet-950/50 transition hover:border-sky-400/60"
          aria-label="Watch the Cardanathon live"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG from our own API */}
          <img src="/api/cardanathon/image" alt="The Cardanathon right now: the top DReps' flight paths toward Planet Cardano, with the top 5 and their points" width={1200} height={630} className="block h-auto w-full transition duration-500 group-hover:scale-[1.02]" />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition group-hover:bg-sky-500 sm:bottom-5 sm:right-5 sm:px-5 sm:py-2.5 sm:text-base">
            <Play className="h-4 w-4" aria-hidden /> {live ? 'Watch it live' : 'Replay the race'}
          </span>
        </Link>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-brand-gold/30 bg-brand-ink/80 p-5 sm:p-6">
            <p className="text-slate-200">
              Draft a team of five DReps. Every vote they cast, every rationale they publish and every early call scores your team points. Climb the
              Team Leaderboard and win one-of-one <span className="font-semibold text-brand-gold-light">DRep All-Star Trophies</span>.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <li className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">🆓 Free to play</li>
              <li className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-300">⏱️ 2-minute draft</li>
              <li className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">🏆 Real trophies</li>
            </ul>
            <Link
              href="/draft"
              className="mt-4 flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-6 text-lg font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-900/40 transition hover:scale-[1.02] hover:shadow-amber-500/40"
            >
              Play for free <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <p className="mt-2 text-center text-xs text-slate-400">
              {seasonLine ? `${seasonLine} · ` : ''}Anyone can play. Prizes go to wallets delegated with 100+ ADA.
            </p>
          </div>

          {lines.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
                From the commentary box
              </p>
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li key={`${l.t}-${l.text}`} className="flex gap-2 text-sm text-slate-200">
                    <span aria-hidden>{leadsWithEmoji(l.text) ? Array.from(l.text)[0] : EMOJI[l.tone]}</span>
                    <span>
                      <span className="mr-1 text-xs text-slate-500">Day {l.day}</span>
                      {leadsWithEmoji(l.text) ? Array.from(l.text).slice(1).join('').trimStart() : l.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/cardanathon" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200">
                All the calls <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </div>

      {cards.length > 0 && (
        <div className="relative mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
              <Trophy className="h-6 w-6 text-brand-gold" aria-hidden />
              {hall ? `Hall of Fame: ${seasonLabel(hall.season_number)}` : `Leading the ${race ? race.label : 'race'} right now`}
            </h3>
            <Link href="/hall-of-fame" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-gold-light hover:text-amber-200">
              {hall ? 'The full Hall of Fame' : 'The first Hall of Fame opens when the Preseason ends'} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {cards.map((c) => (
              <TradingCard key={c.drep_id} card={c} variant="season" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
