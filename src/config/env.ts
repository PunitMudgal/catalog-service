import { config } from "dotenv";
import { resolve } from "path";

const env = process.env.NODE_ENV || "development";

// Load env-specific file first (e.g. .env.development) — highest priority
config({
  path: resolve(process.cwd(), `.env.${env}`),
  override: true,
});

// Fallback to base .env if env-specific file doesn't contain all keys
// override: false so existing vars from .env.${env} are not clobbered
config({
  path: resolve(process.cwd(), ".env"),
  override: false,
});
