import { supabase } from "./supabaseClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

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
  id: string;
  userId: string;
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

// Create a new copy trade bot
export async function createCopyTradeBot(
  data: CreateCopyTradeBotDto
): Promise<{ success: boolean; data?: CopyTradeBot; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/copy-trade-bots`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Failed to create copy trade bot:", error);
    return {
      success: false,
      error: error.message || "Failed to create copy trade bot",
    };
  }
}

// Get all bots for current user
export async function getMyCopyTradeBots(): Promise<{
  success: boolean;
  data?: CopyTradeBot[];
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/copy-trade-bots/me`, {
      method: "GET",
      headers,
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Failed to fetch copy trade bots:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch copy trade bots",
    };
  }
}

// Get a single bot by ID
export async function getCopyTradeBot(
  id: string
): Promise<{ success: boolean; data?: CopyTradeBot; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/copy-trade-bots/${id}`, {
      method: "GET",
      headers,
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Failed to fetch copy trade bot:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch copy trade bot",
    };
  }
}

// Update bot (stop/restart/update trader address)
export async function updateCopyTradeBot(
  id: string,
  data: UpdateCopyTradeBotDto
): Promise<{ success: boolean; data?: CopyTradeBot; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/copy-trade-bots/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Failed to update copy trade bot:", error);
    return {
      success: false,
      error: error.message || "Failed to update copy trade bot",
    };
  }
}

// Delete a bot
export async function deleteCopyTradeBot(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/copy-trade-bots/${id}`, {
      method: "DELETE",
      headers,
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Failed to delete copy trade bot:", error);
    return {
      success: false,
      error: error.message || "Failed to delete copy trade bot",
    };
  }
}

