'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Settings } from 'lucide-react';
import { timeAgo, useNotifications } from './useNotifications';

/** Lights up when there's something new. Only shown to signed-in wallets. */
export function NotificationBell() {
  const { signedIn, items, unread, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!signedIn) return null;
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `${unread} new notifications` : 'Notifications'}
        aria-expanded={open}
        className={`relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-800 ${unread ? 'text-amber-300' : 'text-slate-300'}`}
      >
        <Bell className={`h-5 w-5 ${unread ? 'animate-wiggle' : ''}`} />
        {unread > 0 && (
          <>
            <span className="absolute right-1.5 top-1.5 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>
            <span className="absolute right-1.5 top-1.5 h-4 w-4 animate-ping rounded-full bg-rose-500/60" aria-hidden />
          </>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <span className="font-semibold text-white">Notifications</span>
            <span className="flex items-center gap-1">
              {unread > 0 && (
                <button type="button" onClick={() => markRead('all')} className="min-h-[36px] rounded px-2 text-xs text-violet-300 hover:bg-slate-800">
                  Mark all read
                </button>
              )}
              <Link href="/notifications" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Notification settings">
                <Settings className="h-4 w-4" />
              </Link>
            </span>
          </div>
          <ul className="max-h-[70vh] divide-y divide-slate-800 overflow-y-auto">
            {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">Nothing yet. You’ll hear about your team, the race and your prizes here.</li>}
            {items.map((n) => (
              <li key={n.id} className={n.read_at ? '' : 'bg-violet-950/30'}>
                <Link
                  href={n.url ?? '/notifications'}
                  onClick={() => {
                    if (!n.read_at) void markRead(n.id);
                    setOpen(false);
                  }}
                  className="block px-3 py-2.5 hover:bg-slate-800"
                >
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-xs text-slate-300">{n.body}</p>}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{timeAgo(n.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
