import { and, eq, isNull } from "drizzle-orm";
import {
  addOns,
  productAddOns,
  products,
} from "../db/schema.js";
import type {
  CreateAddOnInput,
  UpdateAddOnInput,
} from "./add-on.validation.js";

type Database = typeof import("../db/index.js").db;

export class AddOnNotFoundError extends Error {}
export class AddOnConflictError extends Error {}
export class AddOnValidationError extends Error {}

export class AddOnService {
  constructor(private readonly database: Database) {}

  async list(tenantId: string) {
    return this.database
      .select()
      .from(addOns)
      .where(and(eq(addOns.tenantId, tenantId), isNull(addOns.deletedAt)))
      .orderBy(addOns.name);
  }

  async create(tenantId: string, input: CreateAddOnInput) {
    const [addOn] = await this.database
      .insert(addOns)
      .values({
        tenantId,
        name: input.name,
        price: String(input.price),
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!addOn) throw new AddOnConflictError("Add-on could not be created");
    return addOn;
  }

  async update(tenantId: string, id: string, input: UpdateAddOnInput) {
    await this.findAddOn(tenantId, id);
    const [addOn] = await this.database
      .update(addOns)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.price === undefined ? {} : { price: String(input.price) }),
      })
      .where(
        and(
          eq(addOns.id, id),
          eq(addOns.tenantId, tenantId),
          isNull(addOns.deletedAt),
        ),
      )
      .returning();

    if (!addOn) throw new AddOnNotFoundError("Add-on not found");
    return addOn;
  }

  async remove(tenantId: string, id: string) {
    await this.findAddOn(tenantId, id);
    await this.database
      .update(addOns)
      .set({ isActive: false, deletedAt: new Date() })
      .where(
        and(
          eq(addOns.id, id),
          eq(addOns.tenantId, tenantId),
          isNull(addOns.deletedAt),
        ),
      );
  }

  async attach(tenantId: string, productId: string, addOnId: string) {
    await this.findProduct(tenantId, productId);
    await this.findAddOn(tenantId, addOnId);

    const [existing] = await this.database
      .select()
      .from(productAddOns)
      .where(
        and(
          eq(productAddOns.productId, productId),
          eq(productAddOns.addOnId, addOnId),
        ),
      )
      .limit(1);
    if (existing) {
      throw new AddOnConflictError("Add-on is already attached to this product");
    }

    await this.database.insert(productAddOns).values({ productId, addOnId });
  }

  async detach(tenantId: string, productId: string, addOnId: string) {
    await this.findProduct(tenantId, productId);
    await this.findAddOn(tenantId, addOnId);

    await this.database
      .delete(productAddOns)
      .where(
        and(
          eq(productAddOns.productId, productId),
          eq(productAddOns.addOnId, addOnId),
        ),
      );
  }

  private async findAddOn(tenantId: string, id: string) {
    const [addOn] = await this.database
      .select()
      .from(addOns)
      .where(
        and(
          eq(addOns.id, id),
          eq(addOns.tenantId, tenantId),
          isNull(addOns.deletedAt),
        ),
      )
      .limit(1);

    if (!addOn) throw new AddOnNotFoundError("Add-on not found");
    return addOn;
  }

  private async findProduct(tenantId: string, id: string) {
    const [product] = await this.database
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!product) throw new AddOnNotFoundError("Product not found");
    return product;
  }
}
