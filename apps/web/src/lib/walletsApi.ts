import { apiRequest, authenticatedRequest } from "./apiClient";
import { supabase } from "./supabaseClient";

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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    // Use authenticated request with JWT token
    const response = await authenticatedRequest<WalletData>(
      "/wallets",
      session.access_token,
      {
        method: "POST",
        body: JSON.stringify({}), // No userId in body - comes from JWT
      }
    );

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create/get wallet",
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    // Use authenticated request with JWT token
    const response = await authenticatedRequest<WalletData>(
      "/wallets/me",
      session.access_token,
      {
        method: "GET",
      }
    );

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get wallet address",
    };
  }
}

/**
 * Get USDT balance for authenticated user's wallet
 * Fetches real-time balance from Aptos blockchain via backend
 * Uses JWT token from Supabase session
 */
export async function getUSDTBalance(): Promise<{
  success: boolean;
  balance?: string;
  error?: string;
}> {
  try {
    // Get JWT token from Supabase session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    // Use authenticated request with JWT token
    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      address?: string;
      error?: string;
    }>("/wallets/balance", session.access_token, {
      method: "GET",
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || "Failed to fetch balance",
      };
    }

    return {
      success: true,
      balance: response.balance || "0.00",
    };
  } catch (error: any) {
    console.error("Error fetching balance:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch balance",
      balance: "0.00", // Return 0.00 as fallback
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    // Use authenticated request with JWT token
    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      airdropped?: boolean;
      airdropTxHash?: string;
      error?: string;
    }>("/wallets/check-deposit", session.access_token, {
      method: "POST",
    });

    return response;
  } catch (error: any) {
    console.error("Error checking deposit:", error);
    return {
      success: false,
      error: error.message || "Failed to check deposit",
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      error?: string;
    }>("/wallets/wallet-balance", session.access_token, {
      method: "GET",
    });

    return response;
  } catch (error: any) {
    console.error("Error fetching wallet account balance:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch wallet balance",
      balance: "0.00",
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      balance?: string;
      error?: string;
    }>("/wallets/trading-balance", session.access_token, {
      method: "GET",
    });

    return response;
  } catch (error: any) {
    console.error("Error fetching trading balance:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch trading balance",
      balance: "0.00",
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
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
    }>("/wallets/check-and-deposit", session.access_token, {
      method: "POST",
    });

    return response;
  } catch (error: any) {
    console.error("Error checking wallet and depositing:", error);
    return {
      success: false,
      error: error.message || "Failed to check wallet and deposit",
    };
  }
}

/**
 * Format wallet address for display (shortened version)
 */
export function formatWalletAddress(address: string): string {
  if (!address) return "";
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
  marketId: string
): Promise<{
  success: boolean;
  txHash?: string;
  version?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      version?: string;
      error?: string;
    }>("/wallets/withdraw", session.access_token, {
      method: "POST",
      body: JSON.stringify({ amount, marketId }),
    });

    return response;
  } catch (error: any) {
    console.error("Error withdrawing from Kana:", error);
    return {
      success: false,
      error: error.message || "Failed to withdraw from trading account",
    };
  }
}

/**
 * Get positions payload (debug only - returns raw response from Kana API)
 * GET /api/wallets/positions-payload
 *
 * @param marketId - Optional market ID to filter positions
 * @returns Raw response from Kana API
 */
export async function getPositionsPayload(marketId?: string): Promise<{
  success: boolean;
  data?: any;
  rawResponse?: any;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const url = marketId
      ? `/wallets/positions-payload?marketId=${marketId}`
      : `/wallets/positions-payload`;

    const response = await authenticatedRequest<{
      success: boolean;
      data?: any;
      rawResponse?: any;
      error?: string;
    }>(url, session.access_token, {
      method: "GET",
    });

    return response;
  } catch (error: any) {
    console.error("Error getting positions payload:", error);
    return {
      success: false,
      error: error.message || "Failed to get positions payload",
    };
  }
}

/**
 * Get collapse position payload (debug only - doesn't submit transaction)
 * GET /api/wallets/collapse-position-payload
 *
 * @param marketId - Optional market ID (if not provided, returns payload for all positions)
 * @returns Payload data from Kana API
 */
export async function getCollapsePositionPayload(marketId?: string): Promise<{
  success: boolean;
  payload?: any;
  rawResponse?: any;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const url = marketId
      ? `/wallets/collapse-position-payload?marketId=${marketId}`
      : `/wallets/collapse-position-payload`;

    const response = await authenticatedRequest<{
      success: boolean;
      payload?: any;
      rawResponse?: any;
      error?: string;
    }>(url, session.access_token, {
      method: "GET",
    });

    return response;
  } catch (error: any) {
    console.error("Error getting collapse position payload:", error);
    return {
      success: false,
      error: error.message || "Failed to get collapse position payload",
    };
  }
}

/**
 * Close all positions for authenticated user
 * POST /api/wallets/close-all-positions
 *
 * @returns Close all positions result with transaction hash
 */
export async function closeAllPositions(): Promise<{
  success: boolean;
  txHash?: string;
  version?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      version?: string;
      error?: string;
    }>("/wallets/close-all-positions", session.access_token, {
      method: "POST",
    });

    return response;
  } catch (error: any) {
    console.error("Error closing all positions:", error);
    return {
      success: false,
      error: error.message || "Failed to close all positions",
    };
  }
}

/**
 * Close position for a specific market
 * POST /api/wallets/close-position
 *
 * @param marketId - Market ID (required)
 * @param tradeSide - Trade side: true for LONG, false for SHORT (required)
 * @param size - Position size (optional, will fetch from API if not provided)
 * @param leverage - Leverage (optional, will fetch from position if not provided)
 * @returns Close position result with transaction hash
 */
export async function closePosition(
  marketId: string,
  tradeSide: boolean,
  size?: string,
  leverage?: string
): Promise<{
  success: boolean;
  txHash?: string;
  version?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      version?: string;
      error?: string;
    }>("/wallets/close-position", session.access_token, {
      method: "POST",
      body: JSON.stringify({ marketId, tradeSide, size, leverage }),
    });

    return response;
  } catch (error: any) {
    console.error("Error closing position:", error);
    return {
      success: false,
      error: error.message || "Failed to close position",
    };
  }
}

/**
 * Collapse position for a specific market or all positions
 * POST /api/wallets/collapse-position
 *
 * @param marketId - Optional market ID (if not provided, collapses all positions)
 * @returns Collapse position result with transaction hash
 */
export async function collapsePosition(marketId?: string): Promise<{
  success: boolean;
  txHash?: string;
  version?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      version?: string;
      error?: string;
    }>("/wallets/collapse-position", session.access_token, {
      method: "POST",
      body: JSON.stringify({ marketId }),
    });

    return response;
  } catch (error: any) {
    console.error("Error collapsing position:", error);
    return {
      success: false,
      error: error.message || "Failed to collapse position",
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
  amount: number
): Promise<{
  success: boolean;
  txHash?: string;
  version?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    const response = await authenticatedRequest<{
      success: boolean;
      txHash?: string;
      version?: string;
      error?: string;
    }>("/wallets/transfer", session.access_token, {
      method: "POST",
      body: JSON.stringify({ recipientAddress, amount }),
    });

    return response;
  } catch (error: any) {
    console.error("Error transferring USDT:", error);
    return {
      success: false,
      error: error.message || "Failed to transfer USDT",
    };
  }
}
