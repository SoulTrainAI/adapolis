import type { Metadata } from 'next';
import Link from 'next/link';
import { getSeasonData, type SeasonData } from '@/lib/season/data';
import { POINT_RULES } from '@/lib/season/points';
import { ScoreboardClient } from '@/components/scoreboard/ScoreboardClient';
import { SeasonTabs } from '@/components/season/SeasonTabs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Season Standings — ADApolis',
  description:
    'DRep season points: earned by voting, explaining votes and voting on time. Never by which way they vote.',
};

function Plus({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-emerald-400">{children}</span>;
}

function Minus({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-rose-400">{children}</span>;
}

export default async function SeasonPage() {
  let data: SeasonData | null = null;
  try {
    data = await getSeasonData();
  } catch {
    data = null;
  }

  const isPreview = data !== null && data.season === null;
  const progress = data ? Math.min(data.current_epoch, data.end_epoch) - data.start_epoch + 1 : 0;

  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <SeasonTabs active="standings" />
        <header className="space-y-3 max-w-3xl">
          <p className="text-sm uppercase tracking-wider text-violet-300">
            {isPreview ? 'Preview season' : data ? `Season ${data.season}` : 'Season standings'}
          </p>
          <h1 className="text-4xl font-bold">DRep Season Standings</h1>
          <p className="text-slate-300">
            DReps earn points for doing the job: voting, explaining their votes, and voting on time. Yes, No and Abstain
            all earn the same. Points never depend on which way a DRep votes or whether its side won.
          </p>
          {data && (
            <p className="text-sm text-slate-400">
              Epochs {data.start_epoch}–{data.end_epoch} · epoch {progress} of 6 · {data.standings.length} DReps ranked
            </p>
          )}
          {isPreview && (
            <p className="text-sm bg-violet-950/50 border border-violet-800/60 rounded-lg px-4 py-3 text-violet-100">
              This is a preview season to test the scoring on real data. Fantasy drafting, where you pick 5 DReps and
              score their points, starts with Season 1. Feedback on the point rules is welcome.
            </p>
          )}
        </header>

        <section className="max-w-3xl bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2 text-sm text-slate-300">
          <h2 className="text-white font-semibold">How points work</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            <li>Vote on a governance action: <Plus>+{POINT_RULES.vote}</Plus></li>
            <li>Publish a rationale with it: <Plus>+{POINT_RULES.rationale}</Plus></li>
            <li>Vote in the first half of the window: <Plus>+{POINT_RULES.early}</Plus></li>
            <li>Unique rationale, not reused: <Plus>+{POINT_RULES.freshRationale}</Plus></li>
            <li>
              Streak: <Plus>+{POINT_RULES.streakStep}</Plus> per clean epoch in a row, up to{' '}
              <Plus>+{POINT_RULES.streakStep * POINT_RULES.streakCap}</Plus>
            </li>
            <li>Let an action close without voting: <Minus>{POINT_RULES.missed}</Minus></li>
          </ul>
          <p className="text-slate-400">
            Underdog: smaller DReps, by both ADA and number of delegators, will be worth up to{' '}
            {1 + POINT_RULES.maxUnderdogBonus}× to fantasy teams that draft them.{' '}
            <Link href="/methodology#season-points" className="text-violet-300 hover:underline">
              Full rules
            </Link>
          </p>
        </section>

        {data === null ? (
          <p className="text-slate-400">Standings are temporarily unavailable. Please try again in a minute.</p>
        ) : (
          // The same scoreboard and cards as /scoreboard, opened ranked by this season's points.
          <ScoreboardClient initialEpoch={data.current_epoch} initialSort="season_points" />
        )}
      </div>
    </div>
  );
}
