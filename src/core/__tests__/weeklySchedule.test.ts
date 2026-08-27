import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEK_BLOCKS,
  ensureAnchorReminders,
  ensureTidyBlocks,
  isAnchorBlock,
  TIDY_TITLE,
  toMinutes,
} from "../data/weeklySchedule";
import { workoutById } from "../fitness/program";
import { buildWeeklyICS } from "../../lib/calendar";
import { weekStartISO } from "../dates";

describe("default weekly schedule", () => {
  it("covers all 7 days with unique ids", () => {
    const days = new Set(DEFAULT_WEEK_BLOCKS.map((b) => b.day));
    expect(days.size).toBe(7);
    const ids = DEFAULT_WEEK_BLOCKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every weekday ~3h study and ~1h movement", () => {
    for (let day = 0; day < 7; day++) {
      const blocks = DEFAULT_WEEK_BLOCKS.filter((b) => b.day === day);
      const study = blocks.filter((b) => b.category === "study").reduce((n, b) => n + (toMinutes(b.end) - toMinutes(b.start)), 0);
      const move = blocks.filter((b) => b.category === "workout").reduce((n, b) => n + (toMinutes(b.end) - toMinutes(b.start)), 0);
      expect(study, `day ${day} study`).toBeGreaterThanOrEqual(180); // 3h
      expect(move, `day ${day} movement`).toBeGreaterThanOrEqual(60); // 1h
    }
  });

  it("links every movement block to a real app workout", () => {
    const moves = DEFAULT_WEEK_BLOCKS.filter((b) => b.category === "workout");
    expect(moves).toHaveLength(7); // one a day
    for (const m of moves) {
      expect(m.workoutId, `${m.title} has a workoutId`).toBeTruthy();
      const w = workoutById(m.workoutId!);
      expect(w, `${m.workoutId} resolves`).toBeTruthy();
      expect(w!.exercises.length).toBeGreaterThan(0);
    }
  });

  it("puts the 7 PM reading ritual on every day", () => {
    for (let day = 0; day < 7; day++) {
      const reading = DEFAULT_WEEK_BLOCKS.find(
        (b) => b.day === day && b.start === "19:00" && /reads to me/i.test(b.title),
      );
      expect(reading, `day ${day} reading`).toBeTruthy();
    }
  });

  it("gives every day a daily tidy block, idempotently and without overlap", () => {
    for (let day = 0; day < 7; day++) {
      const tidy = DEFAULT_WEEK_BLOCKS.filter((b) => b.day === day && b.title === TIDY_TITLE);
      expect(tidy, `day ${day} tidy`).toHaveLength(1);
    }
    // Running it again adds nothing (idempotent).
    const again = ensureTidyBlocks(DEFAULT_WEEK_BLOCKS);
    expect(again.filter((b) => b.title === TIDY_TITLE)).toHaveLength(7);
    expect(again.length).toBe(DEFAULT_WEEK_BLOCKS.length);
  });

  it("defaults reminders on for anchor blocks (movement, reading, tidy)", () => {
    const anchors = DEFAULT_WEEK_BLOCKS.filter(isAnchorBlock);
    // 7 movement + 7 reading + 7 tidy = 21
    expect(anchors.length).toBe(21);
    expect(anchors.every((b) => b.reminder === true)).toBe(true);
    // Non-anchors stay off.
    expect(DEFAULT_WEEK_BLOCKS.some((b) => !isAnchorBlock(b) && b.reminder)).toBe(false);
  });

  it("preserves a user's reminder choice (doesn't re-enable a turned-off anchor)", () => {
    const off = DEFAULT_WEEK_BLOCKS.map((b) =>
      isAnchorBlock(b) ? { ...b, reminder: false } : b,
    );
    const after = ensureAnchorReminders(off);
    expect(after.some((b) => isAnchorBlock(b) && b.reminder)).toBe(false);
  });

  it("exports weekly-recurring calendar events with an alarm", () => {
    const ics = buildWeeklyICS([{ id: "m", title: "Movement", day: 1, time: "05:00", durationMin: 60 }]);
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");
    expect(ics).toContain("SUMMARY:Movement");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT5M");
  });

  it("has no overlapping blocks within a day", () => {
    for (let day = 0; day < 7; day++) {
      const blocks = DEFAULT_WEEK_BLOCKS.filter((b) => b.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
      for (let i = 1; i < blocks.length; i++) {
        expect(toMinutes(blocks[i]!.start), `day ${day} overlap at ${blocks[i]!.title}`).toBeGreaterThanOrEqual(
          toMinutes(blocks[i - 1]!.end),
        );
      }
    }
  });
});

describe("weekBlocks store actions", () => {
  it("adds, removes, and resets", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().resetWeekBlocks();
    const base = useHub.getState().weekBlocks.length;

    useHub.getState().addWeekBlock({ day: 1, start: "22:00", end: "22:30", title: "Read a novel", category: "self" });
    expect(useHub.getState().weekBlocks.length).toBe(base + 1);
    const added = useHub.getState().weekBlocks.find((b) => b.title === "Read a novel")!;
    expect(added.id).toBeTruthy();

    useHub.getState().removeWeekBlock(added.id);
    expect(useHub.getState().weekBlocks.length).toBe(base);

    useHub.getState().resetWeekBlocks();
    expect(useHub.getState().weekBlocks.length).toBe(base);
  });

  it("checks blocks off for this week and recycles old weeks", async () => {
    const { useHub } = await import("../store/hub");
    useHub.setState({ weekChecks: {} });
    const id = DEFAULT_WEEK_BLOCKS[0]!.id;
    const thisWeek = weekStartISO();

    useHub.getState().toggleWeekBlockDone(id);
    expect(useHub.getState().weekChecks[id]).toBe(thisWeek);

    // Toggling again clears it.
    useHub.getState().toggleWeekBlockDone(id);
    expect(useHub.getState().weekChecks[id]).toBeUndefined();

    // A check left over from a previous week is pruned on the next toggle,
    // so nothing from last week shows as done this week.
    const other = DEFAULT_WEEK_BLOCKS[1]!.id;
    useHub.setState({ weekChecks: { [id]: "2000-01-03" } }); // an old Monday
    useHub.getState().toggleWeekBlockDone(other);
    const checks = useHub.getState().weekChecks;
    expect(checks[id]).toBeUndefined(); // last week's check gone
    expect(checks[other]).toBe(thisWeek);
  });
});
