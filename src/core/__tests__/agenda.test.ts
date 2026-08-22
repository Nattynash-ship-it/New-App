import { describe, expect, it, beforeEach } from "vitest";
import { selectAgenda } from "../selectors";
import { buildICS } from "../../lib/calendar";
import { todayISO, addDays } from "../dates";

async function freshStore() {
  const { useHub } = await import("../store/hub");
  useHub.setState({
    todos: [],
    assignments: [],
    meetings: [],
    activities: [],
    events: [],
    programDone: [],
    // Push the workout program out of the ±7-day agenda window so these tests
    // isolate tasks/meetings; the program's own inclusion is covered elsewhere.
    programStartDate: addDays(todayISO(), 30),
  });
  return useHub;
}

describe("selectAgenda (the Everything view)", () => {
  beforeEach(async () => {
    await freshStore();
  });

  it("buckets items by Overdue / Today / Tomorrow / Later and counts due-now", async () => {
    const useHub = await freshStore();
    const today = todayISO();
    useHub.setState({
      todos: [
        { id: "t1", title: "Overdue task", urgency: "high", done: false, createdAt: today + "T08:00", domain: "work", dueDate: addDays(today, -2) },
        { id: "t2", title: "Today task", urgency: "medium", done: false, createdAt: today + "T08:00", domain: "school", dueDate: today },
        { id: "t3", title: "Tomorrow task", urgency: "low", done: false, createdAt: today + "T08:00", dueDate: addDays(today, 1) },
        { id: "t4", title: "No-date task", urgency: "low", done: false, createdAt: today + "T08:00" },
        { id: "t5", title: "Done task", urgency: "low", done: true, createdAt: today + "T08:00", dueDate: today },
      ],
    });
    const a = selectAgenda(useHub.getState());
    const keys = a.buckets.map((b) => b.key);
    expect(keys).toContain("overdue");
    expect(keys).toContain("today");
    expect(keys).toContain("tomorrow");
    expect(keys).toContain("nodate");
    expect(a.overdue).toBe(1);
    expect(a.today).toBe(1);
    expect(a.dueNow).toBe(2);
    // Completed tasks don't appear.
    const all = a.buckets.flatMap((b) => b.items.map((i) => i.title));
    expect(all).not.toContain("Done task");
  });

  it("drops past meetings but keeps overdue tasks", async () => {
    const useHub = await freshStore();
    const today = todayISO();
    useHub.setState({
      meetings: [{ id: "m1", title: "Old standup", date: addDays(today, -1), time: "09:00", durationMin: 15 }],
      todos: [{ id: "t1", title: "Overdue", urgency: "high", done: false, createdAt: today + "T08:00", dueDate: addDays(today, -1) }],
    });
    const a = selectAgenda(useHub.getState());
    const titles = a.buckets.flatMap((b) => b.items.map((i) => i.title));
    expect(titles).toContain("Overdue");
    expect(titles).not.toContain("Old standup");
  });
});

describe("calendar .ics export", () => {
  it("builds a valid VCALENDAR with an alarm per event", () => {
    const ics = buildICS([{ id: "x", title: "Exam", date: "2026-08-01", time: "10:00", description: "MATH 108" }]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Exam");
    expect(ics).toContain("DTSTART:20260801T100000");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("END:VCALENDAR");
  });
});
