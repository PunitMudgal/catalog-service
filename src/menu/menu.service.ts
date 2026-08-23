import { and, eq, isNull } from "drizzle-orm";
import {
  addOns,
  categories,
  productAddOns,
  productVariants,
  products,
} from "../db/schema.js";

type Database = typeof import("../db/index.js").db;

export class PublicMenuNotFoundError extends Error {}

type MenuProduct = typeof products.$inferSelect & {
  variants: (typeof productVariants.$inferSelect)[];
  addOns: (typeof addOns.$inferSelect)[];
};

export class MenuService {
  constructor(private readonly database: Database) {}

  async getMenu(tenantId: string) {
    const [activeCategories, activeProducts, activeVariants, activeAddOnRows] =
      await Promise.all([
        this.database
          .select()
          .from(categories)
          .where(and(eq(categories.tenantId, tenantId), eq(categories.isActive, true)))
          .orderBy(categories.displayOrder, categories.name),
        this.database
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.isActive, true),
              isNull(products.deletedAt),
            ),
          )
          .orderBy(products.displayOrder, products.name),
        this.database
          .select()
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.isActive, true),
              isNull(products.deletedAt),
              eq(productVariants.isActive, true),
            ),
          )
          .orderBy(productVariants.displayOrder, productVariants.label),
        this.database
          .select({ productId: productAddOns.productId, addOn: addOns })
          .from(productAddOns)
          .innerJoin(addOns, eq(productAddOns.addOnId, addOns.id))
          .where(and(eq(addOns.tenantId, tenantId), eq(addOns.isActive, true))),
      ]);

    const categoryIds = new Set(activeCategories.map((category) => category.id));
    const productsByCategory = new Map<string, MenuProduct[]>();
    const variantsByProduct = new Map<string, (typeof productVariants.$inferSelect)[]>();
    const addOnsByProduct = new Map<string, (typeof addOns.$inferSelect)[]>();

    for (const row of activeVariants) {
      const variants = variantsByProduct.get(row.product_variants.productId) ?? [];
      variants.push(row.product_variants);
      variantsByProduct.set(row.product_variants.productId, variants);
    }

    for (const row of activeAddOnRows) {
      const attached = addOnsByProduct.get(row.productId) ?? [];
      attached.push(row.addOn);
      addOnsByProduct.set(row.productId, attached);
    }

    for (const product of activeProducts) {
      if (!categoryIds.has(product.categoryId)) continue;
      const productWithDetails = {
        ...product,
        variants: variantsByProduct.get(product.id) ?? [],
        addOns: addOnsByProduct.get(product.id) ?? [],
      };
      const productList = productsByCategory.get(product.categoryId) ?? [];
      productList.push(productWithDetails);
      productsByCategory.set(product.categoryId, productList);
    }

    const categoryMap = new Map(
      activeCategories.map((category) => [
        category.id,
        { ...category, products: productsByCategory.get(category.id) ?? [], children: [] as unknown[] },
      ]),
    );
    const roots: unknown[] = [];

    for (const category of activeCategories) {
      const current = categoryMap.get(category.id);
      if (!current) continue;
      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId);
        parent?.children.push(current);
      } else if (!category.parentId) {
        roots.push(current);
      }
    }

    return roots;
  }

  async getProduct(tenantId: string, productId: string) {
    const [product] = await this.database
      .select({ product: products, category: categories })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.id, productId),
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          eq(categories.tenantId, tenantId),
          eq(categories.isActive, true),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!product) throw new PublicMenuNotFoundError("Product not found");

    const [variants, addOnRows] = await Promise.all([
      this.database
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, productId),
            eq(productVariants.isActive, true),
          ),
        )
        .orderBy(productVariants.displayOrder, productVariants.label),
      this.database
        .select({ addOn: addOns })
        .from(productAddOns)
        .innerJoin(addOns, eq(productAddOns.addOnId, addOns.id))
        .where(
          and(
            eq(productAddOns.productId, productId),
            eq(addOns.tenantId, tenantId),
            eq(addOns.isActive, true),
          ),
        ),
    ]);

    return {
      ...product.product,
      variants,
      addOns: addOnRows.map(({ addOn }) => addOn),
    };
  }
}
