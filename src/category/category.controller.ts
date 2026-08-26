import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError, z } from "zod";
import { db } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/response.js";
import {
  CategoryConflictError,
  CategoryNotFoundError,
  CategoryService,
  CategoryValidationError,
} from "./category.service.js";
import {
  availabilitySchema,
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation.js";

export class CategoryController {
  constructor(private readonly service = new CategoryService(db)) {}

  list = async (c: Context) =>
    this.execute(
      c,
      () => this.service.list(this.tenantId(c)),
      "Categories retrieved successfully",
    );

  getById = async (c: Context) =>
    this.execute(
      c,
      () => {
        const { id } = categoryIdParamsSchema.parse(c.req.param());
        return this.service.getById(this.tenantId(c), id);
      },
      "Category retrieved successfully",
    );

  create = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const input = createCategorySchema.parse(await c.req.json());
        return this.service.create(this.tenantId(c), input);
      },
      "Category created successfully",
      201,
    );

  update = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = categoryIdParamsSchema.parse(c.req.param());
        const input = updateCategorySchema.parse(await c.req.json());
        return this.service.update(this.tenantId(c), id, input);
      },
      "Category updated successfully",
    );

  setAvailability = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = categoryIdParamsSchema.parse(c.req.param());
        const { isActive } = availabilitySchema.parse(await c.req.json());
        return this.service.setAvailability(this.tenantId(c), id, isActive);
      },
      "Category availability updated successfully",
    );

  remove = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = categoryIdParamsSchema.parse(c.req.param());
        await this.service.remove(this.tenantId(c), id);
        return null;
      },
      "Category deleted successfully",
      204,
    );

  publicList = async (c: Context) =>
    this.execute(
      c,
      () => this.service.list(this.urlTenantId(c)),
      "Categories retrieved successfully",
    );

  publicGetById = async (c: Context) =>
    this.execute(
      c,
      () => {
        const { id } = categoryIdParamsSchema.parse(c.req.param());
        return this.service.getById(this.urlTenantId(c), id);
      },
      "Category retrieved successfully",
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

  private urlTenantId(c: Context) {
    return z.string().trim().min(1).parse(c.req.param("tenantId"));
  }

  private async execute(
    c: Context,
    operation: () => unknown | Promise<unknown>,
    message: string,
    status: 200 | 201 | 204 = 200,
  ) {
    try {
      const data = await operation();
      return successResponse(c, message, data, status);
    } catch (error) {
      if (error instanceof HTTPException) {
        return errorResponse(c, error.message, this.httpStatus(error.status));
      }
      if (error instanceof CategoryNotFoundError) {
        return errorResponse(c, error.message, 404);
      }
      if (error instanceof CategoryConflictError) {
        return errorResponse(c, error.message, 409);
      }
      if (
        error instanceof CategoryValidationError ||
        error instanceof ZodError
      ) {
        return errorResponse(
          c,
          error instanceof ZodError
            ? "Invalid request body or parameters"
            : error.message,
          400,
        );
      }

      logger.error(
        { error, path: c.req.path },
        "Failed to process category request",
      );
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
