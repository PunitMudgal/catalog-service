import { z } from "zod";

export const addOnIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const productAddOnParamsSchema = z.object({
  productId: z.string().trim().min(1),
  addOnId: z.string().trim().min(1),
});

export const createAddOnSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    price: z.coerce.number().finite().min(0),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateAddOnSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    price: z.coerce.number().finite().min(0).optional(),
  })
  .strict()
  .refine((addOn) => Object.keys(addOn).length > 0, {
    message: "At least one field is required",
  });

export type CreateAddOnInput = z.infer<typeof createAddOnSchema>;
export type UpdateAddOnInput = z.infer<typeof updateAddOnSchema>;
