// API for fetching trader details (positions and trade history) by address

import { authenticatedRequest } from "./apiClient";
import { getAuthToken } from "./utils/authUtils";
import type { PositionsApiResponse } from "./positionsApi";
import type { TradeHistoryApiResponse } from "./orderHistoryApi";

/**
 * Fetch positions for a specific address
 */
export async function getPositionsByAddress(
  address: string
): Promise<PositionsApiResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "No session found. Please sign in.",
        data: [],
      };
    }

    return await authenticatedRequest<PositionsApiResponse>(
      `/wallets/positions/by-address?address=${encodeURIComponent(address)}`,
      token,
      {
        method: "GET",
      }
    );
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch positions",
      data: [],
    };
  }
}

/**
 * Fetch trade history for a specific address
 */
export async function getTradeHistoryByAddress(
  address: string
): Promise<TradeHistoryApiResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "No session found. Please sign in.",
        data: [],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await authenticatedRequest<TradeHistoryApiResponse>(
        `/wallets/trade-history/by-address?address=${encodeURIComponent(address)}`,
        token,
        {
          method: "GET",
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch trade history",
      data: [],
    };
  }
}

