import { MyDRepBadge } from '@/components/auth/MyDRepBadge';
import { rationaleHref } from '@/lib/rationale/href';
import type { ProposalArgument } from '@/lib/statements/proposal-arguments';

export interface Argument {
  text: string;
  quote?: string;
  url?: string | null;
  drepId?: string | null;
  drepName?: string | null;
  /** Non-DRep author, e.g. a forum username */
  author?: string;
  linkLabel?: string;
}

/** Rationales are often Markdown; show the words without **bold** markers or `code` ticks. */
export function plainQuote(q: string): string {
  return q.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim();
}

export function ArgumentsPanel({
  argsFor,
  argsAgainst,
  footnote,
  proposalId,
}: {
  argsFor: Argument[];
  argsAgainst: Argument[];
  footnote?: string;
  /** When set, DRep points link to the readable rationale page instead of the raw document */
  proposalId?: string;
}) {
  const href = (a: Argument) => (proposalId && a.drepId ? rationaleHref(a.drepId, proposalId) : a.url);
  const column = (title: string, items: Argument[], tone: string, empty: string) => (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tone}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="list-disc pl-4 space-y-3 text-sm text-slate-300">
          {items.map((a) => (
            <li key={a.text} className={a.quote ? 'list-none -ml-4' : undefined}>
              {!a.quote && a.text}
              {a.quote && (
                <blockquote className="border-l-2 border-slate-600 pl-3 text-sm text-slate-200">
                  “{plainQuote(a.quote)}”
                  <span className="mt-1 block text-xs text-slate-500">
                    {a.drepName ?? a.author ?? (a.drepId ? `${a.drepId.slice(0, 14)}…` : 'A DRep')}
                    {a.drepId && <MyDRepBadge drepId={a.drepId} className="ml-1 align-middle" />}
                    {href(a) && (
                      <a
                        href={href(a) ?? undefined}
                        {...(href(a)?.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer nofollow' })}
                        className="ml-2 text-violet-300 hover:text-violet-200"
                      >
                        {a.linkLabel ?? (href(a)?.startsWith('/') ? 'Read full rationale →' : 'Read full rationale ↗')}
                      </a>
                    )}
                  </span>
                </blockquote>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        {column('Arguments for', argsFor, 'text-emerald-300', 'No published arguments yet.')}
        {column('Arguments against', argsAgainst, 'text-red-300', 'No published arguments yet.')}
      </div>
      {footnote && <p className="text-[11px] text-slate-500 mt-3">{footnote}</p>}
    </div>
  );
}

export function toArgument(p: ProposalArgument): Argument {
  return { text: p.text, quote: p.quote, url: p.url, drepId: p.drep_id, drepName: p.drep_name };
}
