/** Reading, writing and marking notifications. Server-only. */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { NOTIFICATION_TYPES, wantsInApp, type AppNotification, type NotificationType, type Prefs } from './types';

export interface NewNotification {
  stake_address: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  url?: string | null;
  dedupe_key: string;
}

export async function getPrefs(stake: string): Promise<Prefs> {
  const { data } = await supabaseAdmin.from('notification_prefs').select('prefs').eq('stake_address', stake).maybeSingle();
  return ((data?.prefs ?? {}) as Prefs) || {};
}

export async function savePrefs(stake: string, prefs: Prefs): Promise<void> {
  const clean: Prefs = {};
  for (const type of Object.keys(NOTIFICATION_TYPES) as NotificationType[]) {
    const p = prefs[type];
    if (p) clean[type] = { inapp: p.inapp !== false, email: p.email === true };
  }
  const { error } = await supabaseAdmin.from('notification_prefs').upsert({ stake_address: stake, prefs: clean, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Couldn't save your settings: ${error.message}. Run supabase/migrations/022_notifications.sql.`);
}

/** Inserts notifications, skipping wallets that turned the type off and anything already sent (same dedupe key). */
export async function notify(rows: NewNotification[]): Promise<number> {
  if (rows.length === 0) return 0;
  const wallets = Array.from(new Set(rows.map((r) => r.stake_address)));
  const prefs = new Map<string, Prefs>();
  for (let i = 0; i < wallets.length; i += 500) {
    const { data } = await supabaseAdmin.from('notification_prefs').select('stake_address, prefs').in('stake_address', wallets.slice(i, i + 500));
    for (const p of data ?? []) prefs.set(p.stake_address as string, (p.prefs ?? {}) as Prefs);
  }
  const wanted = rows.filter((r) => wantsInApp(prefs.get(r.stake_address) ?? {}, r.type));
  let inserted = 0;
  for (let i = 0; i < wanted.length; i += 500) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .upsert(wanted.slice(i, i + 500), { onConflict: 'stake_address,dedupe_key', ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(`Couldn't save notifications: ${error.message}. Run supabase/migrations/022_notifications.sql.`);
    inserted += data?.length ?? 0;
  }
  return inserted;
}

export async function listNotifications(stake: string): Promise<{ items: AppNotification[]; unread: number }> {
  const [{ data, error }, { count }] = await Promise.all([
    supabaseAdmin.from('notifications').select('id, type, title, body, url, created_at, read_at').eq('stake_address', stake).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('stake_address', stake).is('read_at', null),
  ]);
  if (error) return { items: [], unread: 0 };
  return { items: (data ?? []) as AppNotification[], unread: count ?? 0 };
}

export async function markRead(stake: string, id: number | 'all'): Promise<void> {
  let q = supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('stake_address', stake).is('read_at', null);
  if (id !== 'all') q = q.eq('id', id);
  await q;
}
