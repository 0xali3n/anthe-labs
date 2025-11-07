import { authenticatedRequest, apiRequest } from './apiClient';
import { supabase } from './supabaseClient';

export interface CreateUserData {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
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
}

// Create or update user (upsert) - requires authentication
// Returns user with wallet_address automatically included
export async function upsertUser(userData: CreateUserData): Promise<UserData> {
  // Get JWT token from Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No session found. Please sign in.');
  }

  // Use authenticated request with JWT token
  const response = await authenticatedRequest<{ success: boolean; user: UserData }>('/users/upsert', session.access_token, {
    method: 'POST',
    body: JSON.stringify(userData),
  });

  // Debug: Log response to verify structure
  console.log("🔍 Backend response:", response);

  // Return user object with wallet_address
  if (!response || !response.user) {
    throw new Error('Invalid response from server');
  }

  return response.user;
}

// Get current user (requires auth)
export async function getCurrentUser(): Promise<UserData> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No session found');
  }
  const response = await authenticatedRequest<{ success: boolean; user: UserData }>('/users/me', session.access_token);
  if (!response || !response.user) {
    throw new Error('Invalid response from server');
  }
  return response.user;
}

// Update current user (requires auth)
export async function updateCurrentUser(
  updateData: UpdateUserData
): Promise<UserData> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No session found');
  }
  const response = await authenticatedRequest<{ success: boolean; user: UserData }>('/users/me', session.access_token, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
  if (!response || !response.user) {
    throw new Error('Invalid response from server');
  }
  return response.user;
}

