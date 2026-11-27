import { describe, expect, it } from 'vitest';
import { applyFilters, DEFAULT_SPEC, fromQuery, toQuery, type FilterCard, type FilterSpec } from './filter';
import { placeholderCard } from '@/components/cards/useCards';
import { classFor } from './classes';

const card = (id: string, over: Partial<FilterCard>): FilterCard => ({
  ...placeholderCard({ drep_id: id, name: id, image: null, ada: 1000, delegators: 1, registered: true, do_not_list: false }),
  votes_cast: 10,
  ...over,
});
const cards: FilterCard[] = [
  card('whale', { ada: 50_000_000, delegators: 40, govscore: 70, underdog: 1.0, drep_class: classFor(50_000_000, 40), abilities: [{ id: 'scholar', label: 'Scholar', detail: '', tier: 3 }] }),
  card('crowd', { ada: 300_000, delegators: 400, govscore: 55, underdog: 1.4, drep_class: classFor(300_000, 400), abilities: [{ id: 'scholar', label: 'Scholar', detail: '', tier: 1 }, { id: 'rookie', label: 'Rookie', detail: '', tier: null }] }),
  card('quiet', { ada: 5_000, delegators: 3, govscore: null, underdog: 1.5, drep_class: classFor(5_000, 3), votes_cast: 0 }),
];
const spec = (over: Partial<FilterSpec>): FilterSpec => ({ ...DEFAULT_SPEC, pool: 'registered', ...over });

describe('card filters', () => {
  it('classes run from whales to crowds, on ADA per delegator alone', () => {
    expect(classFor(50_000_000, 40)?.id).toBe('whale_watcher');
    expect(classFor(300_000, 400)?.id).toBe('rabble_rouser');
    expect(classFor(5_000, 3)?.id).toBe('freedom_fighter');
    expect(classFor(2_000_000, 1)?.id).toBe('whale_watcher');
    expect(classFor(0, 0)).toBeNull();
  });

  it('combines a range, a badge tier and a class', () => {
    const ids = (s: FilterSpec) => applyFilters(cards, s).map((c) => c.drep_id);
    expect(ids(spec({ badges: { scholar: 2 } }))).toEqual(['whale']);
    expect(ids(spec({ badges: { scholar: 0, rookie: 0 } }))).toEqual(['crowd']);
    expect(ids(spec({ ranges: { underdog: [1.3, null] } }))).toEqual(['crowd', 'quiet']);
    expect(ids(spec({ classes: ['rabble_rouser', 'freedom_fighter'] }))).toEqual(['crowd', 'quiet']);
  });

  it('the active pool leaves out DReps who never voted', () => {
    expect(applyFilters(cards, spec({ pool: 'active' })).map((c) => c.drep_id)).toEqual(['whale', 'crowd']);
  });

  it('sorts by any stat with missing values last in both directions', () => {
    expect(applyFilters(cards, spec({ sort: 'govscore', order: 'asc' })).map((c) => c.drep_id)).toEqual(['crowd', 'whale', 'quiet']);
    expect(applyFilters(cards, spec({ sort: 'underdog' })).map((c) => c.drep_id)).toEqual(['quiet', 'crowd', 'whale']);
  });

  it('round-trips through a shareable URL', () => {
    const s = spec({ search: 'x', sort: 'underdog', ranges: { ada: [1000, null], participation: [0.5, 0.9] }, badges: { scholar: 2, rookie: 0 }, classes: ['peoples_hero'], stars: [1, 2] });
    expect(fromQuery(toQuery(s), DEFAULT_SPEC)).toEqual({ ...s });
  });
});
