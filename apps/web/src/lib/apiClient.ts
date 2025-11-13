// API Client for communicating with NestJS backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Custom error class for aborted requests (should be handled silently)
export class AbortError extends Error {
  constructor(message: string = 'Request aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        message: response.statusText || `HTTP ${response.status}`,
        statusCode: response.status,
      };
    }
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }
  
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    throw new Error('Invalid JSON response from server');
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  // Use provided signal or create new one with timeout
  const providedSignal = options.signal;
  const controller = providedSignal ? null : new AbortController();
  const signal = providedSignal || controller?.signal;
  
  const timeoutId = signal && !providedSignal 
    ? setTimeout(() => controller!.abort(), 15000) // 15 second timeout
    : null;
  
  try {
    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      cache: 'no-store',
    });
    
    if (timeoutId) clearTimeout(timeoutId);
    
    if (!response.bodyUsed) {
      return handleResponse<T>(response);
    } else {
      const text = await response.text();
      return JSON.parse(text);
    }
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Handle abort errors silently (intentional cancellation)
    if (error.name === 'AbortError' || error.message === 'The user aborted a request.') {
      if (providedSignal?.aborted) {
        // Intentional abort from component cleanup - throw silent error
        throw new AbortError('Request aborted');
      }
      // Timeout abort - this is an actual error
      throw new Error('Request timeout - server took too long to respond');
    }
    
    // Log other errors but not aborts
    console.error(`❌ API Request failed for ${url}:`, error);
    throw error;
  }
}

export async function authenticatedRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

