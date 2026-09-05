import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

/**
 * Trusted server-only client for webhook and worker code.  Never import this
 * from a client component and never expose its key through NEXT_PUBLIC_*.
 */
export function getSupabaseAdmin() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for trusted server operations");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Creates a client whose RLS context is the validated caller JWT. */
export function getSupabaseForToken(token: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
