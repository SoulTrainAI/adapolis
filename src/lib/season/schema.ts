/** True when a Supabase error means a newer migration (here 014) hasn't been run yet. */
export function isMissingSchema(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error && (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST200' || error.code === 'PGRST204' || /does not exist|could not find/i.test(error.message ?? ''))
  );
}

export const MIGRATION_HINT = 'Run supabase/migrations/014_leagues_swaps_champions.sql in the Supabase SQL Editor.';
