import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import { User } from "../models";
import { generateToken, requireAuth, optionalAuth } from "../middleware/auth";
import { config } from "../config/env";
import { IUser } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { body, validationResult } from "express-validator";

import "express-session";

declare module "express-session" {
  interface SessionData {
    connectingUserId?: string;
  }
}

const router = express.Router();

router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username must be 3-30 characters and contain only letters, numbers, and underscores",
      ),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("name")
      .isLength({ min: 1, max: 100 })
      .withMessage("Name is required and must be less than 100 characters"),
  ],
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { username, email, password, name } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error:
          existingUser.username === username
            ? "Username already exists"
            : "Email already exists",
      });
    }

    const user = new User({
      username,
      email,
      password,
      name,
      provider: "local",
      connectedProviders: [],
    });

    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        provider: user.provider,
        connectedProviders: user.connectedProviders,
      },
    });
  }),
);

router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user || user.provider !== "local") {
      return res.status(400).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isPasswordValid = await (user as any).comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        provider: user.provider,
        connectedProviders: user.connectedProviders,
      },
    });
  }),
);

router.get(
  "/connect/google",
  requireAuth,
  (req: Request, _res: Response, next: NextFunction) => {
    if (req.user) {
      req.session.connectingUserId = (req.user as IUser)._id.toString();
      console.log(
        "🔗 Storing user ID in session for Google connection:",
        req.session.connectingUserId,
      );
    } else {
      console.log("No authenticated user found for Google connection");
    }
    next();
  },
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  }),
);

router.get(
  "/connect/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${config.FRONTEND_URL}/dashboard?error=google_connection_failed`,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      return res.redirect(
        `${config.FRONTEND_URL}/dashboard?error=user_not_found`,
      );
    }

    delete req.session.connectingUserId;

    const token = generateToken(user);
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.redirect(`${config.FRONTEND_URL}/dashboard?connected=google`);
  }),
);

router.get(
  "/connect/microsoft",
  requireAuth,
  (req: Request, _res: Response, next: NextFunction) => {
    if (req.user) {
      req.session.connectingUserId = (req.user as IUser)._id.toString();
      console.log(
        "🔗 Storing user ID in session for Microsoft connection:",
        req.session.connectingUserId,
      );
    } else {
      console.log("No authenticated user found for Microsoft connection");
    }
    next();
  },
  passport.authenticate("microsoft", {
    scope: ["User.Read", "Mail.Send", "Mail.Read"],
  }),
);

router.get(
  "/connect/microsoft/callback",
  passport.authenticate("microsoft", {
    failureRedirect: `${config.FRONTEND_URL}/dashboard?error=microsoft_connection_failed`,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      return res.redirect(
        `${config.FRONTEND_URL}/dashboard?error=user_not_found`,
      );
    }

    console.log("🧹 Clearing session data");
    delete req.session.connectingUserId;

    const token = generateToken(user);
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
    });

    console.log("Microsoft connection successful, redirecting to dashboard");

    res.redirect(`${config.FRONTEND_URL}/dashboard?connected=microsoft`);
  }),
);

router.delete(
  "/disconnect/:provider",
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { provider } = req.params;
    const user = req.user as IUser;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (provider !== "google" && provider !== "microsoft") {
      return res.status(400).json({
        success: false,
        error: "Invalid provider",
      });
    }

    user.connectedProviders = user.connectedProviders.filter(
      (conn) => conn.provider !== provider,
    );

    user.updatedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: `${provider} account disconnected successfully`,
      connectedProviders: user.connectedProviders,
    });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie("authToken");
    res.json({ success: true, message: "Logged out successfully" });
  }),
);

router.get(
  "/status",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
      const user = req.user as IUser;
      return res.json({
        success: true,
        isAuthenticated: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          provider: user.provider,
          connectedProviders: user.connectedProviders || [],
        },
      });
    } else {
      return res.json({ success: false, isAuthenticated: false });
    }
  }),
);

export default router;
