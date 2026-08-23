import { z } from "zod";

export const productIdParamsSchema = z.object({
  productId: z.string().trim().min(1),
});

export const variantIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const createVariantSchema = z
  .object({
    label: z.string().trim().min(1).max(50),
    price: z.coerce.number().finite().min(0),
    isDefault: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .strict();

export const updateVariantSchema = z
  .object({
    label: z.string().trim().min(1).max(50).optional(),
    price: z.coerce.number().finite().min(0).optional(),
  })
  .strict()
  .refine((variant) => Object.keys(variant).length > 0, {
    message: "At least one field is required",
  });

export const variantAvailabilitySchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
