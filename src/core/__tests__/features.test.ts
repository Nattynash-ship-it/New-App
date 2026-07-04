import { describe, expect, it } from "vitest";
import { addDays, todayISO } from "../dates";
import { recommendPlan } from "../fitness/plan";
import {
  encouragementForToday,
  graduationStats,
  habitStreak,
  matchRecipes,
  todaysPlan,
  weeklyBalance,
} from "../selectors";
import type { HubState } from "../store/hub";
import type { PantryItem } from "../types";

function pantry(names: string[]): PantryItem[] {
  return names.map((name, i) => ({ id: `p${i}`, name, category: "pantry", onHand: true }));
}

function makeState(overrides: Partial<HubState>): HubState {
  return {
    pantry: [],
    groceryList: [],
    courses: [],
    degreePlan: { programName: "B.S. CS", totalCredits: 120, completedCredits: 58 },
    ...overrides,
  } as HubState;
}

describe("matchRecipes (cook with what you have)", () => {
  it("marks a recipe ready when every ingredient is on hand", () => {
    const state = makeState({
      pantry: pantry(["rolled oats", "frozen berries", "cashews"]),
    });
    const oats = matchRecipes(state).find((m) => m.recipe.id === "lib_overnight_oats");
    expect(oats?.ready).toBe(true);
    expect(oats?.missing).toEqual([]);
  });

  it("counts grocery-list items as available (they're incoming)", () => {
    const state = makeState({
      pantry: pantry(["rolled oats", "cashews"]),
      groceryList: [
        { id: "g1", name: "Frozen berries", quantity: "1", category: "frozen", checked: false },
      ],
    });
    const oats = matchRecipes(state).find((m) => m.recipe.id === "lib_overnight_oats");
    expect(oats?.ready).toBe(true);
  });

  it("reports near-misses with the exact missing ingredients", () => {
    const state = makeState({
      pantry: pantry(["tofu", "soy sauce", "bell peppers"]),
    });
    const stirfry = matchRecipes(state).find((m) => m.recipe.id === "lib_tofu_stirfry");
    expect(stirfry?.ready).toBe(false);
    expect(stirfry?.missing.sort()).toEqual(["brown rice", "mushrooms"]);
  });

  it("drops recipes missing more than two ingredients and sorts ready first", () => {
    const state = makeState({
      pantry: pantry(["rolled oats", "frozen berries", "cashews", "zucchini", "cherry tomatoes"]),
    });
    const results = matchRecipes(state);
    expect(results.some((m) => m.recipe.id === "lib_chickpea_curry")).toBe(false); // 4+ missing
    const readiness = results.map((m) => m.ready);
    expect([...readiness].sort((a, b) => Number(b) - Number(a))).toEqual(readiness);
  });
});

describe("recommendPlan (goal-based programming)", () => {
  it("maps strength goals onto the strength routine", () => {
    const plan = recommendPlan(["strength"]);
    expect(plan.find((l) => l.routineId === "routine_strength")?.sessions).toBe(2);
  });

  it("merges overlapping goals without double-counting", () => {
    const plan = recommendPlan(["sculpt", "conditioning"]);
    const conditioning = plan.find((l) => l.routineId === "routine_conditioning");
    expect(conditioning?.sessions).toBe(2); // max, not sum
  });

  it("falls back to a balanced split with no goals", () => {
    expect(recommendPlan([]).length).toBeGreaterThanOrEqual(3);
  });
});

describe("habitStreak", () => {
  const recent = (n: number) => Array.from({ length: n }, (_, i) => addDays(todayISO(), -i));

  it("counts consecutive days including today", () => {
    expect(habitStreak(recent(5))).toBe(5);
  });

  it("keeps the streak alive when today isn't done yet (ends yesterday)", () => {
    const yesterdayBack = Array.from({ length: 3 }, (_, i) => addDays(todayISO(), -(i + 1)));
    expect(habitStreak(yesterdayBack)).toBe(3);
  });

  it("breaks on a gap", () => {
    // today + a 2-day-old entry (gap yesterday) → streak is just today
    expect(habitStreak([todayISO(), addDays(todayISO(), -2)])).toBe(1);
  });

  it("is zero with no history or only-stale history", () => {
    expect(habitStreak([])).toBe(0);
    expect(habitStreak([addDays(todayISO(), -5)])).toBe(0);
  });
});

