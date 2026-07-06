import { describe, expect, it } from "vitest";
import {
  AFFIRMATION_THEMES,
  affirmationSessionUrl,
  dailyAffirmation,
} from "../data/affirmations";

describe("affirmations", () => {
  it("returns a stable affirmation for a given day", () => {
    const a = dailyAffirmation("2026-07-06");
    const b = dailyAffirmation("2026-07-06");
    expect(a.line).toBe(b.line);
    expect(a.theme.lines).toContain(a.line);
  });

  it("rotates across days", () => {
    const days = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"];
    const lines = new Set(days.map((d) => dailyAffirmation(d).line));
    // Not all five identical — the rotation actually moves.
    expect(lines.size).toBeGreaterThan(1);
  });

  it("covers the themes she asked for", () => {
    const ids = AFFIRMATION_THEMES.map((t) => t.id);
    for (const id of ["beauty", "success", "health", "wealth", "grades"]) {
      expect(ids).toContain(id);
    }
  });

  it("builds a YouTube search link for a 10-minute session", () => {
    expect(affirmationSessionUrl("Beauty")).toBe(
      "https://www.youtube.com/results?search_query=10%20minute%20Beauty%20affirmations",
    );
  });
});
