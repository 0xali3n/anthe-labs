import { apiRequest } from './apiClient';

export interface Trader {
  id: string;
  address: string;
  botName?: string;
  avatarUrl?: string;
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

// Get all traders
export async function getTraders(): Promise<TradersResponse> {
  return apiRequest<TradersResponse>('/traders');
}

// Get a single trader by address
export async function getTrader(address: string): Promise<{ success: boolean; data?: Trader; error?: string }> {
  return apiRequest<{ success: boolean; data?: Trader; error?: string }>(`/traders/${address}`);
}

