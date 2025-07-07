import express from "express";
import authRoutes from "./auth";
import emailRoutes from "./email";
import trackingRoutes from "./tracking";
import userRoutes from "./user";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

router.use("/auth", authRoutes);
router.use("/email", emailRoutes);
router.use("/tracking", trackingRoutes);
router.use("/user", userRoutes);

router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

export default router;
