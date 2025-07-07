import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      message: "Please check your input and try again",
      details: errors.array().map((error) => ({
        field: error.type === "field" ? (error as any).path : "unknown",
        message: error.msg,
        value: error.type === "field" ? (error as any).value : undefined,
      })),
    });
    return;
  }

  next();
};

// User validation rules
export const validateUserUpdate = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Name must be less than 100 characters"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  handleValidationErrors,
];

// Email send validation
export const validateEmailSend = [
  body("to")
    .isArray({ min: 1 })
    .withMessage("Recipients are required")
    .custom((emails: string[]) => {
      for (const email of emails) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error(`Invalid email address: ${email}`);
        }
      }
      return true;
    }),

  body("cc")
    .optional()
    .isArray()
    .withMessage("CC must be an array")
    .custom((emails: string[]) => {
      if (emails && emails.length > 0) {
        for (const email of emails) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error(`Invalid CC email address: ${email}`);
          }
        }
      }
      return true;
    }),

  body("bcc")
    .optional()
    .isArray()
    .withMessage("BCC must be an array")
    .custom((emails: string[]) => {
      if (emails && emails.length > 0) {
        for (const email of emails) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error(`Invalid BCC email address: ${email}`);
          }
        }
      }
      return true;
    }),

  body("subject")
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ max: 500 })
    .withMessage("Subject must not exceed 500 characters"),

  body("body")
    .notEmpty()
    .withMessage("Email body is required")
    .isLength({ max: 50000 })
    .withMessage("Email body must not exceed 50,000 characters"),

  body("htmlBody")
    .optional()
    .isLength({ max: 100000 })
    .withMessage("HTML body must not exceed 100,000 characters"),

  body("provider")
    .isIn(["gmail", "outlook"])
    .withMessage("Provider must be either gmail or outlook"),

  handleValidationErrors,
];

// URL validation for click tracking
export const validateClickTracking = [
  param("trackingId").notEmpty().withMessage("Tracking ID is required"),
  param("url").notEmpty().withMessage("URL is required"),
  param("recipient").notEmpty().withMessage("Recipient email is required"),
  handleValidationErrors,
];

// ObjectId validation middleware
export const validateObjectId = (paramName: string = "id") => [
  param(paramName).custom((value: string) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${paramName} format`);
    }
    return true;
  }),
  handleValidationErrors,
];
