import "../config/env.js";
import { eq, inArray } from "drizzle-orm";
import { db } from "./index.js";
import {
  categories,
  addOns,
  productAddOns,
  products,
  productVariants,
} from "./schema.js";

// Fixed tenant for this seed run
const TENANT_ID = "fbb3649a-5ef9-4c4d-be0d-46aecbdb2061";

// ---------------------------------------------------------------------------
// Shape helpers — keep the seed data declarative, insert logic does the work
// ---------------------------------------------------------------------------

type VariantSeed = {
  label: string;
  price: string;
  isDefault?: boolean;
};

type ProductSeed = {
  name: string;
  description?: string;
  isVeg?: boolean;
  variants: VariantSeed[];
};

type CategorySeed = {
  slug: string;
  name: string;
  icon: string;
  displayOrder: number;
  products: ProductSeed[];
};

// Single-price helper: wraps a plain price into a one-variant array
// so every product still goes through the same variants table.
const single = (price: string): VariantSeed[] => [
  { label: "Regular", price, isDefault: true },
];

// Two-size helper for Regular | Medium priced items (pizzas)
const sizes2 = (regular: string, medium: string): VariantSeed[] => [
  { label: "Regular", price: regular, isDefault: true },
  { label: "Medium", price: medium },
];

// Two-size helper for Half | Full priced items (momos)
const halfFull = (half: string, full: string): VariantSeed[] => [
  { label: "Half", price: half, isDefault: true },
  { label: "Full", price: full },
];

// ---------------------------------------------------------------------------
// Menu data — transcribed from the NESTA FOODS menu image
// ---------------------------------------------------------------------------

const MENU: CategorySeed[] = [
  {
    slug: "burgers",
    name: "Burgers",
    icon: "🍔",
    displayOrder: 1,
    products: [
      { name: "Aloo Tikki Burger", isVeg: true, variants: single("50.00") },
      { name: "Veg Classic Burger", isVeg: true, variants: single("60.00") },
      { name: "Veg Paneer Burger", isVeg: true, variants: single("80.00") },
      {
        name: "Veg Paneer Cheese Burger",
        isVeg: true,
        variants: single("90.00"),
      },
      { name: "Mexican Burger", isVeg: true, variants: single("90.00") },
      { name: "Special Nesta Burger", isVeg: true, variants: single("100.00") },
    ],
  },
  {
    slug: "pizza",
    name: "Pizza",
    icon: "🍕",
    displayOrder: 2,
    products: [
      {
        name: "Pizza Pie (Onion / Capsicum / Tomato)",
        isVeg: true,
        variants: sizes2("70.00", "130.00"),
      },
      {
        name: "Margherita Plain",
        isVeg: true,
        variants: sizes2("90.00", "140.00"),
      },
      {
        name: "Sweet Corn / Veg Pizza",
        isVeg: true,
        variants: sizes2("100.00", "150.00"),
      },
      {
        name: "Onion Capsicum / Tomato",
        isVeg: true,
        variants: sizes2("100.00", "150.00"),
      },
      {
        name: "Mix Veg Pizza",
        isVeg: true,
        variants: sizes2("130.00", "180.00"),
      },
      {
        name: "Mexican / Paneer Tikka Pizza",
        isVeg: true,
        variants: sizes2("150.00", "240.00"),
      },
      {
        name: "Cheese Burst Pizza",
        isVeg: true,
        variants: sizes2("200.00", "350.00"),
      },
    ],
  },
  {
    slug: "bread",
    name: "Bread",
    icon: "🧄",
    displayOrder: 3,
    products: [
      { name: "Garlic Bread", isVeg: true, variants: single("80.00") },
      { name: "Stuffed Garlic Bread", isVeg: true, variants: single("120.00") },
      { name: "Paneer Garlic Bread", isVeg: true, variants: single("130.00") },
    ],
  },
  {
    slug: "momos",
    name: "Momos",
    icon: "🥟",
    displayOrder: 4,
    products: [
      {
        name: "Veg Fried Momos",
        isVeg: true,
        variants: halfFull("60.00", "100.00"),
      },
      {
        name: "Paneer Fried Momos",
        isVeg: true,
        variants: halfFull("80.00", "120.00"),
      },
      {
        name: "Peri Peri Kurkure Momos",
        isVeg: true,
        variants: single("160.00"),
      },
    ],
  },
  {
    slug: "snacks",
    name: "Snacks",
    icon: "🍟",
    displayOrder: 5,
    products: [
      { name: "Peri Peri Fries", isVeg: true, variants: single("110.00") },
      { name: "Pizza Stick", isVeg: true, variants: single("100.00") },
    ],
  },
  {
    slug: "wraps",
    name: "Wraps",
    icon: "🌯",
    displayOrder: 6,
    products: [
      { name: "Veg Paneer Wrap", isVeg: true, variants: single("70.00") },
      { name: "Aloo Patty Wrap", isVeg: true, variants: single("70.00") },
      { name: "Vegetable Patty Wrap", isVeg: true, variants: single("80.00") },
      { name: "Veg Falafel Wrap", isVeg: true, variants: single("90.00") },
      { name: "Nuggets Wrap", isVeg: true, variants: single("100.00") },
    ],
  },
  {
    slug: "beverage",
    name: "Beverage",
    icon: "🥤",
    displayOrder: 7,
    products: [
      { name: "Cold Coffee", isVeg: true, variants: single("80.00") },
      { name: "Mojito", isVeg: true, variants: single("50.00") },
      { name: "Lemon Ice Tea", isVeg: true, variants: single("50.00") },
      { name: "Blue Berry Brust", isVeg: true, variants: single("50.00") },
    ],
  },
  {
    slug: "dip",
    name: "Dip",
    icon: "🥣",
    displayOrder: 8,
    products: [
      { name: "Tandoori Dip", isVeg: true, variants: single("20.00") },
      { name: "Cheese Dip", isVeg: true, variants: single("30.00") },
      { name: "Schezwan Dip", isVeg: true, variants: single("20.00") },
      { name: "Mayonnaise", isVeg: true, variants: single("20.00") },
    ],
  },
];

