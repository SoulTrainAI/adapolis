import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;

interface HomeStats {
  dreps: number;
  votes: number;
  proposals: number;
  epoch: number | null;
}

// Stats are a nice-to-have: any failure renders the page without them rather
// than breaking the homepage (or the build, which prerenders this page).
async function getStats(): Promise<HomeStats | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const [dreps, votes, proposals, epoch] = await Promise.all([
      supabase.from('dreps').select('*', { count: 'exact', head: true }).eq('is_registered', true),
      supabase.from('votes').select('*', { count: 'exact', head: true }),
      supabase.from('proposals').select('*', { count: 'exact', head: true }),
      supabase.from('drep_scores').select('epoch').order('epoch', { ascending: false }).limit(1),
    ]);
    if (dreps.error || votes.error || proposals.error) return null;
    return {
      dreps: dreps.count ?? 0,
      votes: votes.count ?? 0,
      proposals: proposals.count ?? 0,
      epoch: epoch.data?.[0]?.epoch ?? null,
    };
  } catch {
    return null;
  }
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-5 text-center">
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-bold text-white">ADApolis</h1>
        <p className="text-xl sm:text-2xl text-slate-300">The civic engine for Cardano governance</p>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
          Every Cardano DRep, scored on whether they actually show up to vote. Scores come straight from the
          blockchain and the formula is public, so you can check our work.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/scoreboard"
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            View the Scoreboard
          </Link>
          <Link
            href="/methodology"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            How scoring works
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-10">
            <Stat value={stats.dreps.toLocaleString()} label="Registered DReps" />
            <Stat value={stats.proposals.toLocaleString()} label="Governance actions" />
            <Stat value={stats.votes.toLocaleString()} label="DRep votes recorded" />
            <Stat value={stats.epoch !== null ? String(stats.epoch) : '—'} label="Scores as of epoch" />
          </div>
        )}

        <p className="text-sm text-slate-500 pt-6">
          Data from the Cardano blockchain via Koios, refreshed every 6 hours.
        </p>
      </div>
    </div>
  );
}
