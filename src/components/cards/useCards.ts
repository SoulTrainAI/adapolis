'use client';

import { useEffect, useState } from 'react';
import type { CardDetail, CardsPayload, CardSummary } from '@/lib/cards/types';

// One fetch per page load, shared by every card on the page.
let cardsPromise: Promise<Map<string, CardSummary>> | null = null;
const detailCache = new Map<string, Promise<CardDetail>>();

function loadCards(): Promise<Map<string, CardSummary>> {
  if (!cardsPromise) {
    cardsPromise = fetch('/api/cards')
      .then(async (r) => {
        if (!r.ok) throw new Error(`Card stats unavailable (HTTP ${r.status})`);
        const body = (await r.json()) as CardsPayload;
        return new Map(body.cards.map((c) => [c.drep_id, c]));
      })
      .catch((e: unknown) => {
        cardsPromise = null;
        throw e;
      });
  }
  return cardsPromise;
}

/** Card stats for every registered DRep, keyed by id. Empty map until loaded or if loading fails. */
export function useCards(): { cards: Map<string, CardSummary>; loaded: boolean } {
  const [cards, setCards] = useState<Map<string, CardSummary>>(new Map());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    loadCards()
      .then((m) => live && setCards(m))
      .catch(() => undefined)
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);
  return { cards, loaded };
}

export function useCardDetail(drepId: string, enabled: boolean): { detail: CardDetail | null; error: string | null } {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let p = detailCache.get(drepId);
    if (!p) {
      p = fetch(`/api/cards/${drepId}`).then(async (r) => {
        const body = (await r.json()) as CardDetail & { error?: string };
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        return body;
      });
      detailCache.set(drepId, p);
      p.catch(() => detailCache.delete(drepId));
    }
    p.then((d) => live && setDetail(d)).catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [drepId, enabled]);
  return { detail, error };
}

/** Minimal card for a DRep the stats engine doesn't cover (e.g. retired), so every row can still render as a card. */
export function placeholderCard(p: { drep_id: string; name: string | null; image: string | null; ada?: number; delegators?: number; registered?: boolean; do_not_list?: boolean }): CardSummary {
  return {
    drep_id: p.drep_id,
    name: p.name,
    image: p.image,
    registered: p.registered ?? true,
    do_not_list: p.do_not_list ?? false,
    rank: null,
    total: 0,
    ada: p.ada ?? 0,
    delegators: p.delegators ?? 0,
    govscore: null,
    govscore_trend: [],
    delta1: null,
    delta3: null,
    participation: null,
    votes_cast: 0,
    votes_eligible: 0,
    streak: 0,
    season: { window: 0, label: '', points: 0, votes: 0, rationales: 0, early: 0, missed: 0, rank: null },
    points_trend: [],
    last_points: null,
    avg_points: null,
    best_points: 0,
    form: null,
    projection: null,
    lifetime: { votes: 0, points: 0, seasons: 0, rationale_rate: null, early_rate: null, missed: 0, first_epoch: null, tenure_epochs: 0 },
    rookie: false,
    underdog: 1,
    ownership: null,
    archetype: null,
    abilities: [],
  };
}
