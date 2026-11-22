import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
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
    <div className="rounded-xl border border-brand-gold/20 bg-brand-ink/70 px-4 py-5 text-center">
      <p className="font-display text-3xl font-bold text-gold-gradient">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-navy px-4 sm:px-6 lg:px-8 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 45% at 50% 22%, rgba(139,92,246,0.28), transparent 70%)' }}
      />
      <div className="relative max-w-4xl mx-auto text-center space-y-6">
        <LogoMark size={200} className="mx-auto drop-shadow-[0_0_40px_rgba(139,92,246,0.35)]" />
        <h1 className="font-display text-6xl sm:text-7xl tracking-tight">
          <span className="font-bold text-white">ADA</span>
          <span className="font-normal text-brand-lilac">polis</span>
        </h1>
        <p className="font-display text-sm sm:text-base uppercase tracking-[0.3em] text-slate-400">
          The civic engine for Cardano governance
        </p>
        <div className="brand-hairline mx-auto h-px w-64" />
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Every Cardano DRep, scored on whether they actually show up to vote. Scores come straight from the
          blockchain and the formula is public, so you can check our work.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center pt-2">
          <Link
            href="/scoreboard"
            className="rounded-lg bg-brand-violet px-6 py-3 font-semibold text-white shadow-lg shadow-violet-900/40 transition-colors hover:bg-violet-500"
          >
            View the Scoreboard
          </Link>
          <Link
            href="/draft"
            className="rounded-lg bg-brand-gold px-6 py-3 font-semibold text-brand-navy shadow-lg shadow-amber-900/30 transition-colors hover:bg-brand-gold-light"
          >
            Draft your Season 1 team
          </Link>
          <Link
            href="/match"
            className="rounded-lg border border-brand-lilac/30 bg-brand-ink px-6 py-3 font-semibold text-slate-100 transition-colors hover:border-brand-lilac/60"
          >
            Find my DRep
          </Link>
          <Link
            href="/methodology"
            className="rounded-lg border border-brand-lilac/30 bg-brand-ink px-6 py-3 font-semibold text-slate-100 transition-colors hover:border-brand-lilac/60"
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
