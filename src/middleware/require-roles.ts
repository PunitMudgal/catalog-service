import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export type UserRole = "admin" | "manager" | "staff" | "customer";

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  jti?: string;
  iat?: number;
  exp?: number;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthenticatedUser;
  }
}

export const requireRoles = (...allowedRoles: UserRole[]) =>
  createMiddleware(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    if (!allowedRoles.includes(user.role)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }

    await next();
  });
