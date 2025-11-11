import { apiRequest, authenticatedRequest } from './apiClient';
import { supabase } from './supabaseClient';

export interface WalletData {
  success: boolean;
  address?: string;
  isNew?: boolean;
  error?: string;
}

/**
 * Create or get wallet for authenticated user
 * If wallet doesn't exist, it will be created automatically
 * Uses JWT token from Supabase session
 */
export async function createOrGetWallet(userId: string): Promise<WalletData> {
  try {
    // Get JWT token from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    // Use authenticated request with JWT token
    const response = await authenticatedRequest<WalletData>(
      '/wallets',
      session.access_token,
      {
        method: 'POST',
        body: JSON.stringify({}), // No userId in body - comes from JWT
      }
    );
    
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create/get wallet',
    };
  }
}

/**
 * Get wallet address for authenticated user
 * Uses JWT token from Supabase session
 */
export async function getWalletAddress(userId: string): Promise<WalletData> {
  try {
    // Get JWT token from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    // Use authenticated request with JWT token
    const response = await authenticatedRequest<WalletData>(
      '/wallets/me',
      session.access_token,
      {
        method: 'GET',
      }
    );
    
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get wallet address',
    };
  }
}

/**
 * Format wallet address for display (shortened version)
 */
export function formatWalletAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

