import type { Metadata } from 'next';
import Link from 'next/link';
import { getSeasonData, type SeasonData, type SeasonStanding } from '@/lib/season/data';
import { POINT_RULES } from '@/lib/season/points';
import { formatAda } from '@/lib/match/score';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Season Standings — ADApolis',
  description:
    'DRep season points: earned by voting, explaining votes and voting on time. Never by which way they vote.',
};

const BREAKDOWN_LABELS: Array<[keyof SeasonStanding['breakdown'], string]> = [
  ['votes', 'Votes'],
  ['rationales', 'Rationales'],
  ['fresh', 'Fresh rationales'],
  ['early', 'Early votes'],
  ['streak', 'Streak'],
  ['missed', 'Missed'],
];

function Avatar({ s }: { s: SeasonStanding }) {
  const initial = (s.profile.name ?? s.drep_id.slice(5, 6)).slice(0, 1).toUpperCase();
  if (s.profile.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={s.profile.image} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-800" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-violet-900/60 text-violet-200 flex items-center justify-center font-semibold">
      {initial}
    </div>
  );
}

function Row({ s }: { s: SeasonStanding }) {
  const name = s.profile.name ?? `${s.drep_id.slice(0, 12)}…${s.drep_id.slice(-6)}`;
  return (
    <details className="group bg-slate-900/60 border border-slate-800 rounded-xl">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
        <span className="w-8 text-right text-slate-400 font-mono">{s.rank}</span>
        <Avatar s={s} />
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">
            {name} <MyDRepBadge drepId={s.drep_id} className="ml-1 align-middle" />
          </p>
          <p className="text-xs text-slate-400">
            {s.votes_cast} votes · {s.actions_missed} missed · {formatAda(s.amount_lovelace / 1_000_000)} ·{' '}
            {s.delegator_count.toLocaleString()} delegators
          </p>
        </div>
        {s.underdog > 1.05 && (
          <span
            className="hidden sm:inline text-xs bg-amber-900/40 text-amber-300 border border-amber-800/60 rounded-full px-2 py-0.5"
            title="Underdog multiplier a fantasy team would get for drafting this DRep"
          >
            {s.underdog.toFixed(2)}× underdog
          </span>
        )}
        <span className="w-16 text-right text-xl font-bold text-white">{s.points}</span>
      </summary>
      <div className="px-4 pb-4 pt-1 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {BREAKDOWN_LABELS.map(([key, label]) => (
          <div key={key} className="bg-slate-800/60 rounded-lg py-2">
            <p className={`font-semibold ${s.breakdown[key] < 0 ? 'text-rose-300' : 'text-white'}`}>{s.breakdown[key]}</p>
            <p className="text-[11px] text-slate-400">{label}</p>
          </div>
        ))}
        {s.profile.doNotList && (
          <p className="col-span-full text-xs text-slate-400 text-left">Not seeking delegation.</p>
        )}
      </div>
    </details>
  );
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
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
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

        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2 text-sm text-slate-300">
          <h2 className="text-white font-semibold">How points work</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            <li>Vote on a governance action: +{POINT_RULES.vote}</li>
            <li>Publish a rationale with it: +{POINT_RULES.rationale}</li>
            <li>Unique rationale, not reused: +{POINT_RULES.freshRationale}</li>
            <li>Vote in the first half of the window: +{POINT_RULES.early}</li>
            <li>Let an action close without voting: {POINT_RULES.missed}</li>
            <li>
              Streak: +{POINT_RULES.streakStep} per clean epoch in a row, up to +
              {POINT_RULES.streakStep * POINT_RULES.streakCap}
            </li>
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
        ) : data.standings.length === 0 ? (
          <p className="text-slate-400">No DRep has voted yet this season.</p>
        ) : (
          <ol className="space-y-2">
            {data.standings.map((s) => (
              <li key={s.drep_id}>
                <Row s={s} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
