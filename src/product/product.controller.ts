import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { db } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/response.js";
import {
  ProductConflictError,
  ProductNotFoundError,
  ProductService,
  ProductValidationError,
} from "./product.service.js";
import {
  createProductSchema,
  productAvailabilitySchema,
  productIdParamsSchema,
  productListQuerySchema,
  updateProductSchema,
} from "./product.validation.js";

export class ProductController {
  constructor(private readonly service = new ProductService(db)) {}

  list = async (c: Context) =>
    this.execute(
      c,
      () => {
        const { categoryId } = productListQuerySchema.parse({
          categoryId: c.req.query("categoryId"),
        });
        return this.service.list(this.tenantId(c), categoryId);
      },
      "Products retrieved successfully",
    );

  getById = async (c: Context) =>
    this.execute(
      c,
      () => {
        const { id } = productIdParamsSchema.parse(c.req.param());
        return this.service.getById(this.tenantId(c), id);
      },
      "Product retrieved successfully",
    );

  create = async (c: Context) =>
    this.execute(
      c,
      async () => this.service.create(this.tenantId(c), createProductSchema.parse(await c.req.json())),
      "Product created successfully",
      201,
    );

  update = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = productIdParamsSchema.parse(c.req.param());
        return this.service.update(
          this.tenantId(c),
          id,
          updateProductSchema.parse(await c.req.json()),
        );
      },
      "Product updated successfully",
    );

  setAvailability = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = productIdParamsSchema.parse(c.req.param());
        const { isActive } = productAvailabilitySchema.parse(await c.req.json());
        return this.service.setAvailability(this.tenantId(c), id, isActive);
      },
      "Product availability updated successfully",
    );

  remove = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = productIdParamsSchema.parse(c.req.param());
        await this.service.remove(this.tenantId(c), id);
        return null;
      },
      "Product deleted successfully",
      204,
    );

  private tenantId(c: Context) {
    const tenantId = c.get("user").tenantId;
    if (!tenantId) {
      throw new HTTPException(403, {
        message: "A tenant is required for this operation",
      });
    }
    return tenantId;
  }

  private async execute(
    c: Context,
    operation: () => unknown | Promise<unknown>,
    message: string,
    status: 200 | 201 | 204 = 200,
  ) {
    try {
      return successResponse(c, message, await operation(), status);
    } catch (error) {
      if (error instanceof HTTPException) {
        return errorResponse(c, error.message, this.httpStatus(error.status));
      }
      if (error instanceof ProductNotFoundError) {
        return errorResponse(c, error.message, 404);
      }
      if (error instanceof ProductConflictError) {
        return errorResponse(c, error.message, 409);
      }
      if (error instanceof ProductValidationError || error instanceof ZodError) {
        return errorResponse(
          c,
          error instanceof ZodError ? "Invalid request body or parameters" : error.message,
          400,
        );
      }

      logger.error({ error, path: c.req.path }, "Failed to process product request");
      return errorResponse(c, "Internal server error", 500);
    }
  }

  private httpStatus(status: number) {
    const allowedStatuses = [400, 401, 403, 404, 409, 500] as const;
    return allowedStatuses.includes(status as (typeof allowedStatuses)[number])
      ? (status as (typeof allowedStatuses)[number])
      : 500;
  }
}
