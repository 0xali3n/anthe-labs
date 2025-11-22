import { config } from "./config";

/**
 * Kana Labs API Client
 * Provides simple wrapper functions for making authenticated requests to Kana Labs API
 */

export interface KanaResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Make a GET request to Kana Labs API
 */
export async function kanaGet<T = any>(path: string): Promise<KanaResponse<T>> {
  const url = `${config.kanaRestUrl}${
    path.startsWith("/") ? path : `/${path}`
  }`;

  try {
    // Don't log full URL as it might contain sensitive query params
    const urlPath = url.split('?')[0];
    console.log(`[kanaClient] Making GET request to: ${urlPath}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": config.kanaApiKey,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as any;

    console.log(`[kanaClient] Response status: ${response.status}`);
    // Don't log full response in production - might contain sensitive data
    if (process.env.NODE_ENV !== "production") {
      console.log(`[kanaClient] Raw response:`, JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        message: data?.message || data?.error || "Unknown error",
        status: response.status,
      };
    }

    return { data: data as T, status: response.status };
  } catch (error) {
    console.error(`[kanaClient] GET request failed:`, error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Make a POST request to Kana Labs API
 */
export async function kanaPost<T = any>(
  path: string,
  body: any
): Promise<KanaResponse<T>> {
  const url = `${config.kanaRestUrl}${
    path.startsWith("/") ? path : `/${path}`
  }`;

  try {
    const urlPath = url.split('?')[0];
    console.log(`[kanaClient] Making POST request to: ${urlPath}`);
    // Don't log request body in production - might contain sensitive data
    if (process.env.NODE_ENV !== "production") {
      console.log(`[kanaClient] Request body:`, JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": config.kanaApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as any;

    console.log(`[kanaClient] Response status: ${response.status}`);
    // Don't log full response in production - might contain sensitive data
    if (process.env.NODE_ENV !== "production") {
      console.log(`[kanaClient] Raw response:`, JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        message: data?.message || data?.error || "Unknown error",
        status: response.status,
      };
    }

    return { data: data as T, status: response.status };
  } catch (error) {
    console.error(`[kanaClient] POST request failed:`, error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if response contains an entry function payload (Aptos transaction format)
 */
export function hasEntryFunctionPayload(response: any): boolean {
  return (
    response &&
    typeof response === "object" &&
    response.entry_function_payload &&
    typeof response.entry_function_payload === "object"
  );
}

/**
 * Check if response contains raw transaction bytes (base64 format)
 */
export function hasRawTransaction(response: any): boolean {
  return (
    response &&
    typeof response === "object" &&
    (response.raw_tx || response.tx_bytes) &&
    typeof (response.raw_tx || response.tx_bytes) === "string"
  );
}

/**
 * Extract raw transaction bytes from response
 */
export function getRawTransaction(response: any): string | null {
  if (hasRawTransaction(response)) {
    return response.raw_tx || response.tx_bytes;
  }
  return null;
}
