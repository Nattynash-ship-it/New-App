import { describe, expect, it } from "vitest";
import { buildFoolproofPlan } from "../fitness/foolproofPlan";
import type { HubState } from "../store/hub";

function stateWith(overrides: Partial<HubState>): HubState {
  return { fitnessGoals: [], equipment: [], pantry: [], ...overrides } as unknown as HubState;
}

describe("buildFoolproofPlan", () => {
  it("builds a 7-day schedule with training days and meals + groceries", () => {
    const plan = buildFoolproofPlan(
      stateWith({
        fitnessGoals: ["strength", "sculpt"] as HubState["fitnessGoals"],
        equipment: ["dumbbells", "kettlebell", "rower"] as HubState["equipment"],
      }),
    );
    expect(plan.schedule).toHaveLength(7);
    expect(plan.workouts.length).toBeGreaterThan(0);
    expect(plan.meals.length).toBe(4);
    expect(plan.groceries.length).toBeGreaterThan(0);
    // Groceries are the distinct ingredients across the meals.
    const distinct = new Set(plan.meals.flatMap((m) => m.ingredients));
    expect(plan.groceries.length).toBe(distinct.size);
  });

  it("still returns a balanced plan when no goals or gear are set", () => {
    const plan = buildFoolproofPlan(stateWith({}));
    expect(plan.goalLabels).toContain("A balanced week");
    expect(plan.schedule).toHaveLength(7);
    expect(plan.meals.length).toBe(4);
  });

  it("leans lighter meals for conditioning than for strength", () => {
    const strength = buildFoolproofPlan(
      stateWith({ fitnessGoals: ["strength"] as HubState["fitnessGoals"] }),
    );
    const conditioning = buildFoolproofPlan(
      stateWith({ fitnessGoals: ["conditioning"] as HubState["fitnessGoals"] }),
    );
    const avg = (cals: number[]) => cals.reduce((a, b) => a + b, 0) / cals.length;
    expect(avg(strength.meals.map((m) => m.calories))).toBeGreaterThan(
      avg(conditioning.meals.map((m) => m.calories)),
    );
  });
});
