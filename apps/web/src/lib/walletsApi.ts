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
 * Get wallet account balance (raw USDT in wallet) from Kana API
 * Uses JWT token from Supabase session
 */
export async function getWalletAccountBalance(): Promise<{
  success: boolean;
  balance?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      error?: string;
    }>('/wallets/wallet-balance', session.access_token, {
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    console.error('Error fetching wallet account balance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch wallet balance',
      balance: '0.00',
    };
  }
}

/**
 * Get trading account balance from Kana API
 * Uses JWT token from Supabase session
 */
export async function getTradingBalance(): Promise<{
  success: boolean;
  balance?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      error?: string;
    }>('/wallets/trading-balance', session.access_token, {
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    console.error('Error fetching trading balance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch trading balance',
      balance: '0.00',
    };
  }
}

/**
 * Check wallet balance and auto-deposit to trading account
 * Uses JWT token from Supabase session
 */
export async function checkWalletAndDeposit(): Promise<{
  success: boolean;
  walletBalance?: string;
  tradingBalance?: string;
  deposited?: boolean;
  depositAmount?: number;
  txHash?: string;
  version?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      walletBalance?: string;
      tradingBalance?: string;
      deposited?: boolean;
      depositAmount?: number;
      txHash?: string;
      version?: string;
      error?: string;
    }>('/wallets/check-and-deposit', session.access_token, {
      method: 'POST',
    });

    return response;
  } catch (error: any) {
    console.error('Error checking wallet and depositing:', error);
    return {
      success: false,
      error: error.message || 'Failed to check wallet and deposit',
    };
  }
}

/**
 * Get debug info including encrypted private key (for debugging only)
 * Uses JWT token from Supabase session
 */
export async function getDebugInfo(): Promise<{
  success: boolean;
  walletAddress?: string;
  encryptedPrivateKey?: string;
  note?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      walletAddress?: string;
      encryptedPrivateKey?: string;
      note?: string;
      error?: string;
    }>('/wallets/debug/info', session.access_token, {
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    console.error('Error fetching debug info:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch debug info',
    };
  }
}

/**
 * Test deposit with specific amount (for debugging)
 * Uses JWT token from Supabase session
 */
export async function testDeposit(amount: number): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      error?: string;
    }>('/wallets/debug/deposit', session.access_token, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });

    return response;
  } catch (error: any) {
    console.error('Error testing deposit:', error);
    return {
      success: false,
      error: error.message || 'Failed to test deposit',
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

/**
 * Withdraw from Kana trading account to wallet
 * POST /api/wallets/withdraw
 *
 * @param amount - Amount to withdraw in USDT
 * @param marketId - Market ID (e.g., "14" for APT-USD)
 * @returns Withdrawal result with transaction hash
 */
export async function withdrawFromKana(
  amount: number,
  marketId: string,
): Promise<{ success: boolean; txHash?: string; version?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      version?: string;
      error?: string;
    }>(
      '/wallets/withdraw',
      session.access_token,
      {
        method: 'POST',
        body: JSON.stringify({ amount, marketId }),
      }
    );

    return response;
  } catch (error: any) {
    console.error('Error withdrawing from Kana:', error);
    return {
      success: false,
      error: error.message || 'Failed to withdraw from trading account',
    };
  }
}

/**
 * Transfer USDT from user's wallet to a destination address
 * POST /api/wallets/transfer
 *
 * @param recipientAddress - Destination wallet address
 * @param amount - Amount to transfer in USDT
 * @returns Transfer result with transaction hash
 */
export async function transferUSDTToAddress(
  recipientAddress: string,
  amount: number,
): Promise<{ success: boolean; txHash?: string; version?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: 'No session found. Please sign in.',
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      version?: string;
      error?: string;
    }>(
      '/wallets/transfer',
      session.access_token,
      {
        method: 'POST',
        body: JSON.stringify({ recipientAddress, amount }),
      }
    );

    return response;
  } catch (error: any) {
    console.error('Error transferring USDT:', error);
    return {
      success: false,
      error: error.message || 'Failed to transfer USDT',
    };
  }
}

