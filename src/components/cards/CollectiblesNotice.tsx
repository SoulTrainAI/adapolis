import { ShieldAlert } from 'lucide-react';

/** The one statement about what ADApolis cards and trophies are, shown wherever they're described or claimed. */
export function CollectiblesNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className={`flex gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-50 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}
    >
      <ShieldAlert className={`flex-shrink-0 text-amber-300 ${compact ? 'h-4 w-4' : 'mt-0.5 h-5 w-5'}`} aria-hidden />
      <p>
        <strong>Collectibles only. Not financial instruments.</strong> ADApolis Champion Cards and Season Trophies are
        digital collectibles. They pay nothing, share no revenue or royalties, carry no votes or say over ADApolis, and
        come with no promise of value. Buy, keep or trade them only because you like them. Nothing here is financial
        advice.
      </p>
    </div>
  );
}
