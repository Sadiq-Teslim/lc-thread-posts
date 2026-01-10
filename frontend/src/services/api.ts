/**
 * API Service for ThreadCraft
 *
 * This module provides a centralized API client for communicating with the
 * ThreadCraft backend. It includes request/response interceptors for session
 * management and error handling, as well as typed service methods for all
 * API endpoints.
 */

import axios, { AxiosError } from "axios";
import { useSessionStore } from "../store/sessionStore";

/**
 * Get API URL from environment variable or use relative path.
 * If VITE_API_URL is set, use it (should include /api if needed).
 * Otherwise, default to relative /api path.
 */
let API_URL = (import.meta.env?.VITE_API_URL as string | undefined) || "/api";

/**
 * Ensure API_URL ends with /api if it's a full URL.
 */
if (API_URL.startsWith("http") && !API_URL.endsWith("/api")) {
  // If it's a full URL without /api, add it
  API_URL = API_URL.endsWith("/") ? `${API_URL}api` : `${API_URL}/api`;
}

/**
 * Axios instance configured with base URL and default headers.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor to add session ID to all requests.
 * Automatically attaches the current session ID from the store to the
 * X-Session-ID header for authenticated endpoints.
 */
api.interceptors.request.use(
  (config) => {
    const sessionId = useSessionStore.getState().sessionId;
    if (sessionId) {
      config.headers["X-Session-ID"] = sessionId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor for error handling.
 * Handles session expiration by clearing the session store when
 * receiving 401 errors with SESSION_EXPIRED or NO_SESSION error codes.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Handle session expiration
    if (error.response?.status === 401) {
      const errorCode = error.response.data?.error_code;
      if (errorCode === "SESSION_EXPIRED" || errorCode === "NO_SESSION") {
        useSessionStore.getState().clearSession();
      }
    }
    return Promise.reject(error);
  }
);

// ============== TYPES ==============

/**
 * Standard API response wrapper.
 *
 * @template T - Type of the data payload
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Human-readable message */
  message?: string;
  /** Response data payload */
  data?: T;
  /** Machine-readable error code (only present on errors) */
  error_code?: string;
}

/**
 * API error response structure.
 */
export interface ApiError {
  success: false;
  error_code: string;
  message: string;
}

/**
 * Twitter/X API credentials payload.
 */
export interface CredentialsPayload {
  api_key: string;
  api_secret: string;
  access_token: string;
  access_token_secret: string;
  bearer_token: string;
}

/**
 * Session creation response.
 */
export interface SessionResponse {
  success: boolean;
  session_id: string;
  message: string;
}

/**
 * Thread progress data.
 */
export interface ProgressData {
  current_day: number;
  thread_id: string | null;
  has_active_thread: boolean;
  next_day: number;
}

/**
 * Tweet/post data.
 */
export interface TweetData {
  thread_id?: string;
  tweet_id?: string;
  tweet_url: string;
  tweet_text?: string;
  day?: number;
}

/**
 * Tweet preview data.
 */
export interface PreviewData {
  preview: string;
  character_count: number;
  is_valid: boolean;
  day: number;
}

/**
 * Twitter user information.
 */
export interface UserInfo {
  id: string;
  username: string;
  name: string;
  profile_image_url: string | null;
}

// ============== API SERVICE ==============

/**
 * API service object containing all API methods.
 */
