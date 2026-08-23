import { describe, expect, test } from "bun:test";
import {
  createProductSchema,
  productAvailabilitySchema,
  productListQuerySchema,
  updateProductSchema,
} from "./product.validation.js";

describe("product request contracts", () => {
  test("accepts a product with initial variants", () => {
    const product = createProductSchema.parse({
      name: "Margherita Pizza",
      categoryId: "category-1",
      variants: [{ label: "Regular", price: 12.5, isDefault: true }],
    });

    expect(product.variants[0]?.price).toBe(12.5);
  });

  test("rejects duplicate variant labels", () => {
    expect(() =>
      createProductSchema.parse({
        name: "Pizza",
        categoryId: "category-1",
        variants: [
          { label: "Regular", price: 10 },
          { label: "regular", price: 12 },
        ],
      }),
    ).toThrow();
  });

  test("rejects duplicate add-on IDs", () => {
    expect(() =>
      createProductSchema.parse({
        name: "Burger",
        categoryId: "category-1",
        addOnIds: ["addon-1", "addon-1"],
        variants: [{ label: "Default", price: 8 }],
      }),
    ).toThrow();
  });

  test("requires at least one field when updating", () => {
    expect(() => updateProductSchema.parse({})).toThrow();
  });

  test("accepts a category filter", () => {
    expect(productListQuerySchema.parse({ categoryId: "category-1" })).toEqual({
      categoryId: "category-1",
    });
  });

  test("requires a boolean availability value", () => {
    expect(() => productAvailabilitySchema.parse({ isActive: "yes" })).toThrow();
  });
});
