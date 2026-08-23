import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { z } from "zod";
import type { AuthenticatedUser } from "./require-roles.js";

const jwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: z.enum(["admin", "manager", "staff", "customer"]),
  tenantId: z.string().nullable(),
  jti: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

const jwtSecret = process.env.JWT_SECRET;

/**
 * Verifies the access token locally and stores its claims in the Hono context.
 * Configure JWT_SECRET to the same HS256 secret used by auth-service.
 */
export const authenticateAccessToken = createMiddleware(async (c, next) => {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const authorization = c.req.header("Authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : getCookie(c, "access_token");

  if (!token) {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  try {
    const payload = await verify(token, jwtSecret, "HS256");
    const user = jwtPayloadSchema.parse(payload) as AuthenticatedUser;
    c.set("user", user);
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired access token" });
  }

  await next();
});
