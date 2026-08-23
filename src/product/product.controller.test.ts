import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { ProductController } from "./product.controller.js";
import type { ProductService } from "./product.service.js";
import type { AuthenticatedUser } from "../middleware/require-roles.js";

const user: AuthenticatedUser = {
  sub: "manager-1",
  email: "manager@example.com",
  role: "manager",
  tenantId: "tenant-1",
};

function createApp(service: Record<string, unknown>) {
  const app = new Hono();
  const controller = new ProductController(service as unknown as ProductService);
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.post("/products", controller.create);
  app.patch("/products/:id", controller.update);
  return app;
}

describe("product controller image uploads", () => {
  test("accepts a product image in multipart create requests", async () => {
    let receivedImage: File | null | undefined;
    const app = createApp({
      create: async (_tenantId: string, _input: unknown, image: File | null) => {
        receivedImage = image;
        return { id: "product-1" };
      },
    });
    const form = new FormData();
    form.append("name", "Pizza");
    form.append("categoryId", "category-1");
    form.append("variants", '[{"label":"Regular","price":10}]');
    form.append("image", new File(["image"], "pizza.jpg", { type: "image/jpeg" }));

    const response = await app.request("/products", { method: "POST", body: form });

    expect(response.status).toBe(201);
    expect(receivedImage?.name).toBe("pizza.jpg");
  });

  test("accepts a replacement image in multipart update requests", async () => {
    let receivedImage: File | null | undefined;
    const app = createApp({
      update: async (
        _tenantId: string,
        _id: string,
        _input: unknown,
        image: File | null,
      ) => {
        receivedImage = image;
        return { id: "product-1" };
      },
    });
    const form = new FormData();
    form.append("name", "Updated Pizza");
    form.append("image", new File(["new image"], "updated.jpg", { type: "image/jpeg" }));

    const response = await app.request("/products/product-1", {
      method: "PATCH",
      body: form,
    });

    expect(response.status).toBe(200);
    expect(receivedImage?.name).toBe("updated.jpg");
  });
});
