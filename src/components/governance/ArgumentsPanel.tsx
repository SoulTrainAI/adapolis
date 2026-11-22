import { MyDRepBadge } from '@/components/auth/MyDRepBadge';
import type { ProposalArgument } from '@/lib/statements/proposal-arguments';

export interface Argument {
  text: string;
  quote?: string;
  url?: string | null;
  drepId?: string | null;
  drepName?: string | null;
}

export function ArgumentsPanel({ argsFor, argsAgainst, footnote }: { argsFor: Argument[]; argsAgainst: Argument[]; footnote?: string }) {
  const column = (title: string, items: Argument[], tone: string, empty: string) => (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tone}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="list-disc pl-4 space-y-1.5 text-sm text-slate-300">
          {items.map((a) => (
            <li key={a.text}>
              {a.text}
              {a.quote && (
                <blockquote className="mt-1 border-l-2 border-slate-700 pl-2 text-xs italic text-slate-400">
                  “{a.quote}”
                  <span className="not-italic block mt-0.5 text-slate-500">
                    {a.drepName ?? (a.drepId ? `${a.drepId.slice(0, 14)}…` : 'A DRep')}
                    {a.drepId && <MyDRepBadge drepId={a.drepId} className="ml-1 align-middle" />}
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-2 text-violet-300 hover:text-violet-200">
                        Read full rationale ↗
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
