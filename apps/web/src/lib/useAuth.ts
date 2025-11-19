import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
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

  // Initialize auth state once on mount
  useEffect(() => {
    let mounted = true;

    // Get initial session (cached by Supabase)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      setAuthState({
        session,
        isSignedIn: !!session,
        loading: false,
        error: error?.message || null,
      });
    });

    // Listen for auth changes - this is the single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setAuthState({
        session,
        isSignedIn: !!session,
        loading: false,
        error: null,
      });
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

