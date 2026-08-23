import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  addOns,
  categories,
  productAddOns,
  productVariants,
  products,
} from "../db/schema.js";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "./product.validation.js";

type Database = typeof import("../db/index.js").db;

export class ProductNotFoundError extends Error {}
export class ProductConflictError extends Error {}
export class ProductValidationError extends Error {}

export class ProductService {
  constructor(private readonly database: Database) {}

  async list(tenantId: string, categoryId?: string) {
    const conditions = [eq(products.tenantId, tenantId), isNull(products.deletedAt)];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));

    return this.database
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(products.displayOrder, products.name);
  }

  async getById(tenantId: string, id: string) {
    const product = await this.findProduct(tenantId, id);
    const [variants, addOnRows] = await Promise.all([
      this.database
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, id),
            isNull(productVariants.deletedAt),
          ),
        )
        .orderBy(productVariants.displayOrder, productVariants.label),
      this.database
        .select({ addOn: addOns })
        .from(productAddOns)
        .innerJoin(addOns, eq(productAddOns.addOnId, addOns.id))
        .where(
          and(
            eq(productAddOns.productId, id),
            eq(addOns.tenantId, tenantId),
            isNull(addOns.deletedAt),
          ),
        ),
    ]);

    return {
      ...product,
      variants,
      addOns: addOnRows.map(({ addOn }) => addOn),
    };
  }

  async create(tenantId: string, input: CreateProductInput) {
    await this.assertCategoryBelongsToTenant(tenantId, input.categoryId);
    const selectedAddOns = await this.getTenantAddOns(tenantId, input.addOnIds ?? []);

    const result = await this.database.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          tenantId,
          categoryId: input.categoryId,
          name: input.name,
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          isVeg: input.isVeg ?? null,
          displayOrder: input.displayOrder ?? 0,
          attributes: input.attributes,
        })
        .returning();

      if (!product) throw new ProductConflictError("Product could not be created");

      const variants = await tx
        .insert(productVariants)
        .values(
          input.variants.map((variant) => ({
            productId: product.id,
            label: variant.label,
            price: String(variant.price),
            isDefault: variant.isDefault ?? false,
            displayOrder: variant.displayOrder ?? 0,
          })),
        )
        .returning();

      if (input.addOnIds?.length) {
        await tx.insert(productAddOns).values(
          input.addOnIds.map((addOnId) => ({
            productId: product.id,
            addOnId,
          })),
        );
      }

      return { product, variants };
    });

    return { ...result.product, variants: result.variants, addOns: selectedAddOns };
  }

  async update(tenantId: string, id: string, input: UpdateProductInput) {
    await this.findProduct(tenantId, id);
    if (input.categoryId) {
      await this.assertCategoryBelongsToTenant(tenantId, input.categoryId);
    }

    const [product] = await this.database
      .update(products)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
        ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
        ...(input.isVeg === undefined ? {} : { isVeg: input.isVeg }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.id, id),
          isNull(products.deletedAt),
        ),
      )
      .returning();

    if (!product) throw new ProductNotFoundError("Product not found");
    return product;
  }

  async setAvailability(tenantId: string, id: string, isActive: boolean) {
    await this.findProduct(tenantId, id);
    const [product] = await this.database
      .update(products)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.id, id),
          isNull(products.deletedAt),
        ),
      )
      .returning();

    if (!product) throw new ProductNotFoundError("Product not found");
    return product;
  }

  async remove(tenantId: string, id: string) {
    await this.findProduct(tenantId, id);
    const [product] = await this.database
      .update(products)
      .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.id, id),
          isNull(products.deletedAt),
        ),
      )
      .returning({ id: products.id });

    if (!product) throw new ProductNotFoundError("Product not found");
  }

  private async findProduct(tenantId: string, id: string) {
    const [product] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.id, id),
          // Deleted products are not returned by normal management operations.
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!product) throw new ProductNotFoundError("Product not found");
    return product;
  }

  private async assertCategoryBelongsToTenant(tenantId: string, categoryId: string) {
    const [category] = await this.database
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.tenantId, tenantId)))
      .limit(1);

    if (!category) {
      throw new ProductValidationError("Category does not belong to this tenant");
    }
  }

  private async getTenantAddOns(tenantId: string, addOnIds: string[]) {
    if (!addOnIds.length) return [];

    const selectedAddOns = await this.database
      .select()
      .from(addOns)
      .where(
        and(
          eq(addOns.tenantId, tenantId),
          inArray(addOns.id, addOnIds),
          isNull(addOns.deletedAt),
        ),
      );

    if (selectedAddOns.length !== addOnIds.length) {
      throw new ProductValidationError("One or more add-ons do not belong to this tenant");
    }
    return selectedAddOns;
  }
}
