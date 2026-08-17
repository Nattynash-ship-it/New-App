import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  GLUTE_PROGRAM,
  ORDERED_DAYS,
  PROGRAM_TOTAL_SESSIONS,
  TRAINING_DAYS,
  programCellKey,
  programCurrentWeek,
  programDayDate,
  programEndDate,
  programHasStarted,
  programWeekRange,
} from "../fitness/program";
import { foodDay, weightStats } from "../selectors";

// The persisted store touches localStorage at import — shim it first.
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
  // Clear the tracking slices between tests (resetToSeed wipes logs to empty).
  useHub.getState().resetToSeed();
});

describe("weight tracking", () => {
  it("logs weights, keeps one per day, and sorts ascending", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().logWeight(200, "2026-07-10");
    s().logWeight(198, "2026-07-12");
    s().logWeight(199, "2026-07-11");
    // Same-day re-log replaces the earlier reading.
    s().logWeight(197.5, "2026-07-12");

    const log = s().weightLog;
    expect(log).toHaveLength(3);
    expect(log.map((e) => e.date)).toEqual(["2026-07-10", "2026-07-11", "2026-07-12"]);
    expect(log[log.length - 1]!.weight).toBe(197.5);
  });

  it("computes start, latest, change, and goal progress", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().logWeight(200, "2026-07-01");
    s().logWeight(190, "2026-07-15");
    s().setWeightGoal(180);

    const stats = weightStats(s());
    expect(stats.start).toBe(200);
    expect(stats.latest).toBe(190);
    expect(stats.changeFromStart).toBe(-10);
    expect(stats.toGoal).toBe(10);
    expect(stats.goalPct).toBe(50); // halfway from 200 → 180
  });

  it("converts stored weights and goal when switching units", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().logWeight(220, "2026-07-01");
    s().setWeightGoal(200);

    s().setWeightUnit("kg");
    expect(s().weightUnit).toBe("kg");
    expect(s().weightLog[0]!.weight).toBeCloseTo(99.8, 1);
    expect(s().weightGoal).toBeCloseTo(90.7, 1);

    // Round-trips back close to the original.
    s().setWeightUnit("lb");
    expect(s().weightLog[0]!.weight).toBeCloseTo(220, 0);
  });
});

describe("calorie / food tracking", () => {
  it("totals calories and protein for today against goals", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().setCalorieGoal(1500);
    s().setProteinGoal(120);
    s().logFood("Greek yogurt", 150, 18);
    s().logFood("Tofu scramble", 300, 24);
    s().logFood("Black coffee", 5); // no protein

    const day = foodDay(s());
    expect(day.entries).toHaveLength(3);
    expect(day.calories).toBe(455);
    expect(day.protein).toBe(42);
    expect(day.caloriesLeft).toBe(1045);
    expect(day.proteinLeft).toBe(78);
  });

  it("removes a food entry", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().logFood("Snack", 200);
    const id = s().foodLog[0]!.id;
    s().removeFoodEntry(id);
    expect(s().foodLog).toHaveLength(0);
  });

  it("clamps goals to sane bounds", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().setCalorieGoal(-100);
    s().setProteinGoal(9999);
    expect(s().calorieGoal).toBe(0);
    expect(s().proteinGoal).toBe(400);
  });
});

describe("calendar events: range, color, reminder", () => {
  it("stores end time, color, and alert on an event", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().addFromIntent({
      kind: "event",
      title: "Focus block",
      date: "2026-08-17",
      time: "09:00",
      endTime: "10:30",
      color: "blue",
      alert: true,
      confidence: 1,
    });
    const ev = s().events.find((e) => e.title === "Focus block");
    expect(ev).toBeTruthy();
    expect(ev).toMatchObject({ time: "09:00", endTime: "10:30", color: "blue", alert: true });
  });

  it("derives a meeting's duration from the time range", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    const before = s().meetings.length;
    s().addFromIntent({
      kind: "meeting",
      title: "Standup",
      date: "2026-08-17",
      time: "09:00",
      endTime: "09:45",
      confidence: 1,
    });
    const mtg = s().meetings.find((m) => m.title === "Standup");
    expect(s().meetings.length).toBe(before + 1);
    expect(mtg?.durationMin).toBe(45);
  });
});

