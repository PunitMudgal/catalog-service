import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { db } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/response.js";
import {
  VariantConflictError,
  VariantNotFoundError,
  VariantService,
} from "./variant.service.js";
import {
  createVariantSchema,
  productIdParamsSchema,
  updateVariantSchema,
  variantAvailabilitySchema,
  variantIdParamsSchema,
} from "./variant.validation.js";

export class VariantController {
  constructor(private readonly service = new VariantService(db)) {}

  create = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { productId } = productIdParamsSchema.parse(c.req.param());
        return this.service.create(
          this.tenantId(c),
          productId,
          createVariantSchema.parse(await c.req.json()),
        );
      },
      "Variant created successfully",
      201,
    );

  update = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = variantIdParamsSchema.parse(c.req.param());
        return this.service.update(
          this.tenantId(c),
          id,
          updateVariantSchema.parse(await c.req.json()),
        );
      },
      "Variant updated successfully",
    );

  setAvailability = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = variantIdParamsSchema.parse(c.req.param());
        const { isActive } = variantAvailabilitySchema.parse(await c.req.json());
        return this.service.setAvailability(this.tenantId(c), id, isActive);
      },
      "Variant availability updated successfully",
    );

  remove = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = variantIdParamsSchema.parse(c.req.param());
        await this.service.remove(this.tenantId(c), id);
        return null;
      },
      "Variant deleted successfully",
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
      if (error instanceof VariantNotFoundError) {
        return errorResponse(c, error.message, 404);
      }
      if (error instanceof VariantConflictError) {
        return errorResponse(c, error.message, 409);
      }
      if (error instanceof ZodError) {
        return errorResponse(c, "Invalid request body or parameters", 400);
      }

      logger.error({ error, path: c.req.path }, "Failed to process variant request");
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
