import { describe, expect, it } from "vitest";
import { parseSmartTask } from "../nlp/parser";
import { addDays, todayISO } from "../dates";

describe("parseSmartTask — smart natural-language task entry", () => {
  it("pulls out date, time, urgency, and section, leaving a clean title", () => {
    const r = parseSmartTask("order groceries friday 5pm !high");
    expect(r.title.toLowerCase()).toContain("order groceries");
    expect(r.title.toLowerCase()).not.toContain("friday");
    expect(r.title).not.toContain("!high");
    expect(r.dueTime).toBe("17:00");
    expect(r.urgency).toBe("high");
    expect(r.domain).toBe("meals");
    expect(r.dueDate).toBeTruthy();
  });

  it("handles 'tomorrow' and school keywords", () => {
    const r = parseSmartTask("study for stats exam tomorrow");
    expect(r.dueDate).toBe(addDays(todayISO(), 1));
    expect(r.domain).toBe("school");
    expect(r.urgency).toBe("medium");
  });

  it("reads an explicit #section tag and low urgency", () => {
    const r = parseSmartTask("fix the porch light someday #home");
    expect(r.domain).toBe("family");
    expect(r.urgency).toBe("low");
    expect(r.title.toLowerCase()).toContain("porch light");
    expect(r.title).not.toContain("#home");
  });

  it("leaves a plain task undated and general", () => {
    const r = parseSmartTask("call the plumber");
    expect(r.dueDate).toBeUndefined();
    expect(r.dueTime).toBeUndefined();
    expect(r.domain).toBeUndefined();
    expect(r.urgency).toBe("medium");
    expect(r.title).toBe("Call the plumber");
  });

  it("detects a fitness workout and a time", () => {
    const r = parseSmartTask("gym workout at 6am");
    expect(r.domain).toBe("fitness");
    expect(r.dueTime).toBe("06:00");
  });
});
