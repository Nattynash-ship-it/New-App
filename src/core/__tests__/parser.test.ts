import { describe, expect, it } from "vitest";
import { addDays, fromISODate, todayISO } from "../dates";
import { parseQuickAdd } from "../nlp/parser";

describe("parseQuickAdd", () => {
  it("parses the canonical example: meeting tomorrow at 2 PM", () => {
    const intent = parseQuickAdd("Add a meeting tomorrow at 2 PM for policy review");
    expect(intent.kind).toBe("meeting");
    expect(intent.date).toBe(addDays(todayISO(), 1));
    expect(intent.time).toBe("14:00");
    expect(intent.title.toLowerCase()).toContain("policy review");
    expect(intent.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("classifies assignments with due dates", () => {
    const intent = parseQuickAdd("Discrete math assignment due Friday");
    expect(intent.kind).toBe("assignment");
    expect(fromISODate(intent.date).getDay()).toBe(5); // a Friday
    expect(intent.date > todayISO()).toBe(true); // the upcoming one
  });

  it("classifies kids' activities", () => {
    const intent = parseQuickAdd("Soccer practice for Maya on Tuesday at 5pm");
    expect(intent.kind).toBe("family_activity");
    expect(intent.time).toBe("17:00");
    expect(fromISODate(intent.date).getDay()).toBe(2); // a Tuesday
  });

  it("classifies workouts", () => {
    const intent = parseQuickAdd("Lagree class Saturday 9am");
    expect(intent.kind).toBe("workout");
    expect(intent.time).toBe("09:00");
    expect(fromISODate(intent.date).getDay()).toBe(6);
  });

  it("handles 12-hour edge cases", () => {
    expect(parseQuickAdd("call at 12 pm today").time).toBe("12:00");
    expect(parseQuickAdd("call at 12 am today").time).toBe("00:00");
    expect(parseQuickAdd("standup at 9:15am tomorrow").time).toBe("09:15");
  });

  it("parses explicit month-name dates into the future", () => {
    const intent = parseQuickAdd("exam on December 15");
    expect(intent.date.endsWith("-12-15")).toBe(true);
    expect(intent.date >= todayISO()).toBe(true);
  });

  it("defaults to today with low confidence for vague input", () => {
    const intent = parseQuickAdd("thing");
    expect(intent.kind).toBe("event");
    expect(intent.date).toBe(todayISO());
    expect(intent.confidence).toBeLessThan(0.75);
  });

  it("strips scheduling words from the title", () => {
    const intent = parseQuickAdd("Schedule a sync next Monday at noon");
    expect(intent.time).toBe("12:00");
    expect(intent.title.toLowerCase()).not.toContain("monday");
    expect(intent.title.toLowerCase()).not.toContain("noon");
  });

  it("never returns an empty title", () => {
    const intent = parseQuickAdd("tomorrow at 3pm");
    expect(intent.title.length).toBeGreaterThan(0);
  });
});
