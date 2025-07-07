import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  ApiResponse,
  User,
  Email,
  EmailWithTracking,
  EmailAnalyticsWithRecipients,
  SendEmailRequest,
  EmailAnalytics,
  OverviewStats,
  LoginRequest,
  RegisterRequest,
} from "../types";

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:6333";

    this.api = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 30000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem("authToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        console.log(
          `🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      (error) => {
        console.error("Request Error:", error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error("Response Error:", error.response?.data || error.message);

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401) {
          localStorage.removeItem("authToken");
          window.location.href = "/login";
        }

        return Promise.reject(error);
      },
    );
  }

  // Helper method to handle API responses
  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    if (!response.data.success) {
      throw new Error(response.data.error || "API request failed");
    }
    return response.data.data!;
  }

  // Authentication endpoints
  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<{
      success: boolean;
      isAuthenticated: boolean;
      user?: User;
    }>("/auth/status");
    if (
      response.data.success &&
      response.data.isAuthenticated &&
      response.data.user
    ) {
      return response.data.user;
    }
    throw new Error("User not authenticated");
  }

  async register(
    data: RegisterRequest,
  ): Promise<{ token: string; user: User }> {
    const response = await this.api.post<{
      success: boolean;
      token: string;
      user: User;
    }>("/auth/register", data);
    if (response.data.success) {
      // Store token in localStorage
      localStorage.setItem("authToken", response.data.token);
      return { token: response.data.token, user: response.data.user };
    }
    throw new Error("Registration failed");
  }

  async loginWithCredentials(
    data: LoginRequest,
  ): Promise<{ token: string; user: User }> {
    const response = await this.api.post<{
      success: boolean;
      token: string;
      user: User;
    }>("/auth/login", data);
    if (response.data.success) {
      // Store token in localStorage
      localStorage.setItem("authToken", response.data.token);
      return { token: response.data.token, user: response.data.user };
    }
    throw new Error("Login failed");
  }

  async logout(): Promise<void> {
    await this.api.post("/auth/logout");
    localStorage.removeItem("authToken");
  }

  // OAuth connection methods
  async disconnectProvider(
    provider: "google" | "microsoft",
  ): Promise<{ connectedProviders: any[] }> {
    const response = await this.api.delete<{
      success: boolean;
      connectedProviders: any[];
    }>(`/auth/disconnect/${provider}`);
    if (response.data.success) {
      return { connectedProviders: response.data.connectedProviders };
    }
    throw new Error(`Failed to disconnect ${provider}`);
  }

  // OAuth connection URLs (for existing local users)
  getGoogleConnectUrl(): string {
    const token = localStorage.getItem("authToken");
    const url = new URL(`${this.baseURL}/api/auth/connect/google`);
    if (token) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  }

  getMicrosoftConnectUrl(): string {
    const token = localStorage.getItem("authToken");
    const url = new URL(`${this.baseURL}/api/auth/connect/microsoft`);
    if (token) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  }

  // Email endpoints
  async sendEmail(
    data: SendEmailRequest,
  ): Promise<{ emailId: string; trackingId: string }> {
    const response = await this.api.post<
      ApiResponse<{ emailId: string; trackingId: string }>
    >("/email/send", data);
    return this.handleResponse(response);
  }

  async getSentEmails(): Promise<Email[]> {
    const response = await this.api.get<ApiResponse<Email[]>>("/email");
    return this.handleResponse(response);
  }

  async getSentEmailsWithTracking(): Promise<EmailWithTracking[]> {
    const response = await this.api.get<ApiResponse<EmailWithTracking[]>>(
      "/user/emails/with-tracking",
    );
    return this.handleResponse(response);
  }

  async getEmail(emailId: string): Promise<Email> {
    const response = await this.api.get<ApiResponse<Email>>(
      `/email/${emailId}`,
    );
    return this.handleResponse(response);
  }

  async deleteEmail(emailId: string): Promise<void> {
    await this.api.delete(`/email/${emailId}`);
  }

  // Analytics endpoints
  async getEmailAnalytics(emailId: string): Promise<EmailAnalytics> {
    const response = await this.api.get<ApiResponse<EmailAnalytics>>(
      `/tracking/analytics/${emailId}`,
    );
    return this.handleResponse(response);
  }

  async getEmailAnalyticsWithRecipients(
    emailId: string,
  ): Promise<EmailAnalyticsWithRecipients> {
    const response = await this.api.get<
      ApiResponse<EmailAnalyticsWithRecipients>
    >(`/tracking/analytics/${emailId}/recipients`);
    return this.handleResponse(response);
  }

  async getOverviewStats(): Promise<OverviewStats> {
    const response = await this.api.get<ApiResponse<OverviewStats>>(
      "/tracking/stats/overview",
    );
    return this.handleResponse(response);
  }

  // Tracking endpoints
  getTrackingPixelUrl(trackingId: string): string {
    return `${this.baseURL}/api/tracking/pixel?trackingId=${trackingId}`;
  }

  getClickTrackingUrl(trackingId: string, originalUrl: string): string {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${this.baseURL}/api/tracking/click/${trackingId}?url=${encodedUrl}`;
  }

  // User management endpoints
  async updateUser(data: Partial<User>): Promise<User> {
    const response = await this.api.put<ApiResponse<User>>(
      "/user/profile",
      data,
    );
    return this.handleResponse(response);
  }

  async deleteAccount(): Promise<void> {
    await this.api.delete("/user/account");
    localStorage.removeItem("authToken");
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get<{ status: string; timestamp: string }>(
      "/health",
    );
    return response.data;
  }

  // Error handling helper
  static getErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return "An unexpected error occurred";
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;
