import "dotenv/config";

const port = parseInt(process.env.PORT || "3000", 10);
if (isNaN(port) || port < 0 || port > 65535) {
  throw new Error(
    `Invalid PORT: ${process.env.PORT}. Must be a number between 0 and 65535.`
  );
}

const rateLimitWindowMs = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "900000",
  10
);
if (isNaN(rateLimitWindowMs) || rateLimitWindowMs < 0) {
  throw new Error(
    `Invalid RATE_LIMIT_WINDOW_MS: ${process.env.RATE_LIMIT_WINDOW_MS}. Must be a positive number.`
  );
}

const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
if (isNaN(rateLimitMax) || rateLimitMax < 1) {
  throw new Error(
    `Invalid RATE_LIMIT_MAX: ${process.env.RATE_LIMIT_MAX}. Must be a positive number.`
  );
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: port,
  RATE_LIMIT_WINDOW_MS: rateLimitWindowMs,
  RATE_LIMIT_MAX: rateLimitMax,
} as const;
