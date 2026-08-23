import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { CategoryController } from "./category.controller.js";
import {
  CategoryConflictError,
  CategoryNotFoundError,
} from "./category.service.js";
import type { CategoryService } from "./category.service.js";
import type { AuthenticatedUser } from "../middleware/require-roles.js";

const user: AuthenticatedUser = {
  sub: "user-1",
  email: "manager@example.com",
  role: "manager",
  tenantId: "tenant-1",
};

function createApp(
  service: Record<string, unknown>,
  authenticatedUser: AuthenticatedUser = user,
) {
  const app = new Hono();
  const controller = new CategoryController(service as unknown as CategoryService);

  app.use("*", async (c, next) => {
    c.set("user", authenticatedUser);
    await next();
  });
  app.get("/categories/:id", controller.getById);
  app.post("/categories", controller.create);

  return app;
}

describe("category controller", () => {
  test("returns a category with the standard success response", async () => {
    const app = createApp({
      getById: async () => ({
        id: "category-1",
        tenantId: "tenant-1",
        name: "Pizza",
      }),
    });

    const response = await app.request("/categories/category-1");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      message: "Category retrieved successfully",
      data: {
        id: "category-1",
        tenantId: "tenant-1",
        name: "Pizza",
      },
      status: 200,
    });
  });

  test("returns 400 when the create body is invalid", async () => {
    const app = createApp({ create: async () => undefined });

    const response = await app.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      message: "Invalid request body or parameters",
      status: 400,
    });
  });

  test("returns 404 when the service cannot find a category", async () => {
    const app = createApp({
      getById: async () => {
        throw new CategoryNotFoundError("Category not found");
      },
    });

    const response = await app.request("/categories/missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      success: false,
      message: "Category not found",
      status: 404,
    });
  });

  test("returns 409 when the service detects a category conflict", async () => {
    const app = createApp({
      create: async () => {
        throw new CategoryConflictError("A category with this name already exists");
      },
    });

    const response = await app.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Pizza" }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      success: false,
      message: "A category with this name already exists",
      status: 409,
    });
  });

  test("returns 403 when the authenticated user has no tenant", async () => {
    const app = createApp({
      getById: async () => undefined,
    }, { ...user, tenantId: null });

    const response = await app.request("/categories/category-1");

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      success: false,
      message: "A tenant is required for this operation",
      status: 403,
    });
  });
});
