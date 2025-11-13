// Leaderboard API Client
const LEADERBOARD_BASE_URL = "https://perpetual-leaderboard.kanalabs.io";

export interface LeaderboardUser {
  Rank: number;
  Address: string;
  NumberOfTxns: number;
  TotalVolume: string;
  PNL: string;
  ROI: string;
}

export interface LeaderboardResponse {
  success: boolean;
  message: string;
  data: LeaderboardUser[];
  pagination?: {
    total: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
  };
}

export type Period = "overall" | "daily" | "weekly" | "monthly" | "yearly";

/**
 * Fetch top PNL users from leaderboard
 * @param period - Time period: overall, daily, weekly, monthly, yearly
 * @param search - Optional wallet address to search for
 * @param page - Optional page number for pagination
 * @param perPage - Optional items per page
 */
export async function fetchTopPnlUsers(
  period: Period = "overall",
  search?: string,
  page?: number,
  perPage?: number
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  params.append("period", period);

  if (search) {
    params.append("search", search);
  }

  if (page) {
    params.append("page", page.toString());
  }

  if (perPage) {
    params.append("perPage", perPage.toString());
  }

  const url = `${LEADERBOARD_BASE_URL}/fetchTopPnlUsers?${params.toString()}`;

  console.log(`📡 Fetching leaderboard: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LeaderboardResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    throw new Error(error.message || "Failed to fetch leaderboard data");
  }
}

/**
 * Fetch top volume users
 */
export async function fetchTopVolumeUsers(
  period: Period = "overall",
  search?: string,
  page?: number,
  perPage?: number
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  params.append("period", period);

  if (search) {
    params.append("search", search);
  }

  if (page) {
    params.append("page", page.toString());
  }

  if (perPage) {
    params.append("perPage", perPage.toString());
  }

  const url = `${LEADERBOARD_BASE_URL}/fetchTopVolumeUsers?${params.toString()}`;

  console.log(`📡 Fetching top volume: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LeaderboardResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching top volume:", error);
    throw new Error(error.message || "Failed to fetch top volume data");
  }
}

/**
 * Fetch top ROI users
 */
export async function fetchTopRoiUsers(
  period: Period = "overall",
  search?: string,
  page?: number,
  perPage?: number
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  params.append("period", period);

  if (search) {
    params.append("search", search);
  }

  if (page) {
    params.append("page", page.toString());
  }

  if (perPage) {
    params.append("perPage", perPage.toString());
  }

  const url = `${LEADERBOARD_BASE_URL}/fetchTopRoiUsers?${params.toString()}`;

  console.log(`📡 Fetching top ROI: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LeaderboardResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching top ROI:", error);
    throw new Error(error.message || "Failed to fetch top ROI data");
  }
}

/**
 * Fetch user stats (for a specific wallet address)
 */
export async function fetchUserStats(
  walletAddress: string,
  period: Period = "overall"
): Promise<any> {
  const params = new URLSearchParams();
  params.append("address", walletAddress);
  params.append("period", period);

  const url = `${LEADERBOARD_BASE_URL}/fetchUserStats?${params.toString()}`;

  console.log(`📡 Fetching user stats: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching user stats:", error);
    throw new Error(error.message || "Failed to fetch user stats");
  }
}

/**
 * Test other potential endpoints (will try common patterns)
 */
export async function testEndpoint(
  endpoint: string,
  queryParams?: Record<string, string>
): Promise<any> {
  let url = `${LEADERBOARD_BASE_URL}${endpoint}`;

  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  console.log(`🧪 Testing endpoint: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      status: response.status,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch",
    };
  }
}
