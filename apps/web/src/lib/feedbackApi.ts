import { authenticatedRequest, AbortError } from "./apiClient";
import { supabase } from "./supabaseClient";

export interface Feedback {
  id: string;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackData {
  title: string;
  message: string;
}

// Create a new feedback entry (requires auth)
export async function createFeedback(
  feedbackData: CreateFeedbackData
): Promise<Feedback> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No session found. Please sign in.");
  }

  try {
    const response = await authenticatedRequest<{
      success: boolean;
      feedback?: Feedback;
      error?: string;
    }>("/feedback", session.access_token, {
      method: "POST",
      body: JSON.stringify(feedbackData),
    });

    if (!response) {
      throw new Error("No response from server");
    }

    if (!response.success) {
      throw new Error(response.error || "Invalid response from server");
    }

    if (!response.feedback) {
      throw new Error("Invalid response from server: feedback data missing");
    }

    return response.feedback;
  } catch (error: any) {
    // Handle network errors
    if (error.message?.includes("404") || error.message?.includes("Not Found")) {
      throw new Error("Feedback endpoint not found. Please check if the API server is running.");
    }
    if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
      throw new Error("Authentication failed. Please sign in again.");
    }
    throw error;
  }
}

// Get all feedback entries for the current user (requires auth)
export async function getMyFeedbacks(signal?: AbortSignal): Promise<Feedback[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No session found. Please sign in.");
  }

  try {
    const response = await authenticatedRequest<{
      success: boolean;
      feedbacks?: Feedback[];
      count?: number;
      error?: string;
    }>("/feedback", session.access_token, { 
      method: "GET",
      signal 
    });

    if (!response) {
      return [];
    }

    if (!response.success) {
      if (response.error?.toLowerCase().includes("not found") || 
          response.error?.toLowerCase().includes("no feedback")) {
        return [];
      }
      throw new Error(response.error || "Failed to get feedbacks");
    }

    return response.feedbacks || [];
  } catch (error: any) {
    if (error instanceof AbortError || error.message === "Request aborted") {
      throw error;
    }

    // Handle 404 as empty state (no feedbacks yet)
    if (error.message?.includes("404") || 
        error.message?.includes("Cannot GET") ||
        error.message?.includes("Not Found")) {
      return [];
    }

    throw error;
  }
}

