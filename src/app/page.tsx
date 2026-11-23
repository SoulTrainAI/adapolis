import Link from 'next/link';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Calculator,
  Compass,
  Gamepad2,
  Gem,
  Medal,
  Swords,
  Trophy,
  Vote,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { draftSeason } from '@/lib/season/fantasy';
import { SECTIONS } from '@/lib/site/sections';
import { DISCORD_URL } from '@/lib/site/social';

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

/** "Season 1 starts Jan 4" / "Season 2 draft open, locks Feb 4"; null if unknown. */
async function getSeasonLine(): Promise<string | null> {
  try {
    const s = await Promise.race([draftSeason(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))]);
    if (!s) return null;
    const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return new Date(s.starts_at) > new Date()
      ? `Season ${s.season_number} draft is open · starts ${day(s.starts_at)}`
      : `Season ${s.season_number} draft is open · locks ${day(s.draft_locks_at)}`;
  } catch {
    return null;
  }
}

function Stat({ value, label, tip }: { value: string; label: string; tip: string }) {
  return (
    <div className="rounded-xl border border-brand-gold/20 bg-brand-ink/70 px-4 py-5 text-center" title={tip}>
      <p className="font-display text-3xl font-bold text-gold-gradient">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center space-y-2 mb-8">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-brand-lilac">{eyebrow}</p>
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-white text-balance">{title}</h2>
      {children && <p className="text-slate-400 max-w-2xl mx-auto text-balance">{children}</p>}
    </div>
  );
}

function GameTile({ href, icon: Icon, title, body, accent }: { href: string; icon: LucideIcon; title: string; body: string; accent: string }) {
  return (
    <Link
      href={href}
      title={body}
      className="group flex flex-col gap-3 rounded-xl border border-slate-800 bg-brand-ink/70 p-5 text-left transition-colors hover:border-brand-gold/50"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold text-white">{title}</span>
      <span className="text-sm text-slate-400 leading-relaxed">{body}</span>
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-gold-light">
        Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

interface Path {
  id: string;
  icon: LucideIcon;
  who: string;
  /** Hero chip: completes "I'm …" */
  chip: string;
  pitch: string;
  links: Array<{ href: string; label: string; tip: string; external?: boolean }>;
}

const PATHS: Path[] = [
  {
    id: 'delegators',
    chip: 'an ADA holder',
    icon: Wallet,
    who: 'ADA holders and delegators',
    pitch: 'Your ADA votes through a DRep. Make sure it’s one that shows up and thinks like you.',
    links: [
      { href: SECTIONS.match.href, label: 'Find My DRep', tip: SECTIONS.match.blurb },
      { href: SECTIONS.collection.href, label: 'Check your current DRep', tip: 'Connect your wallet to see who you delegate to and whether they’re still voting.' },
      { href: SECTIONS.hotTopics.href, label: 'See what’s being voted on', tip: SECTIONS.hotTopics.blurb },
    ],
  },
  {
    id: 'dreps',
    chip: 'a DRep',
    icon: BadgeCheck,
    who: 'DReps',
    pitch: 'Your record, scored fairly and in public. Show delegators you do the work.',
    links: [
      { href: SECTIONS.claim.href, label: 'Claim your card', tip: SECTIONS.claim.blurb },
      { href: SECTIONS.scoreboard.href, label: 'See your rank', tip: SECTIONS.scoreboard.blurb },
      { href: SECTIONS.methodology.href, label: 'How you’re scored', tip: SECTIONS.methodology.blurb },
    ],
  },
  {
    id: 'players',
    chip: 'a fantasy player',
    icon: Gamepad2,
    who: 'Fantasy players',
    pitch: 'Scout DReps, draft a team of 5 and climb the leaderboard. Free, no wallet transaction.',
    links: [
      { href: SECTIONS.draft.href, label: 'Draft your team', tip: SECTIONS.draft.blurb },
      { href: SECTIONS.season.href, label: 'Season standings', tip: SECTIONS.season.blurb },
      { href: '/leaderboard', label: 'Fantasy leaderboard', tip: 'Every fantasy team’s score, pick by pick.' },
    ],
  },
  {
    id: 'collectors',
    chip: 'a collector',
    icon: Gem,
    who: 'Collectors and NFT holders',
    pitch: 'Every active DRep is a card with stats, tiers and abilities. Collectible editions are planned.',
    links: [
      { href: SECTIONS.scoreboard.href, label: 'Browse every card', tip: 'The Scoreboard shows every DRep as a card. Tap one to flip it.' },
      { href: SECTIONS.collection.href, label: 'Your collection', tip: SECTIONS.collection.blurb },
      { href: `${SECTIONS.methodology.href}#card-abilities`, label: 'Tiers and abilities', tip: 'How card tiers and abilities are earned.' },
    ],
  },
  {
    id: 'community',
    chip: 'new here',
    icon: BookOpen,
    who: 'New to Cardano governance',
    pitch: 'Learn how on-chain governance works and follow the decisions shaping Cardano.',
    links: [
      { href: SECTIONS.about.href, label: 'Start here', tip: SECTIONS.about.blurb },
      { href: SECTIONS.hotTopics.href, label: 'Hot Topics', tip: SECTIONS.hotTopics.blurb },
      { href: DISCORD_URL, label: 'Join On Discord', tip: 'Governance feeds, season recaps, Ask a DRep and newcomer guides.', external: true },
    ],
  },
];

const LOOP: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: Vote, title: 'DReps vote on-chain', body: 'Every vote and rationale is public on the Cardano blockchain.' },
  { icon: Calculator, title: 'ADApolis scores the process', body: 'Showing up, explaining and voting on time. Never which side.' },
  { icon: Swords, title: 'You choose, play and collect', body: 'Delegators pick better DReps, players draft them, collectors keep the cards.' },
  { icon: Trophy, title: 'Good DReps get noticed', body: 'Attention and delegation flow to DReps who do the work, big or small.' },
];

