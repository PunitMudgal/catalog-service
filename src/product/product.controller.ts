import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError, z } from "zod";
import { db } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/response.js";
import {
  CloudinaryConfigurationError,
  CloudinaryValidationError,
} from "../utils/cloudinary.js";
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
      async () => {
        const { input, image } = await this.parseBody(c, createProductSchema);
        return this.service.create(this.tenantId(c), input, image);
      },
      "Product created successfully",
      201,
    );

  update = async (c: Context) =>
    this.execute(
      c,
      async () => {
        const { id } = productIdParamsSchema.parse(c.req.param());
        const { input, image } = await this.parseBody(c, updateProductSchema);
        return this.service.update(
          this.tenantId(c),
          id,
          input,
          image,
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

  publicList = async (c: Context) =>
    this.execute(
      c,
      () => {
        const { categoryId } = productListQuerySchema.parse({
          categoryId: c.req.query("categoryId"),
        });
        return this.service.list(this.urlTenantId(c), categoryId);
      },
      "Products retrieved successfully",
    );

  publicGetById = async (c: Context) =>
    this.execute(
      c,
      () => {
        const { id } = productIdParamsSchema.parse(c.req.param());
        return this.service.getById(this.urlTenantId(c), id);
      },
      "Product retrieved successfully",
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
      if (
        error instanceof ProductValidationError ||
        error instanceof CloudinaryValidationError ||
        error instanceof ZodError
      ) {
        return errorResponse(
          c,
          error instanceof ZodError ? "Invalid request body or parameters" : error.message,
          400,
        );
      }
      if (error instanceof CloudinaryConfigurationError) {
        return errorResponse(c, "Image upload is not configured", 500);
      }

      logger.error({ error, path: c.req.path }, "Failed to process product request");
      return errorResponse(c, "Internal server error", 500);
    }
  }

  private async parseBody<T>(
    c: Context,
    schema: { parse(value: unknown): T },
  ): Promise<{ input: T; image: File | null }> {
    const contentType = c.req.header("Content-Type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return { input: schema.parse(await c.req.json()), image: null };
    }

    const form = await c.req.formData();
    const body: Record<string, unknown> = {};
    const stringFields = ["name", "categoryId", "description", "imageUrl"];

    for (const field of stringFields) {
      const value = form.get(field);
      if (value !== null && typeof value === "string" && value !== "") {
        body[field] = value;
      } else if (
        value === "" &&
        (field === "description" || field === "imageUrl")
      ) {
        body[field] = null;
      }
    }

    const booleanFields = ["isVeg"];
    for (const field of booleanFields) {
      const value = form.get(field);
      if (typeof value === "string" && value !== "") {
        if (value !== "true" && value !== "false") {
          throw new ZodError([
            { code: "custom", path: [field], message: "Must be true or false" },
          ]);
        }
        body[field] = value === "true";
      }
    }

    const numberFields = ["displayOrder"];
    for (const field of numberFields) {
      const value = form.get(field);
      if (typeof value === "string" && value !== "") body[field] = Number(value);
    }

    for (const field of ["variants", "addOnIds", "attributes"]) {
      const value = form.get(field);
      if (typeof value === "string" && value !== "") {
        try {
          body[field] = JSON.parse(value);
        } catch {
          throw new ZodError([
            { code: "custom", path: [field], message: "Must be valid JSON" },
          ]);
        }
      }
    }

    const imageValue = form.get("image");
    if (imageValue !== null && !(imageValue instanceof File)) {
      throw new ZodError([
        { code: "custom", path: ["image"], message: "Must be an image file" },
      ]);
    }

    return {
      input: schema.parse(body),
      image: imageValue instanceof File ? imageValue : null,
    };
  }

  private httpStatus(status: number) {
    const allowedStatuses = [400, 401, 403, 404, 409, 500] as const;
    return allowedStatuses.includes(status as (typeof allowedStatuses)[number])
      ? (status as (typeof allowedStatuses)[number])
      : 500;
  }
}
