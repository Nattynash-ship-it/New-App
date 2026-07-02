import { describe, expect, it } from "vitest";
import { generateLocalRecipe } from "../ai/localRecipe";

describe("generateLocalRecipe", () => {
  it("is deterministic for the same pantry", () => {
    const a = generateLocalRecipe(["chickpeas", "kale"]);
    const b = generateLocalRecipe(["chickpeas", "kale"]);
    expect(a).toEqual(b);
  });

  it("respects the dietary defaults: vegan and high-volume", () => {
    const r = generateLocalRecipe(["tofu", "spinach", "mushrooms"]);
    expect(r.vegan).toBe(true);
    expect(r.volumeScore).toBe("high");
    expect(r.calories).toBeLessThanOrEqual(550);
  });

  it("includes every provided ingredient", () => {
    const inputs = ["lentils", "zucchini", "bell peppers"];
    const r = generateLocalRecipe(inputs);
    const names = r.ingredients.map((i) => i.name.toLowerCase());
    for (const input of inputs) {
      expect(names).toContain(input);
    }
  });

  it("handles empty and messy input without crashing", () => {
    expect(generateLocalRecipe([]).title.length).toBeGreaterThan(0);
    expect(generateLocalRecipe(["  ", "kale "]).ingredients.length).toBeGreaterThan(0);
    expect(generateLocalRecipe([]).steps.length).toBeGreaterThan(0);
  });
});
