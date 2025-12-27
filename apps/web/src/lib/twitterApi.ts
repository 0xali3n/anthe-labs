import { authenticatedRequest } from './apiClient';
import { supabase } from './supabaseClient';

/**
 * Connect Twitter account - opens OAuth in popup window (professional pattern)
 */
export async function connectTwitter(): Promise<{ success: boolean; username?: string; error?: string }> {
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

  // Open OAuth in popup window (professional pattern)
  return new Promise((resolve, reject) => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      response.authUrl,
      'Twitter OAuth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,status=no`
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for messages from popup
    const messageListener = (event: MessageEvent) => {
      // Normalize origin to handle both www and non-www versions
      const normalizeOrigin = (origin: string): string => {
        try {
          const url = new URL(origin);
          // Remove www. prefix if present
          if (url.hostname.startsWith('www.')) {
            url.hostname = url.hostname.substring(4);
          }
          return url.origin;
        } catch {
          return origin;
        }
      };

      // Security: Only accept messages from our frontend URL (normalized)
      const frontendUrl = normalizeOrigin(window.location.origin);
      const eventOrigin = normalizeOrigin(event.origin);
      if (eventOrigin !== frontendUrl) {
        return;
      }

      if (event.data.type === 'TWITTER_OAUTH_SUCCESS') {
        window.removeEventListener('message', messageListener);
        popup.close();
        resolve({ success: true, username: event.data.username });
      } else if (event.data.type === 'TWITTER_OAUTH_ERROR') {
        window.removeEventListener('message', messageListener);
        popup.close();
        reject(new Error(event.data.error || 'Twitter connection failed'));
      }
    };

    window.addEventListener('message', messageListener);

    // Check if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        reject(new Error('Connection cancelled'));
      }
    }, 500);

    // Cleanup after 10 minutes
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        reject(new Error('Connection timeout'));
      }
    }, 600000);
  });
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
    session.access_token,
    {
      method: 'POST',
    }
  );

  return response;
}

