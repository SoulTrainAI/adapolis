import Link from 'next/link';

const TABS = [
  ['standings', '/season', 'DRep standings'],
  ['leaderboard', '/leaderboard', 'Game leaderboard'],
  ['draft', '/draft', 'Draft'],
] as const;

/** Switches between the season's three views. */
export function SeasonTabs({ active }: { active: (typeof TABS)[number][0] }) {
  return (
    <nav className="flex gap-1 border-b border-slate-800" aria-label="Season views">
      {TABS.map(([id, href, label]) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? 'page' : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${active === id ? 'border-brand-gold text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
