import { and, eq, inArray } from "drizzle-orm";
import { categories, products } from "../db/schema.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.validation.js";

type Database = typeof import("../db/index.js").db;

export class CategoryNotFoundError extends Error {}
export class CategoryConflictError extends Error {}
export class CategoryValidationError extends Error {}

const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "category";

export class CategoryService {
  constructor(private readonly database: Database) {}

  async list(tenantId: string) {
    return this.database
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(categories.displayOrder, categories.name);
  }

  async getById(tenantId: string, id: string) {
    const [category] = await this.database
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))
      .limit(1);

    if (!category) throw new CategoryNotFoundError("Category not found");
    return category;
  }

  async create(tenantId: string, input: CreateCategoryInput) {
    if (input.parentId) await this.assertParent(tenantId, input.parentId);
    await this.assertSlugAvailable(tenantId, slugify(input.name));

    const [category] = await this.database
      .insert(categories)
      .values({
        tenantId,
        name: input.name,
        slug: slugify(input.name),
        parentId: input.parentId ?? null,
        displayOrder: input.displayOrder ?? 0,
        icon: input.icon ?? null,
      })
      .returning();

    if (!category) throw new CategoryConflictError("Category could not be created");
    return category;
  }

  async update(tenantId: string, id: string, input: UpdateCategoryInput) {
    const current = await this.getById(tenantId, id);
    if (input.parentId === id) {
      throw new CategoryValidationError("A category cannot be its own parent");
    }
    if (input.parentId) await this.assertParent(tenantId, input.parentId);
    if (input.parentId && (await this.isDescendant(tenantId, input.parentId, id))) {
      throw new CategoryValidationError("A category cannot be moved below its descendant");
    }
    if (input.name !== undefined) {
      await this.assertSlugAvailable(tenantId, slugify(input.name), id);
    }

    const [category] = await this.database
      .update(categories)
      .set({
        ...(input.name === undefined ? {} : { name: input.name, slug: slugify(input.name) }),
        ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
        ...(input.displayOrder === undefined ? {} : { displayOrder: input.displayOrder }),
        ...(input.icon === undefined ? {} : { icon: input.icon }),
        updatedAt: new Date(),
      })
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, current.id)))
      .returning();

    if (!category) throw new CategoryNotFoundError("Category not found");
    return category;
  }

  async setAvailability(tenantId: string, id: string, isActive: boolean) {
    await this.getById(tenantId, id);
    const ids = await this.getSubtreeIds(tenantId, id);

    return this.database.transaction(async (tx) => {
      await tx
        .update(categories)
        .set({ isActive, updatedAt: new Date() })
        .where(and(eq(categories.tenantId, tenantId), inArray(categories.id, ids)));
      await tx
        .update(products)
        .set({ isActive, updatedAt: new Date() })
        .where(and(eq(products.tenantId, tenantId), inArray(products.categoryId, ids)));
      const [category] = await tx
        .select()
        .from(categories)
        .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))
        .limit(1);
      return category;
    });
  }

  async remove(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    const [child] = await this.database
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.parentId, id)))
      .limit(1);
    if (child) throw new CategoryConflictError("Category must not have child categories");

    const [product] = await this.database
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.categoryId, id)))
      .limit(1);
    if (product) throw new CategoryConflictError("Category must not contain products");

    await this.database
      .delete(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)));
  }

  private async assertParent(tenantId: string, parentId: string) {
    await this.getById(tenantId, parentId);
  }

  private async assertSlugAvailable(tenantId: string, slug: string, excludeId?: string) {
    const [existing] = await this.database
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.slug, slug)))
      .limit(1);
    if (existing && existing.id !== excludeId) {
      throw new CategoryConflictError("A category with this name already exists");
    }
  }

  private async isDescendant(tenantId: string, candidateId: string, ancestorId: string) {
    let ids = [ancestorId];
    const visited = new Set<string>();
    while (ids.length) {
      ids = ids.filter((id) => !visited.has(id));
      ids.forEach((id) => visited.add(id));
      if (!ids.length) break;
      const children = await this.database
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.tenantId, tenantId), inArray(categories.parentId, ids)));
      if (children.some((child) => child.id === candidateId)) return true;
      ids = children.map((child) => child.id);
    }
    return false;
  }

  private async getSubtreeIds(tenantId: string, rootId: string) {
    const result = [rootId];
    let frontier = [rootId];
    const visited = new Set(result);
    while (frontier.length) {
      const children = await this.database
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.tenantId, tenantId), inArray(categories.parentId, frontier)));
      frontier = children
        .map((child) => child.id)
        .filter((id) => !visited.has(id));
      frontier.forEach((id) => visited.add(id));
      result.push(...frontier);
    }
    return result;
  }
}