describe("8-week glute program tracking", () => {
  it("has a faithful shape: 6 training days + Sunday rest, 48 sessions", () => {
    expect(GLUTE_PROGRAM.days).toHaveLength(7);
    expect(TRAINING_DAYS).toHaveLength(6);
    expect(GLUTE_PROGRAM.days[6]!.rest).toBe(true);
    expect(GLUTE_PROGRAM.days[6]!.exercises).toHaveLength(0);
    expect(PROGRAM_TOTAL_SESSIONS).toBe(48);
    // Every training day is labeled and carries workouts.
    for (const d of TRAINING_DAYS) {
      expect(d.name).toBeTruthy();
      expect(d.focus).toBeTruthy();
      expect(d.exercises.length).toBeGreaterThan(0);
      expect(d.exercises.every((e) => e.name && e.scheme)).toBe(true);
    }
  });

  it("anchors the schedule to a Sunday start (Aug 16, 2026)", () => {
    const start = "2026-08-16"; // a Sunday
    // Sunday rest opens the week; Mon → Sat follow.
    expect(programDayDate(start, 1, 7)).toBe("2026-08-16"); // Sunday (rest)
    expect(programDayDate(start, 1, 1)).toBe("2026-08-17"); // Monday
    expect(programDayDate(start, 1, 6)).toBe("2026-08-22"); // Saturday
    expect(programDayDate(start, 2, 1)).toBe("2026-08-24"); // week 2 Monday
    expect(programEndDate(start)).toBe("2026-10-10"); // week 8 Saturday
    expect(programWeekRange(start, 1)).toEqual(["2026-08-16", "2026-08-22"]);
    // Sunday-first display order.
    expect(ORDERED_DAYS[0]!.day).toBe(7);
    expect(ORDERED_DAYS.map((d) => d.day)).toEqual([7, 1, 2, 3, 4, 5, 6]);
  });

  it("computes the current week (and 'not started') from a date", () => {
    const start = "2026-08-16";
    expect(programHasStarted(start, "2026-08-14")).toBe(false);
    expect(programCurrentWeek(start, "2026-08-14")).toBe(1); // before start → week 1
    expect(programCurrentWeek(start, "2026-08-16")).toBe(1);
    expect(programCurrentWeek(start, "2026-08-24")).toBe(2);
    expect(programCurrentWeek(start, "2026-12-31")).toBe(8); // clamped
  });

  it("restarts on a new date, clearing all progress", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().toggleProgramDay(1, 1);
    s().toggleProgramDay(2, 3);
    expect(Object.values(s().programProgress).filter(Boolean).length).toBe(2);

    s().restartProgram("2026-08-16");
    expect(s().programStartDate).toBe("2026-08-16");
    expect(Object.values(s().programProgress).filter(Boolean).length).toBe(0);
    expect(s().programWeek).toBeGreaterThanOrEqual(1);
    expect(s().programWeek).toBeLessThanOrEqual(8);
  });

  it("toggles day completion per week and tracks the active week", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();

    s().toggleProgramDay(1, 1);
    s().toggleProgramDay(1, 2);
    expect(s().programProgress[programCellKey(1, 1)]).toBe(true);
    expect(Object.values(s().programProgress).filter(Boolean)).toHaveLength(2);

    // Toggling off removes it.
    s().toggleProgramDay(1, 1);
    expect(s().programProgress[programCellKey(1, 1)]).toBeUndefined();
    expect(Object.values(s().programProgress).filter(Boolean)).toHaveLength(1);

    s().setProgramWeek(3);
    expect(s().programWeek).toBe(3);
    s().setProgramWeek(99);
    expect(s().programWeek).toBe(8); // clamped
    s().setProgramWeek(0);
    expect(s().programWeek).toBe(1); // clamped
  });
});
