import dotenv from "dotenv";
import { EnvironmentConfig } from "../types";

dotenv.config();

export const config: EnvironmentConfig = {
  NODE_ENV: (process.env.NODE_ENV || "development") as
    | "development"
    | "production"
    | "test",
  PORT: parseInt(process.env.PORT || "6333", 10),
  MONGODB_URI: process.env.MONGODB_URI!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:6333/api/auth/connect/google/callback",
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID!,
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET!,
  MICROSOFT_REDIRECT_URI:
    process.env.MICROSOFT_REDIRECT_URI ||
    "http://localhost:6333/api/auth/connect/microsoft/callback",
  MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID!,
  JWT_SECRET: process.env.JWT_SECRET!,
  SESSION_SECRET: process.env.SESSION_SECRET!,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  APP_URL: process.env.APP_URL || "http://localhost:6333",
  TRACKING_COOLDOWN_SECONDS: parseInt(
    process.env.TRACKING_COOLDOWN_SECONDS || "10",
    10,
  ),
};
