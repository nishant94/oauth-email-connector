import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./config/database";
import { config } from "./config/env";
import passport from "./config/passport";
import routes from "./routes";

const app = express();

app.set("trust proxy", 1);

app.use(cookieParser());

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

app.use(
  cors({
    origin: [config.FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS,PATCH",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Cookie,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers",
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(204).send();
});

app.use(morgan("combined"));

app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.MONGODB_URI,
      touchAfter: 24 * 3600,
    }),
    cookie: {
      secure: config.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

import { optionalAuth } from "./middleware/auth";
app.use(optionalAuth);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({
    message: "EmailConnector API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Global error handler:", error);

    res.status(error.status || 500).json({
      success: false,
      error: error.message || "Internal server error",
      ...(config.NODE_ENV === "development" && { stack: error.stack }),
    });
  },
);

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

const startServer = async () => {
  try {
    await connectDatabase();
    console.log("Database connected successfully");

    const server = app.listen(config.PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`📧 EmailConnector API is ready!`);
      console.log(`🌐 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });

      setTimeout(() => {
        console.error(
          "Could not close connections in time, forcefully shutting down",
        );
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();
