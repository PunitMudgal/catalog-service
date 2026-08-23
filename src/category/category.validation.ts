import { z } from "zod";

const categoryName = z.string().trim().min(1).max(100);
const categoryIcon = z.string().trim().max(50).nullable().optional();

export const categoryIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const createCategorySchema = z
  .object({
    name: categoryName,
    parentId: z.string().trim().min(1).nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
    icon: categoryIcon,
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: categoryName.optional(),
    parentId: z.string().trim().min(1).nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
    icon: categoryIcon,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const availabilitySchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
