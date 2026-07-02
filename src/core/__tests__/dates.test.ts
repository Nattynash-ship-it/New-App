import { describe, expect, it } from "vitest";
import { addDays, daysUntil, formatTime, fromISODate, toISODate, todayISO } from "../dates";

describe("dates", () => {
  it("round-trips ISO dates", () => {
    expect(toISODate(fromISODate("2026-07-02"))).toBe("2026-07-02");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-06-30", 2)).toBe("2026-07-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-07-02", -2)).toBe("2026-06-30");
  });

  it("computes daysUntil relative to today", () => {
    expect(daysUntil(todayISO())).toBe(0);
    expect(daysUntil(addDays(todayISO(), 3))).toBe(3);
    expect(daysUntil(addDays(todayISO(), -1))).toBe(-1);
  });

  it("formats times as 12-hour", () => {
    expect(formatTime("14:00")).toBe("2 PM");
    expect(formatTime("14:30")).toBe("2:30 PM");
    expect(formatTime("00:00")).toBe("12 AM");
    expect(formatTime("12:00")).toBe("12 PM");
    expect(formatTime("09:05")).toBe("9:05 AM");
  });
});
