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
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
