import { describe, expect, it } from "vitest";
import { extractFromFile } from "../ai/autoExtract";

describe("extractFromFile (upload auto-extraction)", () => {
  it("mines a text file for classes and dated items", async () => {
    const file = new File(
      ["MATH 232 Discrete Mathematics 4 A\nCS 310 Data Structures 4 In Progress\nDentist for Maya on Oct 10 at 9am"],
      "transcript.txt",
      { type: "text/plain" },
    );
    const found = await extractFromFile(file);
    expect(found.fileName).toBe("transcript.txt");
    expect(found.classes.map((c) => c.code)).toEqual(["MATH 232", "CS 310"]);
    expect(found.classes[0]?.completed).toBe(true);
    expect(found.classes[1]?.completed).toBe(false);
    expect(found.items.length).toBeGreaterThan(0);
  });

  it("returns a note (not a crash) for unminable types", async () => {
    const file = new File(["binary"], "report.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const found = await extractFromFile(file);
    expect(found.classes).toHaveLength(0);
    expect(found.items).toHaveLength(0);
    expect(found.note).toBeTruthy();
  });
});
