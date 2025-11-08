import { authenticatedRequest } from './apiClient';
import { supabase } from './supabaseClient';

/**
 * Connect Twitter account - gets OAuth URL and redirects to Twitter
 */
export async function connectTwitter(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No session found');
  }

  // Make authenticated API call to get OAuth URL
  const response = await authenticatedRequest<{ success: boolean; authUrl: string }>(
    '/twitter/connect',
    session.access_token
  );

  if (!response.success || !response.authUrl) {
    throw new Error('Failed to get Twitter OAuth URL');
  }

  // Redirect to Twitter OAuth page
  window.location.href = response.authUrl;
}

/**
 * Disconnect Twitter account
 */
export async function disconnectTwitter(): Promise<{ success: boolean; message: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No session found');
  }

  const response = await authenticatedRequest<{ success: boolean; message: string }>(
    '/twitter/disconnect',
    session.access_token
  );

  return response;
}

