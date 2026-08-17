import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { graduationStats } from "../selectors";

beforeAll(() => {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    },
  });
});

beforeEach(async () => {
  const { useHub } = await import("../store/hub");
  useHub.getState().resetToSeed();
});

describe("grocery regenerate preserves manual items", () => {
  it("keeps a manually-added item after Regenerate", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().clearGroceryList();
    s().addGroceryItem("Birthday candles");
    s().generateGroceryList();
    expect(s().groceryList.some((g) => g.name === "Birthday candles")).toBe(true);
  });
});

describe("degree template load resets earned credits", () => {
  it("zeroes completedCredits so the plan can't exceed 100%", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().updateDegreePlan({ completedCredits: 58, totalCredits: 120 });
    s().loadDegreeTemplate("B.S. CS", 120, [
      { code: "CS", name: "Brand New Course XYZ", credits: 4 },
    ]);
    expect(s().degreePlan.completedCredits).toBe(0);
  });
});

describe("graduation percentage is clamped", () => {
  it("never reports more than 100%", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().updateDegreePlan({ completedCredits: 400, totalCredits: 120 });
    expect(graduationStats(s()).pct).toBe(100);
  });
});

describe("new delete actions", () => {
  it("removes a saved recipe", async () => {
    const { useHub, newId } = await import("../store/hub");
    const s = () => useHub.getState();
    const r = {
      id: newId("rec"),
      title: "Test",
      description: "",
      ingredients: [],
      steps: [],
      calories: 0,
      volumeScore: "medium" as const,
      vegan: false,
      source: "user" as const,
      createdAt: "",
    };
    s().saveRecipe(r);
    expect(s().recipes.some((x) => x.id === r.id)).toBe(true);
    s().removeRecipe(r.id);
    expect(s().recipes.some((x) => x.id === r.id)).toBe(false);
  });

  it("removes a course unit and a topic", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    const course = s().courses[0]!;
    s().addUnit(course.id, "Scratch Unit");
    const unit = useHub.getState().courses.find((c) => c.id === course.id)!.units.at(-1)!;
    s().addTopic(course.id, unit.id, "Scratch Topic");
    let u = useHub.getState().courses.find((c) => c.id === course.id)!.units.find((x) => x.id === unit.id)!;
    const topic = u.topics.at(-1)!;
    expect(u.topics.length).toBe(1);
    s().removeTopic(course.id, unit.id, topic.id);
    u = useHub.getState().courses.find((c) => c.id === course.id)!.units.find((x) => x.id === unit.id)!;
    expect(u.topics.length).toBe(0);
    s().removeUnit(course.id, unit.id);
    expect(useHub.getState().courses.find((c) => c.id === course.id)!.units.some((x) => x.id === unit.id)).toBe(false);
  });
});
