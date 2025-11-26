/**
 * Shared authentication utilities
 */

import { supabase } from "../supabaseClient";

/**
 * Get authentication token from Supabase session
 */
export async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