export default async function Home() {
  const [stats, seasonLine] = await Promise.all([getStats(), getSeasonLine()]);

  return (
    <div className="relative overflow-hidden bg-brand-navy px-4 sm:px-6 lg:px-8 pb-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 30% at 50% 8%, rgba(139,92,246,0.28), transparent 70%)' }}
      />

      {/* Hero */}
      <section className="relative max-w-3xl mx-auto text-center space-y-5 pt-14">
        <LogoMark size={150} className="mx-auto drop-shadow-[0_0_40px_rgba(139,92,246,0.35)]" />
        <h1 className="font-display text-6xl sm:text-7xl tracking-tight">
          <span className="font-bold text-white">ADA</span>
          <span className="font-normal text-brand-lilac">polis</span>
        </h1>
        <p className="font-display text-sm sm:text-base uppercase tracking-[0.3em] text-slate-400">
          The civic engine for Cardano governance
        </p>
        <div className="brand-hairline mx-auto h-px w-64" />
        <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto text-balance">
          Every Cardano DRep, scored on whether they actually show up to vote. Scores come straight from the blockchain,
          and the formula is public so you can check our work.
        </p>
        <Link
          href={SECTIONS.methodology.href}
          title={SECTIONS.methodology.blurb}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-lilac/30 bg-brand-ink px-5 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-brand-lilac/60"
        >
          <Calculator className="h-4 w-4" aria-hidden /> How scoring works
        </Link>

        <nav aria-label="Find your path" className="flex flex-wrap justify-center gap-2 pt-3 text-sm">
          <span className="text-slate-500 self-center">I’m</span>
          {PATHS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              title={p.pitch}
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 transition-colors hover:border-brand-gold/60 hover:text-white"
            >
              {p.chip}
            </a>
          ))}
        </nav>
      </section>

      {/* Find My DRep: the one action every ADA holder should take */}
      <section className="relative max-w-4xl mx-auto mt-12">
        <Link
          href={SECTIONS.match.href}
          title={SECTIONS.match.blurb}
          className="group flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-brand-violet/50 bg-gradient-to-br from-brand-violet/25 via-brand-ink to-brand-ink p-6 sm:p-8 text-center sm:text-left shadow-xl shadow-violet-950/40 transition-colors hover:border-brand-violet"
        >
          <span className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-violet text-white shadow-lg shadow-violet-900/50">
            <Compass className="h-11 w-11" aria-hidden />
          </span>
          <span className="flex-1 space-y-2">
            <span className="block font-display text-2xl sm:text-3xl font-bold text-white">Find My DRep</span>
            <span className="block text-slate-300 text-balance">
              Your ADA has a vote. Answer a 3-minute quiz and see which DReps have actually voted the way you think, plus
              what they say in their own words. Small DReps get a boost so power spreads out.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-brand-violet px-5 py-3 font-semibold text-white transition-colors group-hover:bg-violet-500">
            Take the quiz <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </section>

      {/* The game */}
      <section className="relative max-w-5xl mx-auto mt-20">
        <SectionTitle eyebrow="The game" title="Governance, played like a sport">
          DReps earn points every season for showing up, explaining their votes and voting early. Follow the rankings,
          draft a team, and collect the cards.
        </SectionTitle>
        {seasonLine && (
          <p className="mb-6 text-center">
            <Link href={SECTIONS.draft.href} className="inline-flex items-center gap-2 rounded-full bg-brand-gold/15 px-4 py-1.5 text-sm font-semibold text-brand-gold-light hover:bg-brand-gold/25">
              <CalendarDays className="h-4 w-4" aria-hidden /> {seasonLine}
            </Link>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GameTile href={SECTIONS.scoreboard.href} icon={Medal} title="Scoreboard" body={SECTIONS.scoreboard.blurb} accent="bg-brand-violet/20 text-brand-lilac" />
          <GameTile href={SECTIONS.draft.href} icon={Swords} title="Draft" body={SECTIONS.draft.blurb} accent="bg-brand-gold/20 text-brand-gold-light" />
          <GameTile href={SECTIONS.season.href} icon={CalendarDays} title="Season standings" body={SECTIONS.season.blurb} accent="bg-emerald-500/15 text-emerald-300" />
          <GameTile href="/leaderboard" icon={Trophy} title="Leaderboard" body="Every fantasy team’s score, pick by pick, updated as the season unfolds." accent="bg-sky-500/15 text-sky-300" />
        </div>
      </section>

      {/* Paths */}
      <section className="relative max-w-6xl mx-auto mt-20">
        <SectionTitle eyebrow="Find your path" title="Built for everyone in Cardano governance">
          Start wherever you fit. It all runs on the same public data.
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PATHS.map(({ id, icon: Icon, who, pitch, links }) => (
            <div key={id} id={id} className="scroll-mt-24 flex flex-col gap-3 rounded-xl border border-slate-800 bg-brand-ink/70 p-5">
              <Icon className="h-7 w-7 text-brand-gold-light" aria-hidden />
              <p className="font-display text-lg font-semibold text-white leading-tight">{who}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{pitch}</p>
              <ul className="mt-auto space-y-1.5 pt-2 text-sm">
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      title={l.tip}
                      {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="inline-flex items-center gap-1 font-semibold text-brand-lilac hover:text-white"
                    >
                      {l.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How it fits together */}
      <section className="relative max-w-5xl mx-auto mt-20">
        <SectionTitle eyebrow="How it fits together" title="One loop that rewards showing up" />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative rounded-xl border border-slate-800 bg-brand-ink/50 p-5 text-left">
              <span className="font-display text-xs font-bold text-brand-gold-light">0{i + 1}</span>
              <Icon className="mt-2 h-6 w-6 text-brand-lilac" aria-hidden />
              <p className="mt-2 font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-400">{body}</p>
              {i < LOOP.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </section>

      {stats && (
        <section className="relative max-w-4xl mx-auto mt-20 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat value={stats.dreps.toLocaleString()} label="Registered DReps" tip="DReps currently registered on-chain, active or not." />
          <Stat value={stats.proposals.toLocaleString()} label="Governance actions" tip="Every governance action ever submitted on Cardano." />
          <Stat value={stats.votes.toLocaleString()} label="DRep votes recorded" tip="Every DRep vote we've indexed from the chain." />
          <Stat value={stats.epoch !== null ? String(stats.epoch) : '—'} label="Scores as of epoch" tip="The Cardano epoch our latest scores were computed for. Epochs last 5 days." />
        </section>
      )}

      <p className="relative text-center text-sm text-slate-500 pt-8">Data from the Cardano blockchain via Koios, refreshed every 6 hours.</p>
    </div>
  );
}
