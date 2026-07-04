import { describe, expect, it } from "vitest";
import { addDays, todayISO } from "../dates";
import { courseProgress, selectDayBlocks, selectTimeline, selectUpcoming } from "../selectors";
import type { HubState } from "../store/hub";

const today = todayISO();

describe("selectDayBlocks (time-block calendar)", () => {
  const blockBase = {
    meetings: [],
    assignments: [],
    activities: [],
    plannedMeals: [],
    events: [],
    studyBlocks: [],
    courses: [],
    kids: [],
  };

  it("positions a meeting with its real start and duration", () => {
    const state = {
      ...blockBase,
      meetings: [{ id: "m1", title: "Sync", date: today, time: "10:00", durationMin: 45 }],
    } as unknown as HubState;
    const { timed } = selectDayBlocks(state, today);
    expect(timed).toHaveLength(1);
    expect(timed[0]).toMatchObject({ startMin: 600, endMin: 645, domain: "work" });
  });

  it("routes a timeless assignment to all-day", () => {
    const state = {
      ...blockBase,
      assignments: [{ id: "a1", title: "Essay", dueDate: today, done: false }],
    } as unknown as HubState;
    const { timed, allDay } = selectDayBlocks(state, today);
    expect(timed).toHaveLength(0);
    expect(allDay.map((a) => a.title)).toContain("Essay");
  });

  it("marks one-off scheduled items removable and managed items not", () => {
    const state = {
      ...blockBase,
      meetings: [{ id: "m1", title: "Sync", date: today, time: "10:00", durationMin: 30 }],
      assignments: [{ id: "a1", title: "Lab", dueDate: today, dueTime: "14:00", done: false }],
    } as unknown as HubState;
    const { timed } = selectDayBlocks(state, today);
    const meeting = timed.find((b) => b.id === "m1");
    const assignment = timed.find((b) => b.id === "a1");
    expect(meeting?.removable).toBe(true);
    expect(assignment?.removable).toBe(false);
  });
});

/** Minimal state slice; selectTimeline only reads the data arrays. */
function makeState(overrides: Partial<HubState>): HubState {
  return {
    checkIns: [],
    events: [],
    projects: [],
    meetings: [],
    courses: [],
    assignments: [],
    studyBlocks: [],
    degreePlan: { programName: "B.S. CS", totalCredits: 120, completedCredits: 60 },
    pantry: [],
    recipes: [],
    plannedMeals: [],
    groceryList: [],
    routines: [],
    workoutLogs: [],
    fitnessGoals: [],
    weeklySessionTarget: 4,
    preferredStore: "whole_foods",
    focus: { date: today, taskIds: [] },
    kids: [],
    activities: [],
    chores: [],
    rewards: [],
    ledger: [],
    ...overrides,
  } as HubState;
}

describe("selectTimeline", () => {
  it("aggregates all domains for the day, sorted by time", () => {
    const state = makeState({
      meetings: [
        { id: "m1", title: "Standup", date: today, time: "14:30", durationMin: 15 },
        { id: "m2", title: "Policy sync", date: today, time: "10:00", durationMin: 30 },
      ],
      assignments: [
        { id: "a1", title: "PSet 6", dueDate: today, dueTime: "23:00", done: false },
        { id: "a2", title: "Done one", dueDate: today, done: true }, // completed → excluded
      ],
      activities: [{ id: "f1", title: "Dentist", date: today, time: "15:45" }],
      plannedMeals: [{ id: "pm1", date: today, slot: "lunch", title: "Power bowl" }],
      events: [{ id: "e1", title: "Errand", date: today, domain: "compass", createdAt: "" }],
    });

    const timeline = selectTimeline(state, today);
    expect(timeline.map((t) => t.id)).toEqual(["m2", "pm1", "m1", "f1", "a1", "e1"]);
    // untimed entries sort last
    expect(timeline[timeline.length - 1]?.time).toBeUndefined();
    // completed assignment excluded
    expect(timeline.some((t) => t.id === "a2")).toBe(false);
  });

  it("ignores other days", () => {
    const state = makeState({
      meetings: [{ id: "m1", title: "Future", date: "2099-01-01", time: "10:00", durationMin: 30 }],
    });
    expect(selectTimeline(state, today)).toHaveLength(0);
  });
});

describe("selectUpcoming", () => {
  it("collects the next 7 days, excluding today, sorted chronologically", () => {
    const state = makeState({
      activities: [
        { id: "today", title: "Dentist", date: today, time: "10:00", category: "appointment" },
        { id: "d1", title: "Soccer", date: addDays(today, 1), time: "17:00", category: "activity" },
        { id: "d5", kidId: "k1", title: "Pediatrician", date: addDays(today, 5), time: "09:30", category: "appointment" },
        { id: "d9", title: "Too far", date: addDays(today, 9) },
      ],
      meetings: [{ id: "m1", title: "Sync", date: addDays(today, 2), time: "11:00", durationMin: 30 }],
      assignments: [
        { id: "a1", title: "PSet", dueDate: addDays(today, 3), done: false },
        { id: "a2", title: "Done", dueDate: addDays(today, 3), done: true },
      ],
    });

    const radar = selectUpcoming(state, 7);
    expect(radar.map((e) => e.id)).toEqual(["d1", "m1", "a1", "d5"]);
  });

  it("flags appointments and deadlines with badges", () => {
    const state = makeState({
      activities: [
        { id: "appt", title: "Checkup", date: addDays(today, 2), category: "appointment" },
      ],
      assignments: [{ id: "due", title: "Essay", dueDate: addDays(today, 2), done: false }],
    });
    const radar = selectUpcoming(state, 7);
    expect(radar.find((e) => e.id === "appt")?.badge).toBe("appt");
    expect(radar.find((e) => e.id === "due")?.badge).toBe("due");
  });
});

describe("courseProgress", () => {
  it("counts topics across units", () => {
    const course = {
      units: [
        { topics: [{ completed: true }, { completed: true }, { completed: false }] },
        { topics: [{ completed: false }] },
      ],
    };
    expect(courseProgress(course)).toEqual({ done: 2, total: 4, pct: 50 });
  });

  it("handles empty courses", () => {
    expect(courseProgress({ units: [] })).toEqual({ done: 0, total: 0, pct: 0 });
  });
});
