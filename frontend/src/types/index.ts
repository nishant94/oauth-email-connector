// OAuth Connection Type
export interface OAuthConnection {
  provider: "google" | "microsoft";
  providerId: string;
  email: string;
  connectedAt: string;
}

// User Types
export interface User {
  id: string;
  username?: string;
  email: string;
  name: string;
  provider: "local";
  connectedProviders: OAuthConnection[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Email Types
export interface Email {
  id: string;
  emailId: string;
  userId: string;
  senderEmail: string;
  recipients: {
    to: string[];
    cc: string[];
    bcc: string[];
  };
  subject: string;
  body: string;
  htmlBody?: string;
  sendTimestamp: string;
  status: "pending" | "sent" | "failed" | "delivered";
  provider: "gmail" | "outlook";
  trackingId: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Email with Tracking Stats
export interface EmailWithTracking extends Email {
  trackingStats: {
    totalRecipients: number;
    totalOpens: number;
    uniqueOpens: number;
    totalClicks: number;
    uniqueClicks: number;
    openRate: string;
    clickRate: string;
    firstOpenAt?: string;
    lastActivityAt?: string;
  };
}

// Recipient tracking data
export interface RecipientTrackingData {
  email: string;
  opened: boolean;
  openCount: number;
  firstOpenAt: string | null;
  lastOpenAt: string | null;
  clicked: boolean;
  clickCount: number;
  firstClickAt: string | null;
  lastClickAt: string | null;
  events: Array<{
    type: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    clickedUrl?: string;
  }>;
}

// Email analytics with recipient breakdown
export interface EmailAnalyticsWithRecipients {
  emailId: string;
  subject: string;
  sentAt: string;
  totalRecipients: number;
  openedCount: number;
  clickedCount: number;
  openRate: string;
  clickRate: string;
  recipients: RecipientTrackingData[];
}

// Email Tracking Types
export interface EmailTracking {
  id: string;
  trackingId: string;
  emailId: string;
  eventType: "open" | "click" | "reply" | "forward";
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  clickedUrl?: string;
  recipientEmail?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Request Types
export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  provider: "gmail" | "outlook";
}

export interface EmailAnalytics {
  emailId: string;
  subject: string;
  sentAt: string;
  status: string;
  recipients: {
    to: string[];
    cc: string[];
    bcc: string[];
  };
  totalOpens: number;
  uniqueOpens: number;
  totalClicks: number;
  uniqueClicks: number;
  clickedUrls: Record<string, number>;
  firstOpenAt?: string;
  lastActivityAt?: string;
  events: Array<{
    type: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    clickedUrl?: string;
    metadata?: Record<string, any>;
  }>;
}

export interface OverviewStats {
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  totalOpens: number;
  totalClicks: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: string;
  clickRate: string;
  recentActivity: Array<{
    emailId: string;
    subject: string;
    type: string;
    timestamp: string;
    clickedUrl?: string;
  }>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface EmailFormData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  messageBody: string;
  htmlBody?: string;
  platform: "gmail" | "outlook";
}

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithCredentials: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  connectProvider: (provider: "google" | "microsoft") => void;
  disconnectProvider: (provider: "google" | "microsoft") => Promise<void>;
}
