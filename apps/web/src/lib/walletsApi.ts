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
 * Get USDT balance for authenticated user's wallet
 * Fetches real-time balance from Aptos blockchain via backend
 * Uses JWT token from Supabase session
 */
export async function getUSDTBalance(): Promise<{ success: boolean; balance?: string; error?: string }> {
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
    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      address?: string;
      error?: string;
    }>(
      '/wallets/balance',
      session.access_token,
      {
        method: 'GET',
      }
    );
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch balance',
      };
    }

    return {
      success: true,
      balance: response.balance || '0.00',
    };
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch balance',
      balance: '0.00', // Return 0.00 as fallback
    };
  }
}

/**
 * Check deposit and trigger airdrop if it's the first deposit
 * This checks the balance and automatically sends 0.05 APT airdrop on first deposit
 * Uses JWT token from Supabase session
 */
export async function checkDepositAndAirdrop(): Promise<{
  success: boolean;
  balance?: string;
  airdropped?: boolean;
  airdropTxHash?: string;
  error?: string;
}> {
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
    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      airdropped?: boolean;
      airdropTxHash?: string;
      error?: string;
    }>(
      '/wallets/check-deposit',
      session.access_token,
      {
        method: 'POST',
      }
    );
    
    return response;
  } catch (error: any) {
    console.error('Error checking deposit:', error);
    return {
      success: false,
      error: error.message || 'Failed to check deposit',
    };
  }
}

/**
 * Withdraw USDT from user's wallet to external address
 * Uses JWT token from Supabase session
 */
export async function withdrawUSDT(
  recipientAddress: string,
  amount: string,
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
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
    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      error?: string;
    }>(
      '/wallets/withdraw',
      session.access_token,
      {
        method: 'POST',
        body: JSON.stringify({
          recipientAddress,
          amount,
        }),
      }
    );
    
    return response;
  } catch (error: any) {
    console.error('Error withdrawing USDT:', error);
    return {
      success: false,
      error: error.message || 'Failed to withdraw USDT',
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

