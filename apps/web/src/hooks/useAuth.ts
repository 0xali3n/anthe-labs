"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { upsertUser } from "@/lib/usersApi";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const upsertingRef = useRef<Set<string>>(new Set()); // Track users being upserted

  // Helper function to upsert user with duplicate prevention
  const upsertUserSafely = async (userId: string, userData: Parameters<typeof upsertUser>[0]) => {
    // Prevent duplicate concurrent calls for the same user
    if (upsertingRef.current.has(userId)) {
      console.log(`⏭️ Skipping duplicate upsert for user ${userId}`);
      return;
    }

    upsertingRef.current.add(userId);
    try {
      await upsertUser(userData);
    } catch (error: any) {
      // Log error but don't throw - unique constraint errors are handled in backend
      if (error.message?.includes("Unique constraint")) {
        console.log(`ℹ️ User ${userId} already exists (handled gracefully)`);
      } else {
        console.error("Failed to save user:", error);
      }
    } finally {
      // Remove after a short delay to allow for concurrent requests to settle
      setTimeout(() => {
        upsertingRef.current.delete(userId);
      }, 1000);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          
          // Save user to database
          await upsertUserSafely(session.user.id, {
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            google_id: session.user.user_metadata?.google_id || session.user.user_metadata?.sub,
          });
        }
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        // Save user to database when signed in
        await upsertUserSafely(session.user.id, {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          google_id: session.user.user_metadata?.google_id || session.user.user_metadata?.sub,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

