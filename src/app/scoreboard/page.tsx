/**
 * DRep Hall of Fame (lifetime stats; route kept at /scoreboard)
 * Server-rendered shell with client-side filtering, sorting, and pagination
 */

import { createClient } from '@supabase/supabase-js';
import { ScoreboardClient } from '@/components/scoreboard/ScoreboardClient';

export const revalidate = 300;

export const metadata = {
  title: 'DRep Hall of Fame — ADApolis',
  description: 'Every Cardano DRep ranked by lifetime GovScore, with your own Alignment after the Find My DRep quiz.',
};

async function getCurrentEpoch(): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return 0;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: latestEpochData } = await supabaseAdmin
    .from('drep_scores')
    .select('epoch')
    .order('epoch', { ascending: false })
    .limit(1);

  return latestEpochData?.[0]?.epoch || 0;
}

export default async function ScoreboardPage() {
  const currentEpoch = await getCurrentEpoch();

  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">DRep Hall of Fame</h1>
          <p className="text-lg text-slate-300 mb-4">
            Every Cardano DRep&apos;s lifetime record, ranked by GovScore: long-term participation, adjusted for ADA-power dampening. Took the Find My DRep quiz? Rank by your own Alignment too.
          </p>
        </div>

        {/* Client component handles filtering, sorting, and pagination */}
        <ScoreboardClient initialEpoch={currentEpoch} />
      </div>
    </div>
  );
}
