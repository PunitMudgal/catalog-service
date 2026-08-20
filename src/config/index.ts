import { config } from "dotenv";
import { resolve } from "path";

const env = process.env.NODE_ENV || "development";

config({
  path: resolve(process.cwd(), `.env.${env}`),
  override: true,
});

const { PORT, FRONTEND_URL, DATABASE_URL } = process.env;

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const Config = {
  port: parseInteger(PORT, 3000),
  frontendURL: FRONTEND_URL || "http://localhost:3000",
  databaseURL: DATABASE_URL!,
};
