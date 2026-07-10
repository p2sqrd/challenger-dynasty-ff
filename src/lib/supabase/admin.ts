import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Bypasses RLS with the secret key. Server-only — never import this from
 * client components or anything bundled to the browser. Used by one-off
 * scripts (Sleeper backfill) and approval endpoints that must write across
 * managers' rows.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
