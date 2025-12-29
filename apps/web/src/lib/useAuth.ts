import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { upsertUser } from './usersApi';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isSignedIn: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Shared auth hook that caches session state and provides it to all components
 * This prevents redundant getSession() calls and optimizes performance
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    isSignedIn: false,
    loading: true,
    error: null,
  });
  const upsertingRef = useRef<Set<string>>(new Set()); // Track users being upserted

  // Helper function to upsert user with duplicate prevention
  const upsertUserSafely = useCallback(async (userId: string, userData: Parameters<typeof upsertUser>[0]) => {
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
  }, []);

  // Initialize auth state once on mount
  useEffect(() => {
    let mounted = true;

    // Get initial session (cached by Supabase)
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      setAuthState({
        session,
        isSignedIn: !!session,
        loading: false,
        error: error?.message || null,
      });

      // Save user to database if session exists (non-blocking - don't await)
      // This allows UI to render immediately while DB operation happens in background
      if (session?.user) {
        upsertUserSafely(session.user.id, {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          google_id: session.user.user_metadata?.google_id || session.user.user_metadata?.sub,
        }).catch((error) => {
          // Error already logged in upsertUserSafely, just catch to prevent unhandled rejection
          console.error('[useAuth] Background upsert failed:', error);
        });
      }
    });

    // Listen for auth changes - this is the single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setAuthState({
        session,
        isSignedIn: !!session,
        loading: false,
        error: null,
      });

      // Save user to database when signed in (non-blocking - don't await)
      // This allows UI to render immediately while DB operation happens in background
      if (session?.user) {
        upsertUserSafely(session.user.id, {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          google_id: session.user.user_metadata?.google_id || session.user.user_metadata?.sub,
        }).catch((error) => {
          // Error already logged in upsertUserSafely, just catch to prevent unhandled rejection
          console.error('[useAuth] Background upsert failed:', error);
        });
      }
    });

    // Handle tab visibility - refresh session when tab becomes visible
    const handleVisibilityChange = async () => {
      if (!mounted || document.hidden) return;

      // Only refresh if we don't have a session or it might be stale
      // Don't reset state if we already have a valid session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        // Only update if session actually changed
        setAuthState((prev) => {
          // If we already have a session and the new one is the same, don't update
          if (prev.session?.access_token === session?.access_token) {
            return prev;
          }
          
          return {
            session,
            isSignedIn: !!session,
            loading: false,
            error: error?.message || null,
          };
        });
      } catch (error: any) {
        if (!mounted) return;
        console.error('[useAuth] Failed to refresh session on visibility change:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Get current session token (cached)
  const getToken = useCallback((): string | null => {
    return authState.session?.access_token || null;
  }, [authState.session]);

  // Refresh session manually if needed
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      setAuthState({
        session,
        isSignedIn: !!session,
        loading: false,
        error: error?.message || null,
      });
      return session;
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        error: error.message || 'Failed to refresh session',
      }));
      return null;
    }
  }, []);

  return {
    ...authState,
    getToken,
    refreshSession,
  };
}

