// API Client for communicating with NestJS backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
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
  console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
  
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
      // Ensure response is fully consumed - prevent caching issues
      cache: 'no-store',
    });
    
    console.log(`📡 API Response: ${response.status} ${response.statusText} for ${url}`);
    
    if (timeoutId) clearTimeout(timeoutId);
    
    // Ensure response body is fully read
    if (!response.bodyUsed) {
      return handleResponse<T>(response);
    } else {
      // Response already consumed, try to get data another way
      const text = await response.text();
      return JSON.parse(text);
    }
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error(`❌ API Request failed for ${url}:`, error);
    if (error.name === 'AbortError') {
      // Don't throw error if it was aborted intentionally (component unmount)
      if (providedSignal?.aborted) {
        throw new Error('Request aborted');
      }
      throw new Error('Request timeout - server took too long to respond');
    }
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

