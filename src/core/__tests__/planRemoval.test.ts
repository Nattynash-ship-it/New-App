import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { todaysPlan } from "../selectors";
import { todayISO } from "../dates";

beforeAll(() => {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    },
  });
});

beforeEach(async () => {
  const { useHub } = await import("../store/hub");
  useHub.getState().resetToSeed();
  useHub.getState().clearPlanDismissed();
});

describe("today's plan: × takes an item off without deleting it", () => {
  it("removes any item kind from the plan and leaves the underlying data intact", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();

    // A meeting today guarantees at least one fixed plan row.
    s().addMeeting({ title: "Standup", date: todayISO(), time: "09:00", durationMin: 30 });
    const before = todaysPlan(s(), "high").items;
    expect(before.length).toBeGreaterThan(0);

    const target = before[0]!;
    s().dismissFromPlan(target.id);

    const after = todaysPlan(s(), "high");
    expect(after.items.some((i) => i.id === target.id)).toBe(false);
    expect(after.dismissed).toBe(1);
    // Non-destructive: the source record still exists somewhere in the store.
    const stillExists =
      s().meetings.some((m) => m.id === target.id) ||
      s().assignments.some((a) => a.id === target.id) ||
      s().activities.some((a) => a.id === target.id) ||
      s().habits.some((h) => h.id === target.id) ||
      s().projects.some((p) => p.tasks.some((t) => t.id === target.id));
    expect(stillExists).toBe(true);
  });

  it("restores a single item (undo) and can bring everything back", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().addMeeting({ title: "Sync", date: todayISO(), time: "10:00", durationMin: 30 });

    const items = todaysPlan(s(), "high").items;
    const a = items[0]!;
    s().dismissFromPlan(a.id);
    expect(todaysPlan(s(), "high").items.some((i) => i.id === a.id)).toBe(false);

    s().restoreToPlan(a.id);
    expect(todaysPlan(s(), "high").items.some((i) => i.id === a.id)).toBe(true);

    // Dismiss two, then clear them all at once.
    const two = todaysPlan(s(), "high").items.slice(0, 2);
    for (const i of two) s().dismissFromPlan(i.id);
    expect(todaysPlan(s(), "high").dismissed).toBe(two.length);
    s().clearPlanDismissed();
    expect(todaysPlan(s(), "high").dismissed).toBe(0);
  });

  it("ignores a duplicate dismiss of the same item", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().addMeeting({ title: "Dup", date: todayISO(), time: "11:00", durationMin: 30 });
    const id = todaysPlan(s(), "high").items[0]!.id;
    s().dismissFromPlan(id);
    s().dismissFromPlan(id);
    expect(todaysPlan(s(), "high").dismissed).toBe(1);
  });
});

describe("removeScheduledItem covers every scheduled kind and undoes precisely", () => {
  it("removes and restores an assignment (previously not removable inline)", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().addAssignment({ title: "Essay", dueDate: todayISO() });
    const asg = s().assignments.find((a) => a.title === "Essay")!;

    const restore = s().removeScheduledItem(asg.id);
    expect(s().assignments.some((a) => a.id === asg.id)).toBe(false);
    restore();
    expect(s().assignments.some((a) => a.id === asg.id)).toBe(true);
  });

  it("removes and restores a study block", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    s().addStudyBlock({ dayOfWeek: 1, time: "20:00", durationMin: 60 });
    const block = s().studyBlocks.at(-1)!;

    const restore = s().removeScheduledItem(block.id);
    expect(s().studyBlocks.some((b) => b.id === block.id)).toBe(false);
    restore();
    expect(s().studyBlocks.some((b) => b.id === block.id)).toBe(true);
  });

  it("returns a no-op restore for an unknown id", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    const before = s().meetings.length;
    expect(() => s().removeScheduledItem("nope_does_not_exist")()).not.toThrow();
    expect(s().meetings.length).toBe(before);
  });
});
