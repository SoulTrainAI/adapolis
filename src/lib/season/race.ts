/**
 * The season race: the leading DReps of a season with every scoring moment,
 * so the page can replay the season day by day. Points are process-only
 * (Cardinal Rule); vote direction rides along for commentary display only.
 */

import { socialHandle } from '@/lib/drep-profile/social-avatars';
import { tagOptOuts } from '@/lib/drep-profile/mentions';
import { getSeasonData } from './data';
import { epochStart, seasonLabel, type PointEvent } from './points';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

export const RACERS = 30;

export interface Racer {
  drep_id: string;
  name: string | null;
  image: string | null;
  points: number;
  events: PointEvent[];
  /** X handle from the DRep's profile links, for share text; null if none or they opted out of tags */
  x_handle: string | null;
}

export interface Race {
  window: number;
  season: number | null;
  label: string;
  start_epoch: number;
  end_epoch: number;
  current_epoch: number;
  /** Unix seconds */
  starts_at: number;
  ends_at: number;
  now: number;
  /** DReps who have scored this season (the whole field). */
  field: number;
  racers: Racer[];
  /** Titles of the actions the racers voted on or missed, for commentary; `open` ones have a Hot Take. */
  proposals: Record<string, { title: string | null; open: boolean }>;
  computed_at: string;
}

export async function getRace(window?: number): Promise<Race> {
  const [data, optOut] = await Promise.all([getSeasonData({ window }), tagOptOuts()]);
  const handle = (drepId: string, links: Array<{ url: string }>) => {
    const h = socialHandle(links);
    return h && h.source === 'x' && !optOut.has(drepId) ? h.handle : null;
  };
  const toSec = (d: Date) => Math.floor(d.getTime() / 1000);
  const top = data.standings.slice(0, RACERS);
  const ids = Array.from(new Set(top.flatMap((s) => s.events.map((e) => e.proposal_id).filter((id): id is string => !!id))));
  const proposals: Race['proposals'] = {};
  if (ids.length) {
    const { data: rows } = await supabaseAdmin.from('proposals').select('proposal_id, title, status').in('proposal_id', ids);
    for (const r of rows ?? []) proposals[r.proposal_id as string] = { title: (r.title as string | null) ?? null, open: r.status === 'active' };
  }
  return {
    window: data.window,
    season: data.season,
    label: seasonLabel(data.season),
    start_epoch: data.start_epoch,
    end_epoch: data.end_epoch,
    current_epoch: data.current_epoch,
    starts_at: toSec(epochStart(data.start_epoch)),
    ends_at: toSec(epochStart(data.end_epoch + 1)),
    now: Math.floor(Date.now() / 1000),
    field: data.standings.length,
    racers: top.map((s) => ({
      drep_id: s.drep_id,
      name: s.profile.name,
      image: s.profile.image,
      points: s.points,
      events: s.events,
      x_handle: handle(s.drep_id, s.profile.links ?? []),
    })),
    proposals,
    computed_at: data.computed_at,
  };
}
