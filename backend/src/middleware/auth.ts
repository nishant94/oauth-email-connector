import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { IUser } from "../types";
import { User } from "../models";

export const generateToken = (user: IUser): string => {
  return jwt.sign({ id: user._id }, config.JWT_SECRET, { expiresIn: "1h" });
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    token = req.cookies?.authToken;
  }

  if (!token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ message: "No token, authorization denied" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ message: "Token is not valid" });
    return;
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    token = req.cookies?.authToken;
  }

  if (!token) {
    token = req.query.token as string;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id);

    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    console.warn("Optional token verification failed:", error);
    next();
  }
};
