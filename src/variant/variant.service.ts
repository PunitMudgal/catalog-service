import { and, eq, isNull, sql } from "drizzle-orm";
import { productVariants, products } from "../db/schema.js";
import type {
  CreateVariantInput,
  UpdateVariantInput,
} from "./variant.validation.js";

type Database = typeof import("../db/index.js").db;

export class VariantNotFoundError extends Error {}
export class VariantConflictError extends Error {}
export class VariantValidationError extends Error {}

export class VariantService {
  constructor(private readonly database: Database) {}

  async create(tenantId: string, productId: string, input: CreateVariantInput) {
    await this.findProduct(tenantId, productId);
    await this.ensureLabelIsAvailable(productId, input.label);

    const [variant] = await this.database
      .insert(productVariants)
      .values({
        productId,
        label: input.label,
        price: String(input.price),
        isDefault: input.isDefault ?? false,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();

    if (!variant) throw new VariantConflictError("Variant could not be created");
    return variant;
  }

  async update(tenantId: string, id: string, input: UpdateVariantInput) {
    const current = await this.findVariant(tenantId, id);
    if (input.label !== undefined) {
      await this.ensureLabelIsAvailable(current.productId, input.label, id);
    }

    const [variant] = await this.database
      .update(productVariants)
      .set({
        ...(input.label === undefined ? {} : { label: input.label }),
        ...(input.price === undefined ? {} : { price: String(input.price) }),
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, id))
      .returning();

    if (!variant) throw new VariantNotFoundError("Variant not found");
    return variant;
  }

  async setAvailability(tenantId: string, id: string, isActive: boolean) {
    await this.findVariant(tenantId, id);
    const [variant] = await this.database
      .update(productVariants)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning();

    if (!variant) throw new VariantNotFoundError("Variant not found");
    return variant;
  }

  async remove(tenantId: string, id: string) {
    const variant = await this.findVariant(tenantId, id);
    const allVariants = await this.database
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, variant.productId));

    if (allVariants.length <= 1) {
      throw new VariantConflictError("A product must have at least one variant");
    }

    await this.database
      .delete(productVariants)
      .where(eq(productVariants.id, id));
  }

  private async findProduct(tenantId: string, productId: string) {
    const [product] = await this.database
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!product) throw new VariantNotFoundError("Product not found");
    return product;
  }

  private async findVariant(tenantId: string, id: string) {
    const [result] = await this.database
      .select({ variant: productVariants })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.id, id),
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!result) throw new VariantNotFoundError("Variant not found");
    return result.variant;
  }

  private async ensureLabelIsAvailable(
    productId: string,
    label: string,
    excludeId?: string,
  ) {
    const [existing] = await this.database
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          sql`lower(${productVariants.label}) = lower(${label})`,
        ),
      )
      .limit(1);

    if (existing && existing.id !== excludeId) {
      throw new VariantConflictError("A variant with this label already exists");
    }
  }
}
