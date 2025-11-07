import { apiRequest } from './apiClient';

export interface Avatar {
  name: string;
  url: string;
  size: number;
  updated_at: string;
}

export interface AvatarsResponse {
  success: boolean;
  avatars: Avatar[];
  error?: string;
}

/**
 * Get list of available avatars from backend
 */
export async function getAvatars(): Promise<Avatar[]> {
  try {
    const response = await apiRequest<AvatarsResponse>('/avatars');
    if (!response.success || !response.avatars) {
      throw new Error(response.error || 'Failed to fetch avatars');
    }
    return response.avatars;
  } catch (error: any) {
    console.error('Error fetching avatars:', error);
    throw new Error(error.message || 'Failed to fetch avatars');
  }
}

