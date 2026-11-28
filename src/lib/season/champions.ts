/**
 * Reading the season-end snapshots: public Champion Cards with per-card copy
 * totals, and the claims one wallet or DRep holds. Server-only.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { isMissingSchema } from './schema';
import type { Edition } from './finalize';

export interface Champion {
  season_number: number;
  rank: number;
  drep_id: string;
  name: string | null;
  image: string | null;
  edition: Edition;
  season_points: number;
  /** Copies that can be claimed in total (DRep 5 + teams + delegators). */
  supply: number;
}

export interface Claim {
  season_number: number;
  drep_id: string;
  name: string | null;
  /** All-Star edition; null for a basic Season Card. */
  edition: Edition | null;
  claimant_type: 'drep' | 'team' | 'delegator' | 'house';
  copies: number;
  claim_closes_at: string | null;
  claimed_at: string | null;
}

export async function getChampions(season: number | null): Promise<{ season_number: number; champions: Champion[] } | null> {
  let n = season;
  if (n === null) {
    const { data, error } = await supabaseAdmin.from('season_champions').select('season_number').order('season_number', { ascending: false }).limit(1);
    if (error) {
      if (isMissingSchema(error)) return null;
      throw new Error(`Couldn't load champions: ${error.message}`);
    }
    if (!data?.length) return null;
    n = data[0].season_number as number;
  }
  const [{ data: rows, error }, { data: claims, error: claimError }] = await Promise.all([
    supabaseAdmin.from('season_champions').select('season_number, rank, drep_id, edition, season_points, card').eq('season_number', n).order('rank'),
    supabaseAdmin.from('season_claims').select('drep_id, copies').eq('season_number', n),
  ]);
  if (error || claimError) {
    if (isMissingSchema(error ?? claimError)) return null;
    throw new Error(`Couldn't load champions: ${(error ?? claimError)?.message}`);
  }
  const supply = new Map<string, number>();
  for (const c of claims ?? []) supply.set(c.drep_id as string, (supply.get(c.drep_id as string) ?? 0) + Number(c.copies));
  return {
    season_number: n,
    champions: (rows ?? []).map((r) => {
      const card = (r.card ?? {}) as { name?: string | null; image?: string | null };
      return {
        season_number: n as number,
        rank: Number(r.rank),
        drep_id: r.drep_id as string,
        name: card.name ?? null,
        image: card.image ?? null,
        edition: r.edition as Edition,
        season_points: Number(r.season_points),
        supply: supply.get(r.drep_id as string) ?? 0,
      };
    }),
  };
}

/** Every Champion Card copy a wallet (teams, delegators) or a DRep (their 5) may claim. */
export async function getClaims(claimants: string[]): Promise<Claim[]> {
  if (claimants.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('season_claims')
    .select('season_number, drep_id, claimant_type, copies, claim_closes_at, claimed_at')
    .in('claimant', claimants)
    .order('season_number', { ascending: false });
  if (error) {
    if (isMissingSchema(error)) return [];
    throw new Error(`Couldn't load your claims: ${error.message}`);
  }
  const keys = (data ?? []).map((c) => `${c.season_number}:${c.drep_id}`);
  const { data: champs } = keys.length
    ? await supabaseAdmin.from('season_champions').select('season_number, drep_id, edition, card').in('drep_id', (data ?? []).map((c) => c.drep_id as string))
    : { data: [] };
  const champ = new Map((champs ?? []).map((c) => [`${c.season_number}:${c.drep_id}`, c]));
  // Basic Season Cards keep their name in season_cards (migration 026; empty before it).
  const { data: basics } = keys.length
    ? await supabaseAdmin.from('season_cards').select('season_number, drep_id, card').in('drep_id', (data ?? []).map((c) => c.drep_id as string))
    : { data: [] };
  const basic = new Map((basics ?? []).map((c) => [`${c.season_number}:${c.drep_id}`, c]));
  return (data ?? []).map((c) => {
    const ch = champ.get(`${c.season_number}:${c.drep_id}`);
    return {
      season_number: Number(c.season_number),
      drep_id: c.drep_id as string,
      name: ((ch?.card ?? basic.get(`${c.season_number}:${c.drep_id}`)?.card ?? {}) as { name?: string | null }).name ?? null,
      edition: (ch?.edition as Edition | undefined) ?? null,
      claimant_type: c.claimant_type as Claim['claimant_type'],
      copies: Number(c.copies),
      claim_closes_at: (c.claim_closes_at as string | null) ?? null,
      claimed_at: (c.claimed_at as string | null) ?? null,
    };
  });
}
