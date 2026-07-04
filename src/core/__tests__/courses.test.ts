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
    expect(courses[0]).toEqual({ code: "MATH 232", name: "Discrete Mathematics", credits: 4 });
    expect(courses[1]?.code).toBe("CS 310");
    expect(courses[1]?.name).toContain("Data Structures");
    expect(courses[2]?.code).toBe("ENGL 101");
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
});
