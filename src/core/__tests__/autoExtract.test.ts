import { describe, expect, it } from "vitest";
import { extractFromFile } from "../ai/autoExtract";

describe("extractFromFile (upload auto-extraction)", () => {
  it("mines a text file for classes with pass/in-progress status", async () => {
    const file = new File(
      ["MATH 232 Discrete Mathematics 4 A\nCS 310 Data Structures 4 In Progress"],
      "transcript.txt",
      { type: "text/plain" },
    );
    const found = await extractFromFile(file);
    expect(found.fileName).toBe("transcript.txt");
    expect(found.classes.map((c) => c.code)).toEqual(["MATH 232", "CS 310"]);
    expect(found.classes[0]?.completed).toBe(true);
    expect(found.classes[1]?.completed).toBe(false);
  });

  it("mines a single dated line (a flyer) for the date, not a class", async () => {
    const file = new File(["Dentist for Maya on Oct 10 at 9am"], "note.txt", { type: "text/plain" });
    const found = await extractFromFile(file);
    expect(found.classes).toHaveLength(0);
    expect(found.items.length).toBeGreaterThan(0);
  });

  it("returns classes only for a transcript (no date noise)", async () => {
    const file = new File(
      [
        "FALL 2024\nD278 Scripting and Programming Foundations 3.00 PASS\nC949 Data Structures 4.00 Competent\nDegree audit generated Oct 10 2024",
      ],
      "transcript.txt",
      { type: "text/plain" },
    );
    const found = await extractFromFile(file);
    expect(found.classes.length).toBe(2);
    // Two+ classes → treated as a transcript, dated rows dropped.
    expect(found.items).toHaveLength(0);
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
