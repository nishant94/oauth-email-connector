import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// Create rate limiter with custom message format
const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string,
  skipSuccessfulRequests: boolean = false,
) => {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Rate limit exceeded",
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Tracking rate limiter - for tracking pixels and clicks (USED)
export const trackingRateLimit = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  200, // 200 tracking events per minute
  "Too many tracking requests. Please slow down.",
);
