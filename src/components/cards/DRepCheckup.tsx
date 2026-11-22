'use client';

/**
 * Tells a signed-in delegator whether their DRep is showing up to vote.
 * Attendance only: never whether the DRep voted Yes or No or was on the winning side.
 */

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useDelegation } from '@/components/auth/MyDRepBadge';
import { useCards } from './useCards';
import { cardName } from './TradingCard';

type Tone = 'good' | 'warn' | 'bad' | 'info';

const TONES: Record<Tone, { box: string; icon: typeof Info; iconClass: string }> = {
  good: { box: 'border-emerald-700/60 bg-emerald-950/40', icon: CheckCircle2, iconClass: 'text-emerald-300' },
  warn: { box: 'border-amber-700/60 bg-amber-950/40', icon: AlertTriangle, iconClass: 'text-amber-300' },
  bad: { box: 'border-rose-700/60 bg-rose-950/40', icon: XCircle, iconClass: 'text-rose-300' },
  info: { box: 'border-slate-700 bg-slate-900/60', icon: Info, iconClass: 'text-violet-300' },
};

const PREDEFINED: Record<string, string> = {
  drep_always_abstain: 'Always Abstain',
  drep_always_no_confidence: 'Always No Confidence',
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function DRepCheckup({ findHref = '/match', findLabel = 'Find a DRep who shows up' }: { findHref?: string; findLabel?: string }) {
  const delegation = useDelegation();
  const { cards, loaded, currentEpoch } = useCards();
  if (!delegation?.signedIn || !loaded) return null;

  const find = (
    <Link href={findHref} className="font-semibold text-violet-300 hover:text-violet-200">
      {findLabel}
    </Link>
  );
  let tone: Tone;
  let title: string;
  let body: React.ReactNode;

  const id = delegation.drepId;
  const card = id ? cards.get(id) : undefined;
  if (!id) {
    tone = 'info';
    title = "Your wallet isn't delegated to a DRep";
    body = <>Your ADA has no voice in governance votes until you delegate. {find}.</>;
  } else if (PREDEFINED[id]) {
    tone = 'info';
    title = `You're delegated to ${PREDEFINED[id]}`;
    body = <>That&apos;s a fixed option, not a person: no one reads proposals or explains votes for you. {find} if you want someone to.</>;
  } else if (!card) {
    tone = 'bad';
    title = 'Your DRep is no longer registered';
    body = <>A retired DRep can&apos;t vote, so your ADA currently has no voice. {find} and re-delegate in your wallet.</>;
  } else {
    const name = cardName(card);
    const { votes, missed } = card.recent;
    const since = card.last_vote_epoch !== null && currentEpoch !== null ? currentEpoch - card.last_vote_epoch : null;
    if (votes === 0 && missed > 0) {
      tone = 'bad';
      title = `${name} has gone quiet`;
      body = (
        <>
          {plural(missed, 'governance action')} closed recently without a vote from your DRep
          {since !== null ? `, and its last vote was ${plural(since, 'epoch')} ago` : ', and it has never voted'}. {find}.
        </>
      );
    } else if (missed > 0) {
      tone = 'warn';
      title = `${name} missed ${plural(missed, 'vote')} lately`;
      body = (
        <>
          In the last two 6-epoch windows it voted {plural(votes, 'time')} and let {plural(missed, 'action')} close without voting. Worth keeping an eye on.
        </>
      );
    } else if (votes > 0) {
      tone = 'good';
      title = `${name} is showing up`;
      body = <>It voted {plural(votes, 'time')} in the last two 6-epoch windows and missed none.</>;
    } else {
      tone = 'info';
      title = `Nothing for ${name} to vote on lately`;
      body = <>No governance actions closed in the last two windows, so there&apos;s no attendance to judge yet.</>;
    }
  }

  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${t.box}`}>
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${t.iconClass}`} />
      <div className="text-sm text-slate-300">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-0.5">{body}</p>
        <p className="mt-1 text-xs text-slate-500">Checks attendance only: never how your DRep voted.</p>
      </div>
    </div>
  );
}
