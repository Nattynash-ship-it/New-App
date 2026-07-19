import { describe, expect, it } from "vitest";
import { buildGluteProgram, PROGRAM_WEEKS } from "../fitness/program";

describe("8-week glute program", () => {
  it("lays out 8 weeks × 7 days from the start date, a workout every day", () => {
    const days = buildGluteProgram("2026-07-19"); // a Sunday
    expect(days).toHaveLength(PROGRAM_WEEKS * 7);
    // Every day has a workout — including Sundays.
    expect(days.every((d) => d.workout && d.workout.exercises.length > 0)).toBe(true);
    expect(days[0]?.date).toBe("2026-07-19");
    expect(days[0]?.weekdayLabel).toBe("Sun");
    expect(days[0]?.week).toBe(1);
    expect(days[days.length - 1]?.week).toBe(8);
  });

  it("assigns the Sunday session on Sundays and the Monday session on Mondays", () => {
    const days = buildGluteProgram("2026-07-19");
    const sunday = days.find((d) => d.weekdayLabel === "Sun");
    const monday = days.find((d) => d.weekdayLabel === "Mon");
    expect(sunday?.workout.id).toBe("lib_glute_sun");
    expect(monday?.workout.id).toBe("lib_glute_mon");
  });

  it("numbers days 1..56 in order", () => {
    const days = buildGluteProgram("2026-07-19");
    expect(days[0]?.dayNumber).toBe(1);
    expect(days[55]?.dayNumber).toBe(56);
  });
});
