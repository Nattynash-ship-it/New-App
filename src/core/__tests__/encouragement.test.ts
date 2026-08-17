import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { celebrationForToday, encouragementForToday } from "../selectors";

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
});

describe("words of encouragement", () => {
  it("is stable through the day for a given surface", () => {
    expect(encouragementForToday()).toBe(encouragementForToday());
    expect(encouragementForToday("banner")).toBe(encouragementForToday("banner"));
    expect(celebrationForToday("plan")).toBe(celebrationForToday("plan"));
  });

  it("gives different surfaces different lines, so nothing reads duplicated", () => {
    // The hero and the bottom banner are on screen together — they must differ.
    expect(encouragementForToday("banner")).not.toBe(encouragementForToday());
  });

  it("always returns a non-empty line", () => {
    for (const slot of ["", "banner", "plan", "work", "timeline"]) {
      expect(encouragementForToday(slot).length).toBeGreaterThan(0);
      expect(celebrationForToday(slot).length).toBeGreaterThan(0);
    }
  });
});

describe("today's top 3: delete a task with undo", () => {
  it("deletes the task, unpicks it from focus, and restores both on undo", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();

    const project = s().projects.find((p) => p.tasks.some((t) => !t.done))!;
    const task = project.tasks.find((t) => !t.done)!;

    // Pick it as one of today's top 3.
    s().toggleFocusTask(task.id);
    expect(s().focus.taskIds).toContain(task.id);

    const restore = s().removeWorkTaskWithUndo(project.id, task.id);
    const after = s().projects.find((p) => p.id === project.id)!;
    expect(after.tasks.some((t) => t.id === task.id)).toBe(false);
    expect(s().focus.taskIds).not.toContain(task.id); // focus cleaned up too

    restore();
    const restored = s().projects.find((p) => p.id === project.id)!;
    expect(restored.tasks.some((t) => t.id === task.id)).toBe(true);
    expect(s().focus.taskIds).toContain(task.id); // it was focused, so it comes back
  });

  it("unpicking keeps the task and only clears the focus slot", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    const project = s().projects.find((p) => p.tasks.some((t) => !t.done))!;
    const task = project.tasks.find((t) => !t.done)!;

    s().toggleFocusTask(task.id);
    expect(s().focus.taskIds).toContain(task.id);
    s().toggleFocusTask(task.id);

    expect(s().focus.taskIds).not.toContain(task.id);
    // The task itself survives — it just drops back to the candidate chips.
    const still = s().projects.find((p) => p.id === project.id)!;
    expect(still.tasks.some((t) => t.id === task.id)).toBe(true);
  });

  it("returns a no-op restore when the task doesn't exist", async () => {
    const { useHub } = await import("../store/hub");
    const s = () => useHub.getState();
    expect(() => s().removeWorkTaskWithUndo("nope", "nope")()).not.toThrow();
  });
});
