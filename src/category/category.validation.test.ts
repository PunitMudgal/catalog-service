import { describe, expect, test } from "bun:test";
import {
  availabilitySchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation.js";

describe("category request contracts", () => {
  test("accepts a root category with ordering and icon", () => {
    expect(
      createCategorySchema.parse({
        name: "  Pizza  ",
        displayOrder: 2,
        icon: "🍕",
      }),
    ).toEqual({ name: "Pizza", displayOrder: 2, icon: "🍕" });
  });

  test("rejects unknown fields and invalid ordering", () => {
    expect(() =>
      createCategorySchema.parse({ name: "Pizza", displayOrder: -1, colour: "red" }),
    ).toThrow();
  });

  test("requires at least one update field", () => {
    expect(() => updateCategorySchema.parse({})).toThrow();
  });

  test("requires a boolean availability value", () => {
    expect(() => availabilitySchema.parse({ isActive: "false" })).toThrow();
  });
});
