import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Create a SINGLETON Supabase client instance
// This prevents multiple GoTrueClient instances which causes auth issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  // Only create one instance - singleton pattern
  // This is critical: multiple instances cause "Multiple GoTrueClient instances" warnings
  // and can break authentication flows
  if (typeof window !== "undefined" && !supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: "supabase.auth.token",
        flowType: "pkce",
      },
    });
    console.log("✅ Supabase client initialized (singleton)");
  }
  
  // Return existing instance or create a new one for SSR (won't be used for auth)
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  
  return supabaseInstance;
}

// Export singleton instance (not a function that creates new instances)
export const supabase = getSupabaseClient();
