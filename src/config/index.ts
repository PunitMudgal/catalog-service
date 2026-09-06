import "./env.js";

const { PORT, ADMIN_FRONTEND_URL, CLIENT_FRONTEND_URL, DATABASE_URL } =
  process.env;

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const Config = {
  port: parseInteger(PORT, 3000),
  adminFrontendURL: ADMIN_FRONTEND_URL || "http://localhost:3000",
  clientFrontendURL: CLIENT_FRONTEND_URL || "http://localhost:3000",
  databaseURL: DATABASE_URL!,
};
