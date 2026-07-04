import { describe, expect, it } from "vitest";
import { extractItems } from "../nlp/extract";
import { addDays, todayISO } from "../dates";

describe("extractItems (Smart Capture local fallback)", () => {
  it("pulls multiple dated items out of a pasted block", () => {
    const email = `Hi families!
Field trip to the science museum on Friday at 9am.
Problem Set 6 is due tomorrow.
Please just read this line with no date.
Dentist appointment for Maya on the 15th.`;
    const items = extractItems(email);
    // The three dated lines are captured; the plain sentence is dropped.
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some((i) => /field trip/i.test(i.title))).toBe(true);
    expect(items.some((i) => i.kind === "assignment")).toBe(true);
  });

  it("resolves 'tomorrow' against today", () => {
    const items = extractItems("Soccer practice tomorrow at 5pm");
    expect(items[0]?.date).toBe(addDays(todayISO(), 1));
    expect(items[0]?.time).toBe("17:00");
  });

  it("dedupes identical lines and returns nothing for date-free text", () => {
    expect(extractItems("just some thoughts about nothing in particular")).toEqual([]);
    const dup = extractItems("Meeting Friday\nMeeting Friday");
    expect(dup.length).toBe(1);
  });
});
