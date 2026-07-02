import { describe, expect, it } from "vitest";
import { todayISO } from "../dates";
import { courseProgress, selectTimeline } from "../selectors";
import type { HubState } from "../store/hub";

const today = todayISO();

/** Minimal state slice; selectTimeline only reads the data arrays. */
function makeState(overrides: Partial<HubState>): HubState {
  return {
    checkIns: [],
    events: [],
    projects: [],
    meetings: [],
    courses: [],
    assignments: [],
    pantry: [],
    recipes: [],
    plannedMeals: [],
    groceryList: [],
    routines: [],
    workoutLogs: [],
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
