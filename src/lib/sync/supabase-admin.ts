/**
 * Supabase Admin Client (Service Role)
 * Uses service role key for server-side writes
 * NEVER expose this client to the browser
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
  );
}

/**
 * Admin client with full write access via service role
 * Use for ETL sync jobs and admin operations only
 */
/**
 * Every query skips Next.js's data cache. supabase-js goes through fetch, and
 * Next keeps fetch results on disk until the next deploy, so a GET route could
 * keep serving rows from before the last sync (seen with the scoreboard).
 */
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { global: { fetch: noStoreFetch } });
