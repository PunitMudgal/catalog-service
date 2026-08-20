import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

// Categories are dynamic per-tenant, can be nested (e.g. Pizza > Veg Pizza)
export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull(), // no FK across services — see note below
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    parentId: text("parent_id"), // self-ref for subcategories, nullable
    displayOrder: integer("display_order").default(0).notNull(),
    icon: varchar("icon", { length: 50 }), // emoji or icon key, e.g. "🍔"
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("tenant_category_slug_unique").on(t.tenantId, t.slug),
    index("categories_tenant_idx").on(t.tenantId),
  ],
);

// Products belong to a category. Variable attributes go in JSONB.
export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    isVeg: boolean("is_veg"), // nullable = not applicable (e.g. drinks)
    isActive: boolean("is_active").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    // flexible bag for category-specific attributes that don't deserve columns
    // e.g. { "spiceLevel": "medium", "prepTimeMins": 15 }
    attributes: jsonb("attributes").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("products_tenant_idx").on(t.tenantId),
    index("products_category_idx").on(t.categoryId),
  ],
);

// This is the important one: every sellable price point is a variant.
// Single-size product (e.g. Garlic Bread) = one variant row named "Default".
// Pizza = two variant rows: "Regular", "Medium".
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 50 }).notNull(), // "Regular", "Full", "500ml"
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("product_variant_label_unique").on(t.productId, t.label),
    index("variants_product_idx").on(t.productId),
  ],
);

// Add-ons: shared pool per tenant, attached to products via join table.
// e.g. "Cheese Slice +15/-" can attach to multiple burger products.
export const addOns = pgTable("add_ons", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const productAddOns = pgTable(
  "product_add_ons",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    addOnId: text("add_on_id")
      .notNull()
      .references(() => addOns.id, { onDelete: "cascade" }),
  },
  (t) => [unique("product_addon_unique").on(t.productId, t.addOnId)],
);

// Relations
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  products: many(products),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  addOns: many(productAddOns),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  }),
);
