/**
 * Whether a DRep lets ADApolis tag them in automatic commentary posts. Tagging
 * is on unless the DRep turned it off after claiming their card.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';

const MISSING = 'Table drep_mentions is missing: run supabase/migrations/018_drep_mentions.sql in the Supabase SQL Editor.';

/** DReps who turned tagging off. A missing table means nobody has yet. */
export async function tagOptOuts(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from('drep_mentions').select('drep_id').eq('allow_tags', false);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { drep_id: string }) => r.drep_id));
}

export async function allowsTags(drepId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('drep_mentions').select('allow_tags').eq('drep_id', drepId).maybeSingle();
  if (error || !data) return true;
  return (data as { allow_tags: boolean }).allow_tags;
}

export async function setAllowsTags(drepId: string, allow: boolean): Promise<void> {
  const { error } = await supabaseAdmin.from('drep_mentions').upsert({ drep_id: drepId, allow_tags: allow, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.code === '42P01' ? MISSING : `Couldn't save your tagging choice: ${error.message}`);
}
