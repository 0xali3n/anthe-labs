"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { upsertUser } from "@/lib/usersApi";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase()
      .auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          
          // Save user to database
          try {
            await upsertUser({
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name,
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
              google_id: session.user.user_metadata?.google_id || session.user.user_metadata?.sub,
            });
          } catch (error) {
            console.error("Failed to save user:", error);
          }
        }
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        // Save user to database when signed in
        try {
          await upsertUser({
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            google_id: session.user.user_metadata?.google_id || session.user.user_metadata?.sub,
          });
        } catch (error) {
          console.error("Failed to save user:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

