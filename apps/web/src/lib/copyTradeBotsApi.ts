import { supabase } from "./supabaseClient";
import { authenticatedRequest } from "./apiClient";

export interface CreateCopyTradeBotDto {
  traderAddress?: string;
  allocatedAmount: number;
  allocationPercent: number;
  mode?: string;
}

export interface UpdateCopyTradeBotDto {
  status?: "running" | "stopped";
  traderAddress?: string;
}

export interface CopyTradeBot {
  id: string; // 8-9 character bot ID
  userAddress: string; // User wallet address
  traderAddress: string | null;
  allocatedAmount: string;
  allocationPercent: string;
  mode: string;
  status: "running" | "stopped";
  totalTrades: number;
  pnl: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  stoppedAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Create a new copy trade bot
 */
export async function createCopyTradeBot(
  data: CreateCopyTradeBotDto
): Promise<ApiResponse<CopyTradeBot>> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    return await authenticatedRequest<ApiResponse<CopyTradeBot>>(
      "/copy-trade-bots",
      token,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create copy trade bot",
    };
  }
}

/**
 * Get all bots for current user
 */
export async function getMyCopyTradeBots(): Promise<ApiResponse<CopyTradeBot[]>> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    return await authenticatedRequest<ApiResponse<CopyTradeBot[]>>(
      "/copy-trade-bots/me",
      token,
      {
        method: "GET",
      }
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch copy trade bots",
    };
  }
}

/**
 * Get a single bot by ID
 */
export async function getCopyTradeBot(
  id: string
): Promise<ApiResponse<CopyTradeBot>> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    return await authenticatedRequest<ApiResponse<CopyTradeBot>>(
      `/copy-trade-bots/${id}`,
      token,
      {
        method: "GET",
      }
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch copy trade bot",
    };
  }
}

/**
 * Update bot (stop/restart/update trader address)
 */
export async function updateCopyTradeBot(
  id: string,
  data: UpdateCopyTradeBotDto
): Promise<ApiResponse<CopyTradeBot>> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    return await authenticatedRequest<ApiResponse<CopyTradeBot>>(
      `/copy-trade-bots/${id}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update copy trade bot",
    };
  }
}

/**
 * Delete a bot
 */
export async function deleteCopyTradeBot(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "No session found. Please sign in.",
      };
    }

    return await authenticatedRequest<{ success: boolean; error?: string }>(
      `/copy-trade-bots/${id}`,
      token,
      {
        method: "DELETE",
      }
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete copy trade bot",
    };
  }
}

