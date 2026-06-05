/**
 * Run GovScore v1 scoring for a given epoch and report top 10 DReps
 * Usage: npx ts-node scripts/run-scoring-v1.ts [epoch]
 */

import { computeGovScoresForEpoch } from '@/lib/scoring/govscore-v1';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

async function main() {
  const epochArg = process.argv[2];
  let epoch = 600; // Default epoch for testing

  if (epochArg) {
    const parsed = parseInt(epochArg, 10);
    if (!isNaN(parsed)) {
      epoch = parsed;
    }
  }

  console.log(`\n🎯 Running GovScore v1 for epoch ${epoch}...\n`);

  try {
    // Step 1: Compute scores
    const result = await computeGovScoresForEpoch(epoch);
    console.log(`\n✅ Scoring complete: ${result.dreps_scored} DReps scored`);
    console.log(`   Average participation: ${(result.avg_participation * 100).toFixed(2)}%\n`);

    // Step 2: Fetch top 10 by raw_govscore
    const { data: topDReps, error } = await supabaseAdmin
      .from('drep_scores')
      .select(
        `
        drep_id,
        raw_govscore,
        participation_rate,
        dreps(hex_id, amount_lovelace)
      `
      )
      .eq('epoch', epoch)
      .order('raw_govscore', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch top DReps: ${error.message}`);
    }

    if (!topDReps || topDReps.length === 0) {
      console.log('❌ No scores found for this epoch.');
      process.exit(1);
    }

    // Step 3: Display results
    console.log('📊 TOP 10 DReps by Raw GovScore (Participation Rate)\n');
    console.log('┌─────┬──────────────────┬────────┬──────────┬──────────────┐');
    console.log('│Rank │ DRep ID (truncated) │ Score  │ Part. % │ ADA Delegated│');
    console.log('├─────┼──────────────────┼────────┼──────────┼──────────────┤');

    topDReps.forEach((row, index) => {
      const drepId = (row.drep_id as string).substring(0, 16);
      const score = (row.raw_govscore as number).toFixed(2);
      const partRate = ((row.participation_rate as number) * 100).toFixed(1);
      const adaRecord = row.dreps as { hex_id?: string; amount_lovelace?: number } | null;
      const adaAmount = adaRecord?.amount_lovelace ? (adaRecord.amount_lovelace / 1_000_000_000_000).toFixed(2) : '0.00';

      console.log(`│ ${String(index + 1).padStart(2)} │ ${drepId.padEnd(16)} │ ${score.padStart(6)} │ ${partRate.padStart(8)} │ ${adaAmount.padStart(12)} │`);
    });

    console.log('└─────┴──────────────────┴────────┴──────────┴──────────────┘\n');

    console.log(`📈 Summary:`);
    console.log(`   Epoch: ${epoch}`);
    console.log(`   Total DReps scored: ${result.dreps_scored}`);
    console.log(`   Average participation: ${(result.avg_participation * 100).toFixed(2)}%`);
    console.log(`   Top DRep score: ${(topDReps[0]?.raw_govscore as number).toFixed(2)}`);
    console.log(`   Top DRep participation: ${((topDReps[0]?.participation_rate as number) * 100).toFixed(1)}%\n`);

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}\n`);
    process.exit(1);
  }
}

main();
