import { Document, Types } from "mongoose";

// OAuth Connection Type
export interface IOAuthConnection {
  provider: "google" | "microsoft";
  providerId: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpires?: Date;
  connectedAt: Date;
}

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId; // Explicitly define _id as ObjectId

  // Basic auth fields
  username?: string;
  password?: string;

  // OAuth fields (deprecated for new local users, kept for backwards compatibility)
  googleId?: string;
  microsoftId?: string;

  // Common fields
  email: string;
  name: string;

  // OAuth tokens (optional for basic auth users, required for OAuth-only users)
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: Date;

  // Authentication provider
  provider: "local";

  // OAuth connections for local users
  connectedProviders: IOAuthConnection[];

  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email Types
export interface IEmail extends Document {
  userId: Types.ObjectId; // Reference to User model
  messageId?: string;
  subject: string;
  recipients: {
    to: string[];
    cc: string[];
    bcc: string[];
  };
  body: string;
  htmlBody?: string;
  sendTimestamp: Date;
  status: "sent" | "failed" | "draft";
  provider: "gmail" | "outlook";
  trackingId: string;
  error?: string;
}

// Email Tracking Types
export interface IEmailTracking extends Document {
  trackingId: string;
  emailId: Types.ObjectId; // Reference to Email model
  eventType: "open" | "click" | "reply" | "forward";
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  clickedUrl?: string;
  recipientEmail?: string; // Track which specific recipient opened/clicked
  metadata?: Record<string, any>;
}

// Analytics Types
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

// Environment Config Type
export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  MONGODB_URI: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  MICROSOFT_REDIRECT_URI: string;
  MICROSOFT_TENANT_ID: string;
  JWT_SECRET: string;
  SESSION_SECRET: string;
  FRONTEND_URL: string;
  APP_URL: string;
  TRACKING_COOLDOWN_SECONDS: number;
}

// Email Service Request Type
export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  provider: "gmail" | "outlook";
}

// Email with Tracking Stats (for frontend)
export interface EmailWithTracking extends IEmail {
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
