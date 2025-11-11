import { authenticatedRequest, apiRequest } from "./apiClient";
import { supabase } from "./supabaseClient";

export interface CreateUserData {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string; // Original Google photo
  selected_avatar_url?: string; // User's chosen avatar
  avatar_source?: "google" | "custom"; // Which avatar is selected
  google_id?: string;
  display_name?: string;
  username?: string;
  bio?: string;
  twitter_username?: string;
  twitter_connected?: boolean;
  twitter_user_id?: string;
}

export interface UserData extends CreateUserData {
  created_at: string;
  updated_at: string;
  last_login?: string;
  wallet_address?: string; // Wallet address automatically included from backend
}

export interface UpdateUserData {
  display_name?: string;
  username?: string;
  bio?: string;
  selected_avatar_url?: string;
  avatar_source?: "google" | "custom";
}

// Create or update user (upsert) - requires authentication
// Returns user with wallet_address automatically included
export async function upsertUser(userData: CreateUserData): Promise<UserData> {
  // Get JWT token from Supabase session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No session found. Please sign in.");
  }

  // Use authenticated request with JWT token
  const response = await authenticatedRequest<{
    success: boolean;
    user?: UserData;
    error?: string;
  }>("/users/upsert", session.access_token, {
    method: "POST",
    body: JSON.stringify(userData),
  });

  // Check for error response
  if (!response || !response.success) {
    throw new Error(response?.error || "Invalid response from server");
  }

  // Return user object with wallet_address
  if (!response.user) {
    throw new Error("Invalid response from server: user data missing");
  }

  return response.user;
}

// Get current user (requires auth)
export async function getCurrentUser(signal?: AbortSignal): Promise<UserData> {
  console.log("🔍 getCurrentUser called");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.error("❌ No session or access token found");
    throw new Error("No session found");
  }

  console.log("✅ Session found, making API request...");
  try {
    const response = await authenticatedRequest<{
      success: boolean;
      user?: UserData;
      error?: string;
    }>("/users/me", session.access_token, { signal });

    console.log("📥 API response received:", response);

    if (!response) {
      console.error("❌ No response from server");
      throw new Error("No response from server");
    }

    if (!response.success) {
      console.error("❌ API returned error:", (response as any).error);
      throw new Error((response as any).error || "Failed to get user data");
    }

    if (!response.user) {
      console.error("❌ No user data in response");
      throw new Error("Invalid response from server: user data missing");
    }

    console.log("✅ User data extracted successfully");
    return response.user;
  } catch (error: any) {
    // Don't log if request was aborted (component unmounted)
    if (error.message !== "Request aborted") {
      console.error("❌ getCurrentUser error:", error);
    }
    throw error;
  }
}

// Update current user (requires auth)
export async function updateCurrentUser(
  updateData: UpdateUserData
): Promise<UserData> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No session found");
  }
  const response = await authenticatedRequest<{
    success: boolean;
    user?: UserData;
    error?: string;
  }>("/users/me", session.access_token, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });

  // Check for error response
  if (!response || !response.success) {
    throw new Error(response?.error || "Invalid response from server");
  }

  // Return user object with wallet_address
  if (!response.user) {
    throw new Error("Invalid response from server: user data missing");
  }

  return response.user;
}
