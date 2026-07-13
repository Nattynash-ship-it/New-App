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
