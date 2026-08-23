import { z } from "zod";

const price = z.coerce.number().finite().min(0);

export const productIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const productListQuerySchema = z.object({
  categoryId: z.string().trim().min(1).optional(),
});

const variantSchema = z
  .object({
    label: z.string().trim().min(1).max(50),
    price,
    isDefault: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .strict();

const addOnIdsSchema = z
  .array(z.string().trim().min(1))
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Add-on IDs must be unique",
  });

export const createProductSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    categoryId: z.string().trim().min(1),
    isVeg: z.boolean().nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    variants: z.array(variantSchema).min(1),
    addOnIds: addOnIdsSchema.optional(),
  })
  .strict()
  .superRefine((product, context) => {
    const labels = product.variants.map((variant) => variant.label.toLowerCase());
    if (new Set(labels).size !== labels.length) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Variant labels must be unique",
      });
    }
  });

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    categoryId: z.string().trim().min(1).optional(),
    isVeg: z.boolean().nullable().optional(),
  })
  .strict()
  .refine((product) => Object.keys(product).length > 0, {
    message: "At least one field is required",
  });

export const productAvailabilitySchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
