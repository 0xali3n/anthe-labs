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

    let messageReceived = false;
    let checkClosedInterval: NodeJS.Timeout | null = null;

    // Listen for messages from popup
    const messageListener = (event: MessageEvent) => {
      // Security: Only accept messages from our frontend URL
      const frontendUrl = window.location.origin;
      
      // Filter out messages that don't have the expected type (like HMR messages)
      if (!event.data || typeof event.data !== 'object' || !event.data.type) {
        // Silently ignore messages without type (likely from HMR or other scripts)
        return;
      }
      
      if (event.origin !== frontendUrl) {
        return;
      }

      if (event.data.type === 'TWITTER_OAUTH_SUCCESS') {
        messageReceived = true;
        if (checkClosedInterval) {
          clearInterval(checkClosedInterval);
        }
        window.removeEventListener('message', messageListener);
        // Popup should close itself, but close it here too just in case
        if (!popup.closed) {
          popup.close();
        }
        resolve({ success: true, username: event.data.username });
      } else if (event.data.type === 'TWITTER_OAUTH_ERROR') {
        messageReceived = true;
        if (checkClosedInterval) {
          clearInterval(checkClosedInterval);
        }
        window.removeEventListener('message', messageListener);
        // Popup should close itself, but close it here too just in case
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error(event.data.error || 'Twitter connection failed'));
      }
    };

    window.addEventListener('message', messageListener);

    // Check if popup is closed manually (but only after a delay to allow message to be sent)
    // Start checking after 2 seconds to give time for redirect and message
    setTimeout(() => {
      checkClosedInterval = setInterval(() => {
        if (popup.closed && !messageReceived) {
          // Wait a bit more to see if message arrives
          setTimeout(() => {
            if (!messageReceived) {
              if (checkClosedInterval) {
                clearInterval(checkClosedInterval);
              }
              window.removeEventListener('message', messageListener);
              reject(new Error('Connection cancelled'));
            }
          }, 2000); // Wait 2 more seconds
        }
      }, 1000); // Check every 1 second
    }, 2000); // Start checking after 2 seconds

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