// Add-ons are shared per tenant and linked to products via a join table.
// Menu only lists one: Cheese Slice (+15/-), attached to every burger.
const ADD_ONS = [{ name: "Cheese Slice", price: "15.00" }];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding catalog for tenant ${TENANT_ID}...`);

  // 0. Clean existing tenant data — makes seed idempotent / re-runnable
  // Delete in FK-safe order: join rows -> variants -> products -> addOns -> categories
  console.log("Cleaning existing tenant data...");
  const existingProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.tenantId, TENANT_ID));
  const existingProductIds = existingProducts.map((p) => p.id);

  if (existingProductIds.length > 0) {
    await db
      .delete(productAddOns)
      .where(inArray(productAddOns.productId, existingProductIds));
    await db
      .delete(productVariants)
      .where(inArray(productVariants.productId, existingProductIds));
    await db.delete(products).where(eq(products.tenantId, TENANT_ID));
  }
  // addOns are tenant-scoped; delete after productAddOns due to FK
  await db.delete(addOns).where(eq(addOns.tenantId, TENANT_ID));
  await db.delete(categories).where(eq(categories.tenantId, TENANT_ID));

  // 1. Categories
  const categoryIdBySlug = new Map<string, string>();

  for (const cat of MENU) {
    const [row] = await db
      .insert(categories)
      .values({
        tenantId: TENANT_ID,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        displayOrder: cat.displayOrder,
      })
      .onConflictDoUpdate({
        target: [categories.tenantId, categories.slug],
        set: {
          name: cat.name,
          icon: cat.icon,
          displayOrder: cat.displayOrder,
        },
      })
      .returning();

    categoryIdBySlug.set(cat.slug, row.id);
  }

  // 2. Add-ons (created once, attached below)
  const addOnIdByName = new Map<string, string>();

  for (const addon of ADD_ONS) {
    const [row] = await db
      .insert(addOns)
      .values({ tenantId: TENANT_ID, name: addon.name, price: addon.price })
      .returning();

    addOnIdByName.set(addon.name, row.id);
  }

  // 3. Products + variants (+ add-on links for burgers)
  let productDisplayOrder = 0;

  for (const cat of MENU) {
    const categoryId = categoryIdBySlug.get(cat.slug)!;

    for (const product of cat.products) {
      productDisplayOrder += 1;

      const [productRow] = await db
        .insert(products)
        .values({
          tenantId: TENANT_ID,
          categoryId,
          name: product.name,
          description: product.description,
          isVeg: product.isVeg ?? true,
          displayOrder: productDisplayOrder,
        })
        .returning();

      await db.insert(productVariants).values(
        product.variants.map((v, i) => ({
          productId: productRow.id,
          label: v.label,
          price: v.price,
          isDefault: v.isDefault ?? i === 0,
          displayOrder: i + 1,
        })),
      );

      // Attach Cheese Slice add-on to every burger product
      if (cat.slug === "burgers") {
        const cheeseSliceId = addOnIdByName.get("Cheese Slice")!;
        await db.insert(productAddOns).values({
          productId: productRow.id,
          addOnId: cheeseSliceId,
        });
      }
    }
  }

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
