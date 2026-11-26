import Link from 'next/link';

const TABS = [
  ['standings', '/season', 'Cardanathon'],
  ['leagues', '/leagues', 'Leagues'],
  ['draft', '/draft', 'Draft'],
  ['hall', '/hall-of-fame', 'Hall of Fame'],
] as const;

/** Switches between the season's views. */
export function SeasonTabs({ active }: { active: (typeof TABS)[number][0] | 'leaderboard' }) {
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-slate-800" aria-label="Season views">
      {TABS.map(([id, href, label]) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? 'page' : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${active === id ? 'border-brand-gold text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
