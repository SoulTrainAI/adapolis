/** Reading overviews, replies and reports. Server-only. */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import type { Overview, OverviewRecord, OverviewSource } from './types';

export async function getOverview(drepId: string): Promise<OverviewRecord | null> {
  const [{ data, error }, { data: reply }] = await Promise.all([
    supabaseAdmin.from('drep_overviews').select('drep_id, overview, sources, generated_at, season_number, model').eq('drep_id', drepId).maybeSingle(),
    supabaseAdmin.from('drep_overview_replies').select('response, updated_at').eq('drep_id', drepId).maybeSingle(),
  ]);
  if (error || !data) return null;
  return {
    drep_id: data.drep_id as string,
    overview: data.overview as Overview,
    sources: (data.sources ?? []) as OverviewSource[],
    generated_at: data.generated_at as string,
    season_number: (data.season_number as number | null) ?? null,
    model: data.model as string,
    reply: reply ? { response: reply.response as string, updated_at: reply.updated_at as string } : null,
  };
}

export async function saveReply(drepId: string, response: string | null): Promise<void> {
  if (!response) {
    // An empty response removes it; the row history isn't needed (the DRep can post again).
    const { error } = await supabaseAdmin.from('drep_overview_replies').delete().eq('drep_id', drepId);
    if (error) throw new Error(`Couldn't remove your response: ${error.message}`);
    return;
  }
  const { error } = await supabaseAdmin.from('drep_overview_replies').upsert({ drep_id: drepId, response, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Couldn't save your response: ${error.message}. Run migration 023.`);
}

export async function reportError(drepId: string, message: string, by: { stake: string | null; drep: string | null }): Promise<void> {
  const { error } = await supabaseAdmin.from('drep_overview_reports').insert({ drep_id: drepId, message, reporter_stake: by.stake, reporter_drep: by.drep });
  if (error) throw new Error(`Couldn't send your report: ${error.message}`);
}

export async function openReports() {
  const { data } = await supabaseAdmin.from('drep_overview_reports').select('id, drep_id, message, reporter_drep, created_at, status').eq('status', 'open').order('created_at', { ascending: false }).limit(100);
  return data ?? [];
}

export async function resolveReport(id: number, accept: boolean): Promise<string> {
  const { data, error } = await supabaseAdmin.from('drep_overview_reports').update({ status: accept ? 'accepted' : 'dismissed' }).eq('id', id).select('drep_id').single();
  if (error || !data) throw new Error(`Couldn't update the report: ${error?.message ?? 'not found'}`);
  if (accept) await supabaseAdmin.from('drep_overviews').update({ regenerate: true }).eq('drep_id', data.drep_id);
  return data.drep_id as string;
}
