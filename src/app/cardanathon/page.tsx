import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { Flag, Swords } from 'lucide-react';
import { getRace, type Race } from '@/lib/season/race';
import { POINT_RULES, SEASON_LENGTH_EPOCHS, epochStart, seasonLabel, seasonOneStartEpoch } from '@/lib/season/points';
import { ScoreboardClient } from '@/components/scoreboard/ScoreboardClient';
import { SeasonTabs } from '@/components/season/SeasonTabs';
import { Cardanathon } from '@/components/season/Cardanathon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cardanathon — ADApolis',
  description:
    'Watch the top 20 DReps race through the season: points for voting, explaining votes and voting early, live commentary, replay any day. Never scored on which way they vote.',
  openGraph: { images: [{ url: '/api/cardanathon/image', width: 1200, height: 630, alt: 'The Cardanathon right now' }] },
  twitter: { card: 'summary_large_image', images: ['/api/cardanathon/image'] },
};

function Plus({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-emerald-400">{children}</span>;
}

/** What this window is, and what comes next. */
function stage(race: Race): string {
  const launch = seasonOneStartEpoch();
  const fmt = (epoch: number) => format(epochStart(epoch), 'd MMM');
  if (race.season === null) {
    return launch === null
      ? 'A warm-up race on real governance data.'
      : `Warm-up race. The Preseason, the first season you can draft and play, starts ${fmt(launch - SEASON_LENGTH_EPOCHS)}. Season 1 and the Genesis DRep All-Stars start ${fmt(launch)}.`;
  }
  if (race.season === 0) {
    return `Preseason: draft, play and win for real, with test DRep All-Star cards that are never minted. Season 1 and the Genesis set start ${launch !== null ? fmt(launch) : 'soon'}.`;
  }
  return race.season === 1
    ? 'Season 1: the top 10 DReps become the Genesis DRep All-Stars.'
    : `The top 10 DReps become ${seasonLabel(race.season)} DRep All-Stars.`;
}

export default async function SeasonPage() {
  let race: Race | null = null;
  try {
    race = await getRace();
  } catch {
    race = null;
  }

  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-8">
        <SeasonTabs active="standings" />

        <header className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(139,92,246,0.25),transparent_55%)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-amber-950">{race ? race.label : 'Season'}</span>
            {race && (
              <span className="text-slate-300">
                Epochs {race.start_epoch}–{race.end_epoch}
              </span>
            )}
          </div>
          <h1 className="mt-3 flex items-center gap-3 font-display text-4xl font-black sm:text-5xl">
            <Flag className="h-9 w-9 text-amber-300" /> Cardanathon
          </h1>
          <p className="mt-2 max-w-3xl text-slate-200">
            The season-long DRep race. Every DRep starts at zero. Points for voting, explaining their votes and voting early push them up the track,
            and points are never taken away. Yes, No and Abstain all score the same. Hit play to watch the season unfold.
          </p>
          {race && <p className="mt-2 max-w-3xl text-sm text-amber-100/90">{stage(race)}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/draft" className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-amber-950 hover:bg-amber-300">
              <Swords className="h-4 w-4" /> Draft your team
            </Link>
            <Link href="/leagues" className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 font-semibold text-slate-100 hover:border-slate-400">
              Leagues
            </Link>
          </div>
        </header>

        {race ? <Cardanathon race={race} /> : <p className="text-slate-400">The race is temporarily unavailable. Please try again in a minute.</p>}

        <details className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
          <summary className="cursor-pointer font-semibold text-white">How points work</summary>
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <li>
              Vote on a governance action: <Plus>+{POINT_RULES.vote}</Plus>
            </li>
            <li>
              Vote in the first half of the window: <Plus>+{POINT_RULES.early}</Plus>
            </li>
            <li>
              Post an original rationale (not identical to any posted before): <Plus>+{POINT_RULES.freshRationale}</Plus>
            </li>
            <li>
              Streak: <Plus>+{POINT_RULES.streakStep}</Plus> per clean epoch in a row, up to{' '}
              <Plus>+{POINT_RULES.streakStep * POINT_RULES.streakCap}</Plus>
            </li>
            <li>
              Let an action close without voting: no points, and the streak starts over
            </li>
          </ul>
          <p className="mt-2 text-slate-400">
            Commentary is generated from these events and rank changes.{' '}
            <Link href="/methodology#season-points" className="text-violet-300 hover:underline">
              Full rules
            </Link>
          </p>
        </details>

        {race && (
          <details className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <summary className="cursor-pointer font-semibold text-white">Every DRep this season, as cards</summary>
            <div className="mt-4">
              <ScoreboardClient initialEpoch={race.current_epoch} initialSort="season_points" />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

