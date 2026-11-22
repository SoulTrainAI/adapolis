import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { currentStakeAddress } from '@/lib/auth/current';
import { currentDrep } from '@/lib/auth/current-drep';
import { linkConfigured } from '@/lib/discord/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Discord — ADApolis',
  description: 'Join the ADApolis Discord and get roles for what you do on adapolis.net: Verified DRep, Delegator, Player.',
};

const ERRORS: Record<string, string> = {
  cancelled: 'Discord sign-in was cancelled.',
  expired: 'That sign-in link expired or was opened in a different browser. Try again.',
  failed: "Linking didn't finish.",
  'not-configured': "Discord linking isn't switched on yet. Check back soon.",
};

function Proof({ done, title, detail, action }: { done: boolean; title: string; detail: string; action?: React.ReactNode }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start gap-3 border border-slate-800 bg-slate-900/60 p-4">
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${done ? 'text-emerald-400' : 'text-slate-500'}`} />
      <div className="text-sm">
        <p className="font-semibold text-white">{title}</p>
        <p className="text-slate-400">{detail}</p>
        {action}
      </div>
    </li>
  );
}

export default function DiscordPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const stake = currentStakeAddress();
  const drep = currentDrep();
  const linked = searchParams.linked;
  const roles = (searchParams.roles ?? '').split(',').filter(Boolean);
  const error = searchParams.error;

  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wider text-violet-300">Community</p>
          <h1 className="text-4xl font-bold">Link your Discord</h1>
          <p className="text-slate-300">
            Sign in with Discord and we add you to the ADApolis server with roles for what you have proven here. No need to wait for a moderator.
          </p>
        </header>

        {linked && (
          <div role="status" className="border border-emerald-700/60 bg-emerald-950/40 p-4 text-sm text-emerald-100">
            <p className="font-semibold">Linked as {linked}.</p>
            <p>
              {searchParams.joined === '1' ? 'You have joined the ADApolis server. ' : ''}
              {roles.length ? `Roles added: ${roles.join(', ')}.` : 'No roles to add yet: complete a step below, then link again.'}
            </p>
          </div>
        )}
        {error && (
          <div role="alert" className="border border-rose-700/60 bg-rose-950/40 p-4 text-sm text-rose-100">
            <p className="font-semibold">{ERRORS[error] ?? 'Something went wrong.'}</p>
            {searchParams.detail && <p className="mt-1 text-rose-200/80">{searchParams.detail}</p>}
          </div>
        )}

        <ol className="space-y-2">
          <Proof
            done={Boolean(drep)}
            title="Verified DRep (gold role, DRep lounge)"
            detail={drep ? `Signed as ${drep.slice(0, 20)}…` : 'Sign with your DRep key first.'}
            action={
              !drep && (
                <Link href="/drep" className="text-violet-300 hover:text-violet-200">
                  Sign with your DRep key →
                </Link>
              )
            }
          />
          <Proof
            done={Boolean(stake)}
            title="Delegator and Player"
            detail={
              stake
                ? 'Wallet connected: Delegator if it delegates to a DRep, Player if it has a team this season.'
                : 'Connect your wallet (top right) to check delegation and your fantasy team.'
            }
          />
        </ol>

        {linkConfigured() ? (
          <a href="/api/discord/link" className="inline-flex items-center gap-2 bg-[#5865F2] px-5 py-3 font-semibold text-white hover:bg-[#4752c4]">
            {linked ? 'Link again' : 'Sign in with Discord'}
          </a>
        ) : (
          <p className="text-slate-400">Discord linking switches on shortly.</p>
        )}
        <p className="text-xs text-slate-500">
          We ask Discord for your username and permission to add you to our server, nothing else. Roles are only ever added, never removed, by this
          page.
        </p>
      </div>
    </div>
  );
}
