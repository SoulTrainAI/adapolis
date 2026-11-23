/**
 * The season race: the leading DReps of a season with every scoring moment,
 * so the page can replay the season day by day. Process points only; nothing
 * here knows or says which way anyone voted (Cardinal Rule).
 */

import { getSeasonData } from './data';
import { epochStart, seasonLabel, type PointEvent } from './points';

export const RACERS = 30;

export interface Racer {
  drep_id: string;
  name: string | null;
  image: string | null;
  points: number;
  events: PointEvent[];
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
  computed_at: string;
}

export async function getRace(window?: number): Promise<Race> {
  const data = await getSeasonData({ window });
  const toSec = (d: Date) => Math.floor(d.getTime() / 1000);
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
    racers: data.standings.slice(0, RACERS).map((s) => ({
      drep_id: s.drep_id,
      name: s.profile.name,
      image: s.profile.image,
      points: s.points,
      events: s.events,
    })),
    computed_at: data.computed_at,
  };
}
