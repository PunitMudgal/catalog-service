import type { Context } from "hono";
import { ZodError, z } from "zod";
import { db } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { MenuService, PublicMenuNotFoundError } from "./menu.service.js";

const tenantIdSchema = z.string().trim().min(1);
const productParamsSchema = z.object({
  tenantId: tenantIdSchema,
  productId: z.string().trim().min(1),
});

export class MenuController {
  constructor(private readonly service = new MenuService(db)) {}

  getMenu = async (c: Context) => {
    c.header("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    const result = await this.execute(
      c,
      () => this.service.getMenu(this.tenantId(c)),
      "Menu retrieved successfully",
    );
    return result;
  };

  getProduct = async (c: Context) =>
    this.execute(
      c,
      () => {
        const { tenantId, productId } = productParamsSchema.parse(c.req.param());
        return this.service.getProduct(tenantId, productId);
      },
      "Product retrieved successfully",
    );

  private tenantId(c: Context) {
    return tenantIdSchema.parse(c.req.param("tenantId"));
  }

  private async execute(
    c: Context,
    operation: () => unknown | Promise<unknown>,
    message: string,
  ) {
    try {
      return successResponse(c, message, await operation());
    } catch (error) {
      if (error instanceof PublicMenuNotFoundError) {
        return errorResponse(c, error.message, 404);
      }
      if (error instanceof ZodError) {
        return errorResponse(c, "Invalid request parameters", 400);
      }

      logger.error({ error, path: c.req.path }, "Failed to process public menu request");
      return errorResponse(c, "Internal server error", 500);
    }
  }
}
