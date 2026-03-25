import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { hrtime } from "node:process";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/error-handler.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { NotFoundError } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import { env } from "./config/env.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(globalLimiter);
app.use(
  pinoHttp({
    logger,
    autoLogging: false,
    quietReqLogger: true,
  })
);
app.use((req, res, next) => {
  const start = hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(hrtime.bigint() - start) / 1_000_000;
    const roundedDurationMs = Math.round(durationMs * 100) / 100;

    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${roundedDurationMs}ms`
    );
  });

  next();
});

// Routes
app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to http API",
    version: "1.0.0",
    environment: env.NODE_ENV,
  });
});

app.use("/health", healthRouter);

// 404 handler
app.all("*path", () => {
  throw new NotFoundError("Route not found");
});

// Error handler
app.use(errorHandler);

export default app;
