import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { MenuController } from "./menu.controller.js";
import {
  MenuService,
  PublicMenuNotFoundError,
} from "./menu.service.js";

function createApp(service: Record<string, unknown>) {
  const app = new Hono();
  const controller = new MenuController(service as unknown as MenuService);
  app.get("/:tenantId/menu", controller.getMenu);
  app.get("/:tenantId/products/:productId", controller.getProduct);
  return app;
}

describe("public menu controller", () => {
  test("returns a tenant menu with cache headers", async () => {
    const app = createApp({ getMenu: async (tenantId: string) => [{ tenantId }] });

    const response = await app.request("/tenant-1/menu");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("max-age=30");
    expect(await response.json()).toMatchObject({
      success: true,
      message: "Menu retrieved successfully",
      data: [{ tenantId: "tenant-1" }],
    });
  });

  test("returns a public product detail", async () => {
    const app = createApp({
      getProduct: async () => ({
        id: "product-1",
        variants: [{ label: "Regular", price: "10.00" }],
        addOns: [],
      }),
    });

    const response = await app.request("/tenant-1/products/product-1");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { id: "product-1", variants: [{ label: "Regular" }] },
    });
  });

  test("returns 404 for an unavailable product", async () => {
    const app = createApp({
      getProduct: async () => {
        throw new PublicMenuNotFoundError("Product not found");
      },
    });

    const response = await app.request("/tenant-1/products/missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      success: false,
      message: "Product not found",
      status: 404,
    });
  });
});