export const apiService = {
  /**
   * Health check endpoint.
   *
   * @returns Promise resolving to true if the API is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get("/health");
      return response.data.success;
    } catch {
      return false;
    }
  },

  /**
   * Create a new session with Twitter/X API credentials.
   *
   * @param credentials - Twitter/X API credentials
   * @returns Promise resolving to session creation response
   * @throws {AxiosError} If credentials are invalid or request fails
   */
  async createSession(
    credentials: CredentialsPayload
  ): Promise<SessionResponse> {
    const response = await api.post<SessionResponse>(
      "/session/create",
      credentials
    );
    return response.data;
  },

  /**
   * Validate if the current session is still active.
   *
   * @returns Promise resolving to session validation response
   */
  async validateSession(): Promise<
    ApiResponse<{ valid: boolean; expires_at: string }>
  > {
    const response = await api.get("/session/validate");
    return response.data;
  },

  /**
   * Destroy the current session (logout).
   *
   * @returns Promise resolving to session destruction response
   */
  async destroySession(): Promise<ApiResponse> {
    const response = await api.delete("/session/destroy");
    return response.data;
  },

  /**
   * Get current thread posting progress.
   *
   * @returns Promise resolving to progress data
   */
  async getProgress(): Promise<ApiResponse<ProgressData>> {
    const response = await api.get<ApiResponse<ProgressData>>("/progress");
    return response.data;
  },

  /**
   * Reset progress to start a new thread.
   *
   * @returns Promise resolving to reset confirmation response
   */
  async resetProgress(): Promise<ApiResponse> {
    const response = await api.post("/progress/reset");
    return response.data;
  },

  /**
   * Start a new thread with an introduction tweet.
   *
   * @param introText - Introduction text for the thread (max 280 characters)
   * @returns Promise resolving to thread creation response with thread ID and URL
   */
  async startThread(introText: string): Promise<ApiResponse<TweetData>> {
    const response = await api.post<ApiResponse<TweetData>>("/thread/start", {
      intro_text: introText,
    });
    return response.data;
  },

  /**
   * Continue an existing thread by thread ID or URL.
   *
   * @param threadId - Thread ID (numeric string) or Twitter/X thread URL
   * @returns Promise resolving to thread continuation response with current day and next day
   */
  async continueThread(threadId: string): Promise<
    ApiResponse<{
      thread_id: string;
      current_day: number;
      next_day: number;
      tweet_url: string;
    }>
  > {
    const response = await api.post<
      ApiResponse<{
        thread_id: string;
        current_day: number;
        next_day: number;
        tweet_url: string;
      }>
    >("/thread/continue", {
      thread_id: threadId,
    });
    return response.data;
  },

  /**
   * Post a solution to the active thread.
   *
   * @param gistUrl - GitHub Gist URL for the solution
   * @param problemName - Name of the LeetCode problem
   * @returns Promise resolving to tweet post response with tweet ID and URL
   */
  async postSolution(
    gistUrl: string,
    problemName: string
  ): Promise<ApiResponse<TweetData>> {
    const response = await api.post<ApiResponse<TweetData>>("/solution/post", {
      gist_url: gistUrl,
      problem_name: problemName,
    });
    return response.data;
  },

  /**
   * Preview what a tweet will look like without posting.
   *
   * @param gistUrl - GitHub Gist URL for the solution
   * @param problemName - Name of the LeetCode problem
   * @returns Promise resolving to tweet preview data
   */
  async previewTweet(
    gistUrl: string,
    problemName: string
  ): Promise<ApiResponse<PreviewData>> {
    const response = await api.post<ApiResponse<PreviewData>>(
      "/tweet/preview",
      {
        gist_url: gistUrl,
        problem_name: problemName,
      }
    );
    return response.data;
  },

  /**
   * Get authenticated user information from Twitter/X.
   *
   * @returns Promise resolving to user information
   */
  async getUserInfo(): Promise<ApiResponse<UserInfo>> {
    const response = await api.get<ApiResponse<UserInfo>>("/user/info");
    return response.data;
  },
};

// ============== ERROR HANDLING ==============

/**
 * Extract a user-friendly error message from various error types.
 *
 * Handles Axios errors, API errors, and generic errors, providing
 * appropriate user-friendly messages for each case.
 *
 * @param error - The error object (can be AxiosError, Error, or unknown)
 * @returns User-friendly error message string
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;

    // Prefer API error message if available
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    // Handle timeout errors
    if (axiosError.code === "ECONNABORTED") {
      return "The request timed out. Please check your internet connection and try again.";
    }

    // Handle network errors
    if (axiosError.code === "ERR_NETWORK") {
      return "Unable to connect to the server. Please make sure the backend is running.";
    }

    // Handle HTTP status codes
    switch (axiosError.response?.status) {
      case 400:
        return "Please check your input and try again.";
      case 401:
        return "Your session has expired. Please reconfigure your API keys.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Something went wrong on our end. Please try again later.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback for unknown error types
  return "An unexpected error occurred. Please try again.";
};

export default api;
