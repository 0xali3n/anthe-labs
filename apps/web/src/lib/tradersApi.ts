import { apiRequest, authenticatedRequest } from './apiClient';
import { supabase } from './supabaseClient';

export interface Trader {
  id: string;
  userId?: string;
  address: string;
  botName?: string;
  avatarUrl?: string;
  status?: string; // 'pending' | 'approved' | 'rejected'
  numberOfTxns: number;
  totalVolume: string;
  pnl: string;
  roi: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradersResponse {
  success: boolean;
  data: Trader[];
}

export interface RegisterTraderResponse {
  success: boolean;
  data?: Trader;
  error?: string;
}

// Get all traders
export async function getTraders(): Promise<TradersResponse> {
  return apiRequest<TradersResponse>('/traders');
}

// Get a single trader by address
export async function getTrader(address: string): Promise<{ success: boolean; data?: Trader; error?: string }> {
  return apiRequest<{ success: boolean; data?: Trader; error?: string }>(`/traders/${address}`);
}

// Get trader registration for current user
export async function getMyTraderRegistration(): Promise<RegisterTraderResponse> {
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
    const response = await authenticatedRequest<RegisterTraderResponse>(
      '/trader-registrations/me',
      session.access_token,
      {
        method: 'GET',
      }
    );
    
    return response;
  } catch (error: any) {
    // If no registration found, return success: false (not an error)
    if (error.message?.includes('No trader registration found')) {
      return {
        success: false,
        error: 'No trader registration found',
      };
    }
    return {
      success: false,
      error: error.message || 'Failed to get trader registration',
    };
  }
}

// Register a new trader
export async function registerTrader(address: string, botName: string): Promise<RegisterTraderResponse> {
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
    const response = await authenticatedRequest<RegisterTraderResponse>(
      '/trader-registrations/register',
      session.access_token,
      {
        method: 'POST',
        body: JSON.stringify({
          address,
          botName,
        }),
      }
    );
    
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to register trader',
    };
  }
}