describe("encouragementForToday", () => {
  it("returns a stable non-empty string for the day", () => {
    const a = encouragementForToday();
    const b = encouragementForToday();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe("todaysPlan (energy-aware)", () => {
  const today = todayISO();
  const base = {
    assignments: [],
    meetings: [],
    activities: [],
    projects: [
      {
        id: "p1",
        name: "P",
        category: "",
        status: "active" as const,
        milestones: [],
        trackingRefs: [],
        notes: "",
        tasks: Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, title: `Task ${i}`, done: false })),
      },
    ],
    habits: [],
  };

  it("caps low-energy days to 3 items and defers the rest", () => {
    const plan = todaysPlan(base as unknown as HubState, "low");
    expect(plan.items).toHaveLength(3);
    expect(plan.deferred).toBe(3); // 6 open tasks, 3 shown
  });

  it("shows more on a high-energy day", () => {
    const plan = todaysPlan(base as unknown as HubState, "high");
    expect(plan.items).toHaveLength(6); // capacity 7 > 6 tasks
    expect(plan.deferred).toBe(0);
  });

  it("always keeps fixed commitments even past capacity", () => {
    const state = {
      ...base,
      meetings: Array.from({ length: 4 }, (_, i) => ({
        id: `m${i}`,
        title: `Meeting ${i}`,
        date: today,
        time: "09:00",
        durationMin: 30,
      })),
    } as unknown as HubState;
    const plan = todaysPlan(state, "low"); // capacity 3, but 4 meetings are fixed
    const meetings = plan.items.filter((i) => i.tag === "meeting");
    expect(meetings).toHaveLength(4);
    // no flexible slots remain
    expect(plan.items.every((i) => i.fixed)).toBe(true);
  });
});

describe("weeklyBalance", () => {
  const base = {
    ledger: [],
    activities: [],
    courses: [],
    assignments: [],
    meetings: [],
    focus: { date: todayISO(), taskIds: [] as string[] },
    projects: [],
    workoutLogs: [],
    weeklySessionTarget: 4,
    habits: [],
    checkIns: [],
  };

  it("scores health from workouts and surfaces the quietest area", () => {
    const state = {
      ...base,
      workoutLogs: [
        { id: "l1", routineId: "r", date: todayISO(), effort: 3, note: "" },
        { id: "l2", routineId: "r", date: addDays(todayISO(), -1), effort: 3, note: "" },
      ],
    } as unknown as HubState;
    const b = weeklyBalance(state);
    expect(b.areas).toHaveLength(5);
    expect(b.areas.find((a) => a.key === "health")!.score).toBeGreaterThan(0);
    expect(b.quietest.score).toBe(0); // every other area is empty this week
  });

  it("gives a full mind score when checked in every day", () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), -i));
    const state = {
      ...base,
      checkIns: days.map((d, i) => ({
        id: `c${i}`,
        date: d,
        period: "morning",
        mood: 4,
        note: "",
        prompt: "",
        createdAt: d,
      })),
    } as unknown as HubState;
    expect(weeklyBalance(state).areas.find((a) => a.key === "mind")!.score).toBe(100);
  });
});

describe("graduationStats", () => {
  it("computes percent from completed credits and counts in-progress separately", () => {
    const state = makeState({
      courses: [
        { id: "c1", code: "A", name: "A", credits: 4, units: [] },
        { id: "c2", code: "B", name: "B", credits: 4, units: [] },
      ],
    });
    const stats = graduationStats(state);
    expect(stats.pct).toBe(48); // 58/120
    expect(stats.inProgress).toBe(8);
  });
});
