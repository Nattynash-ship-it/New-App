import { describe, expect, it } from "vitest";
import { parseStudyExport, toRawUrl } from "../integrations/studyImport";

const SAMPLE = {
  source: "study-app",
  version: 1,
  classes: [
    {
      code: "D278",
      name: "Scripting and Programming Foundations",
      credits: 3,
      completed: false,
      assignments: [{ title: "Project 1", dueDate: "2026-09-15", dueTime: "23:59" }],
      exams: [{ title: "Objective Assessment", date: "2026-10-01T14:00:00", time: "14:00" }],
    },
    { code: "C949", name: "Data Structures", credits: 4, completed: true },
  ],
};

describe("parseStudyExport (study-app link contract)", () => {
  it("parses the documented shape", () => {
    const r = parseStudyExport(JSON.stringify(SAMPLE));
    expect(r.classCount).toBe(2);
    expect(r.itemCount).toBe(2); // 1 assignment + 1 exam
    expect(r.classes[0]?.code).toBe("D278");
    expect(r.classes[0]?.assignments?.[0]?.dueTime).toBe("23:59");
    expect(r.classes[0]?.exams?.[0]?.date).toBe("2026-10-01");
    expect(r.classes[1]?.completed).toBe(true);
  });

  it("tolerates 'courses'/'title'/'due' variants", () => {
    const r = parseStudyExport({
      courses: [{ id: "MATH101", title: "Calculus", tasks: [{ name: "HW1", due: "2026-09-01" }] }],
    });
    expect(r.classes[0]?.code).toBe("MATH101");
    expect(r.classes[0]?.name).toBe("Calculus");
    expect(r.classes[0]?.assignments?.[0]?.title).toBe("HW1");
  });

  it("throws a friendly error on bad input", () => {
    expect(() => parseStudyExport("not json")).toThrow(/valid JSON/i);
    expect(() => parseStudyExport({ foo: 1 })).toThrow(/classes/i);
  });

  it("rewrites a github blob URL to raw", () => {
    expect(toRawUrl("https://github.com/me/study/blob/main/data/classes.json")).toBe(
      "https://raw.githubusercontent.com/me/study/main/data/classes.json",
    );
  });
});

describe("importStudyClasses (store merge)", () => {
  it("creates courses + assignments and skips duplicates", async () => {
    const { useHub } = await import("../store/hub");
    useHub.setState({ courses: [], assignments: [] });
    const { classes } = parseStudyExport(JSON.stringify(SAMPLE));

    const first = useHub.getState().importStudyClasses(classes);
    expect(first.courses).toBe(2);
    expect(first.items).toBe(2);
    expect(useHub.getState().courses.map((c) => c.code)).toEqual(["D278", "C949"]);
    const proj = useHub.getState().assignments.find((a) => a.title === "Project 1");
    expect(proj?.dueTime).toBe("23:59");
    expect(proj?.courseId).toBeTruthy();

    // Re-import is idempotent — nothing new.
    const second = useHub.getState().importStudyClasses(classes);
    expect(second.courses).toBe(0);
    expect(second.items).toBe(0);
  });
});
