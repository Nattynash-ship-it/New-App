import { describe, expect, it } from "vitest";
import { RECIPE_LIBRARY } from "../data/recipeLibrary";

describe("recipe library diet (pescatarian, dairy-free)", () => {
  it("includes seafood recipes", () => {
    const seafood = /salmon|shrimp|tuna|cod|fish|prawn|scallop/i;
    const count = RECIPE_LIBRARY.filter((r) =>
      seafood.test(`${r.title} ${r.ingredients.join(" ")}`),
    ).length;
    expect(count).toBeGreaterThanOrEqual(8);
  });

  it("contains no meat or (real) dairy ingredients", () => {
    // Plant versions like "coconut milk" / "peanut butter" are fine — strip them first.
    const plant = /\b(coconut|soy|almond|oat|peanut|cashew|nut|plant|vegan)\s+(milk|butter|cream|cheese|yogurt)\b/gi;
    const banned = /\b(chicken|beef|pork|bacon|turkey|lamb|ham|sausage|milk|cheese|butter|cream|yogurt|yoghurt)\b/i;
    const offenders = RECIPE_LIBRARY.filter((r) =>
      r.ingredients.some((i) => banned.test(i.replace(plant, ""))),
    ).map((r) => r.title);
    expect(offenders).toEqual([]);
  });
});
