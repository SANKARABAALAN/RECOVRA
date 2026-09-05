import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

/**
 * Trusted server-only client for webhook and worker code.  Never import this
 * from a client component and never expose its key through NEXT_PUBLIC_*.
 */
export function getSupabaseAdmin() {
  const key = env.supabaseServiceRoleKey || env.supabaseAnonKey;
  if (!key) {
    throw new Error("Supabase credentials are required for admin operations");
  }
  return createClient(env.supabaseUrl, key, {
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
