'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { NOTIFICATION_TYPES, type NotificationType } from '@/lib/notifications/types';
import { ConnectPrompt } from '@/components/auth/ConnectPrompt';
import { timeAgo, useNotifications } from './useNotifications';

export function NotificationSettings() {
  const { signedIn, items, prefs, savePrefs, markRead, unread } = useNotifications();
  const toggle = (type: NotificationType) => void savePrefs({ ...prefs, [type]: { ...prefs[type], inapp: prefs[type]?.inapp === false } });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-4xl font-bold">
          <Bell className="h-8 w-8 text-brand-gold" aria-hidden /> Notifications
        </h1>
        <p className="text-slate-300">Your team, the race and your prizes, in the bell at the top of every page.</p>
      </header>
      {!signedIn ? (
        <ConnectPrompt reason="Connect a wallet to get notifications about your team." />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-bold">What to tell me about</h2>
            <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/60">
              {(Object.keys(NOTIFICATION_TYPES) as NotificationType[]).map((type) => {
                const on = prefs[type]?.inapp !== false;
                return (
                  <li key={type} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{NOTIFICATION_TYPES[type].label}</p>
                      <p className="text-sm text-slate-400">{NOTIFICATION_TYPES[type].blurb}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${NOTIFICATION_TYPES[type].label}: ${on ? 'on' : 'off'}`}
                      onClick={() => toggle(type)}
                      className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-violet-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-slate-500">Email and ADAmail delivery are coming; these switches will cover them too.</p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent</h2>
              {unread > 0 && (
                <button type="button" onClick={() => void markRead('all')} className="min-h-[44px] text-sm text-violet-300 hover:text-violet-200">
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-slate-400">Nothing yet.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((n) => (
                  <li key={n.id} className={`rounded-xl border p-3 ${n.read_at ? 'border-slate-800' : 'border-violet-700/60 bg-violet-950/30'}`}>
                    <Link href={n.url ?? '#'} onClick={() => !n.read_at && void markRead(n.id)}>
                      <p className="font-semibold text-white">{n.title}</p>
                      {n.body && <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{n.body}</p>}
                      <p className="mt-1 text-xs text-slate-500">{timeAgo(n.created_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
