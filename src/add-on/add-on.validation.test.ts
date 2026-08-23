import { describe, expect, test } from "bun:test";
import {
  createAddOnSchema,
  productAddOnParamsSchema,
  updateAddOnSchema,
} from "./add-on.validation.js";

describe("add-on request contracts", () => {
  test("accepts a valid add-on", () => {
    expect(
      createAddOnSchema.parse({ name: "Cheese Slice", price: 1.5 }),
    ).toMatchObject({ name: "Cheese Slice", price: 1.5 });
  });

  test("rejects a negative price", () => {
    expect(() =>
      createAddOnSchema.parse({ name: "Cheese", price: -1 }),
    ).toThrow();
  });

  test("requires a field when updating", () => {
    expect(() => updateAddOnSchema.parse({})).toThrow();
  });

  test("requires both product and add-on IDs", () => {
    expect(() =>
      productAddOnParamsSchema.parse({ productId: "product-1" }),
    ).toThrow();
  });
});
