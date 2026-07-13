import { describe, expect, it } from "vitest";
import { parseCourses } from "../nlp/courses";

describe("parseCourses (transcript → classes)", () => {
  it("pulls code, name, and credits from typical transcript lines", () => {
    const text = `Fall 2025
MATH 232  Discrete Mathematics  4  A
CS 310  Data Structures & Algorithms  4  In Progress
ENGL101  Composition 3 B+`;
    const courses = parseCourses(text);
    expect(courses.length).toBe(3);
    expect(courses[0]).toMatchObject({ code: "MATH 232", name: "Discrete Mathematics", credits: 4 });
    expect(courses[1]?.code).toBe("CS 310");
    expect(courses[1]?.name).toContain("Data Structures");
    expect(courses[2]?.code).toBe("ENGL 101");
  });

  it("reads the grade column: passing grade → completed, In Progress → not", () => {
    const text = `MATH 232 Discrete Mathematics 4 A
CS 310 Data Structures 4 In Progress
ENGL 101 Composition 3 B+
PHYS 201 Physics I 4 Pass`;
    const courses = parseCourses(text);
    const byCode = Object.fromEntries(courses.map((c) => [c.code, c.completed]));
    expect(byCode["MATH 232"]).toBe(true);
    expect(byCode["CS 310"]).toBe(false);
    expect(byCode["ENGL 101"]).toBe(true);
    expect(byCode["PHYS 201"]).toBe(true);
  });

  it("dedupes repeated codes and skips lines without a course code", () => {
    const text = `Dean's list — congratulations!\nBIOL 101 Intro Biology 4\nBIOL 101 Intro Biology 4`;
    const courses = parseCourses(text);
    expect(courses).toHaveLength(1);
    expect(courses[0]?.code).toBe("BIOL 101");
  });

  it("defaults credits to 3 when none are printed", () => {
    const courses = parseCourses("PHIL 200  Ethics");
    expect(courses[0]?.credits).toBe(3);
  });

  it("handles a real WGU-style transcript blob: Title-case dept, colon, percent+grade", () => {
    const blob =
      "Date Issued: 04/13/2026 Birthdate: 12/21/1984 " +
      "04/13/2026 Math 108: Discrete Mathematics 87 %, B+ " +
      "01/26/2026 Comp 210: Data Structures 91 %, A- " +
      "03/24/2026 Bio 120: Intro Biology In Progress " +
      "04/10/2026 Phys 201: Physics I 55 %, F";
    const courses = parseCourses(blob);
    const byCode = Object.fromEntries(courses.map((c) => [c.code, c]));
    expect(byCode["MATH 108"]?.name).toBe("Discrete Mathematics");
    expect(byCode["MATH 108"]?.completed).toBe(true); // 87% B+
    expect(byCode["COMP 210"]?.completed).toBe(true); // 91% A-
    expect(byCode["BIO 120"]?.completed).toBe(false); // In Progress
    expect(byCode["PHYS 201"]?.completed).toBe(false); // 55% F — failed
    // The Date Issued / Birthdate rows are NOT read as classes.
    expect(courses.some((c) => /issued|birth/i.test(c.name))).toBe(false);
  });

  it("skips term/summary header rows that look like codes", () => {
    const text = `FALL 2024
D278 Scripting and Programming Foundations 3.00 PASS
Cumulative GPA 3.85
TOTAL 90 Credits Earned`;
    const courses = parseCourses(text);
    expect(courses.map((c) => c.code)).toEqual(["D278"]);
  });

  it("reads WGU single-letter codes and Pass/Competent status", () => {
    const text = `D278 Scripting and Programming Foundations 3.00 PASS
C949 Data Structures and Algorithms I 4.00 Competent
C182 Introduction to IT 4 Transferred
D426 Data Management Foundations 3.00 In Progress`;
    const courses = parseCourses(text);
    expect(courses.map((c) => c.code)).toEqual(["D278", "C949", "C182", "D426"]);
    expect(courses[0]?.name).toContain("Scripting and Programming");
    expect(courses[0]?.completed).toBe(true); // PASS
    expect(courses[1]?.completed).toBe(true); // Competent
    expect(courses[2]?.completed).toBe(true); // Transferred
    expect(courses[3]?.completed).toBe(false); // In Progress
    expect(courses[1]?.credits).toBe(4);
  });
});
