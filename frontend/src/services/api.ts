import axios, { AxiosError } from "axios";
import { useSessionStore } from "../store/sessionStore";

// Get API URL from environment variable or use relative path
const API_URL = (import.meta.env?.VITE_API_URL as string | undefined) || "/api";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add session ID
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

// Response interceptor for error handling
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

// Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error_code?: string;
}

export interface ApiError {
  success: false;
  error_code: string;
  message: string;
}

export interface CredentialsPayload {
  api_key: string;
  api_secret: string;
  access_token: string;
  access_token_secret: string;
  bearer_token: string;
}

export interface SessionResponse {
  success: boolean;
  session_id: string;
  expires_in: number;
  message: string;
}

export interface ProgressData {
  current_day: number;
  thread_id: string | null;
  has_active_thread: boolean;
  next_day: number;
}

export interface TweetData {
  thread_id?: string;
  tweet_id?: string;
  tweet_url: string;
  tweet_text?: string;
  day?: number;
}

export interface PreviewData {
  preview: string;
  character_count: number;
  is_valid: boolean;
  day: number;
}

export interface UserInfo {
  id: string;
  username: string;
  name: string;
  profile_image_url: string | null;
}

// API Functions
export const apiService = {
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get("/health");
      return response.data.success;
    } catch {
      return false;
    }
  },

  // Session management
  async createSession(
    credentials: CredentialsPayload
  ): Promise<SessionResponse> {
    const response = await api.post<SessionResponse>(
      "/session/create",
      credentials
    );
    return response.data;
  },

  async validateSession(): Promise<
    ApiResponse<{ valid: boolean; expires_at: string }>
  > {
    const response = await api.get("/session/validate");
    return response.data;
  },

  async destroySession(): Promise<ApiResponse> {
    const response = await api.delete("/session/destroy");
    return response.data;
  },

  // Progress
  async getProgress(): Promise<ApiResponse<ProgressData>> {
    const response = await api.get<ApiResponse<ProgressData>>("/progress");
    return response.data;
  },

  async resetProgress(): Promise<ApiResponse> {
    const response = await api.post("/progress/reset");
    return response.data;
  },

  // Thread management
  async startThread(introText: string): Promise<ApiResponse<TweetData>> {
    const response = await api.post<ApiResponse<TweetData>>("/thread/start", {
      intro_text: introText,
    });
    return response.data;
  },

  // Solution posting
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

  // User info
  async getUserInfo(): Promise<ApiResponse<UserInfo>> {
    const response = await api.get<ApiResponse<UserInfo>>("/user/info");
    return response.data;
  },
};

// Helper to extract user-friendly error message
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    if (axiosError.code === "ECONNABORTED") {
      return "The request timed out. Please check your internet connection and try again.";
    }

    if (axiosError.code === "ERR_NETWORK") {
      return "Unable to connect to the server. Please make sure the backend is running.";
    }

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

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
};

export default api;
