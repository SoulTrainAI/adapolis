'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppNotification, Prefs } from '@/lib/notifications/types';

const POLL_MS = 5 * 60_000;

export function useNotifications() {
  const [state, setState] = useState<{ signedIn: boolean; items: AppNotification[]; unread: number; prefs: Prefs }>({ signedIn: false, items: [], unread: 0, prefs: {} });
  const load = useCallback(() => {
    fetch('/api/me/notifications')
      .then((r) => r.json() as Promise<{ signed_in: boolean; items: AppNotification[]; unread: number; prefs: Prefs }>)
      .then((d) => setState({ signedIn: d.signed_in, items: d.items, unread: d.unread, prefs: d.prefs }))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    window.addEventListener('adapolis:auth', load);
    return () => {
      clearInterval(t);
      window.removeEventListener('adapolis:auth', load);
    };
  }, [load]);
  const post = useCallback(
    async (body: Record<string, unknown>) => {
      await fetch('/api/me/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      load();
    },
    [load]
  );
  return { ...state, reload: load, markRead: (id: number | 'all') => post({ read: id }), savePrefs: (prefs: Prefs) => post({ prefs }) };
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
}
