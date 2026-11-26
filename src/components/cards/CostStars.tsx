import { TEAM_STAR_BUDGET } from '@/lib/season/draft-cost';

/** Draft Cost as gold stars (1–5). */
export function CostStars({ n, className = '', style }: { n: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-bold leading-none text-amber-300 ${className}`}
      style={style}
      title={`Draft Cost: ${n} star${n === 1 ? '' : 's'}. Set by Projected Points; a team can spend up to ${TEAM_STAR_BUDGET} stars.`}
      aria-label={`Draft Cost ${n} star${n === 1 ? '' : 's'}`}
    >
      {'★'.repeat(n)}
    </span>
  );
}
