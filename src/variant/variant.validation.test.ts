import { describe, expect, test } from "bun:test";
import {
  createVariantSchema,
  updateVariantSchema,
  variantAvailabilitySchema,
} from "./variant.validation.js";

describe("variant request contracts", () => {
  test("accepts a valid variant", () => {
    expect(
      createVariantSchema.parse({
        label: "Medium",
        price: 14.5,
        isDefault: false,
      }),
    ).toMatchObject({ label: "Medium", price: 14.5 });
  });

  test("rejects a negative price", () => {
    expect(() =>
      createVariantSchema.parse({ label: "Medium", price: -1 }),
    ).toThrow();
  });

  test("requires a field when updating", () => {
    expect(() => updateVariantSchema.parse({})).toThrow();
  });

  test("requires a boolean availability value", () => {
    expect(() => variantAvailabilitySchema.parse({ isActive: "true" })).toThrow();
  });
});
