import { beforeAll, describe, expect, it } from "vitest";

// The persisted store touches localStorage at instantiation — shim it before
// the store module is (dynamically) imported.
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

describe("profile + data management", () => {
  it("renames the profile", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setProfileName("Natasha");
    expect(useHub.getState().profile.name).toBe("Natasha");
  });

  it("completes onboarding with a name", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().completeOnboarding("Alex");
    expect(useHub.getState().profile.name).toBe("Alex");
    expect(useHub.getState().profile.onboarded).toBe(true);
  });

  it("round-trips through export → import", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setProfileName("Backup Test");
    useHub.getState().addPantryItem("Test Ingredient", "pantry");
    const snapshot = useHub.getState().exportData();

    // mutate away from the snapshot
    useHub.getState().setProfileName("Different");
    expect(useHub.getState().profile.name).toBe("Different");

    // restore
    expect(useHub.getState().importData(snapshot)).toBe(true);
    expect(useHub.getState().profile.name).toBe("Backup Test");
    expect(useHub.getState().pantry.some((p) => p.name === "Test Ingredient")).toBe(true);
  });

  it("rejects invalid import payloads", async () => {
    const { useHub } = await import("../store/hub");
    expect(useHub.getState().importData("not json")).toBe(false);
    expect(useHub.getState().importData('{"nope":true}')).toBe(false);
  });

  it("resets to seed while keeping the profile", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().completeOnboarding("Keeper");
    useHub.getState().addPantryItem("Ephemeral", "pantry");
    useHub.getState().resetToSeed();
    expect(useHub.getState().profile.name).toBe("Keeper");
    expect(useHub.getState().pantry.some((p) => p.name === "Ephemeral")).toBe(false);
    expect(useHub.getState().courses.length).toBeGreaterThan(0); // fresh seed present
  });

  it("edits role tags", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setRoles([" Mom ", "Student", "", "Runner"]);
    expect(useHub.getState().profile.roles).toEqual(["Mom", "Student", "Runner"]);
  });
});

describe("persist merge (older stored blobs)", () => {
  it("backfills fields added after a slice was first persisted", async () => {
    const { useHub } = await import("../store/hub");
    // Simulate localStorage written by an older build: a profile that predates
    // the `roles` field, and no wellness slices at all.
    const persistedState = { profile: { name: "Legacy User", onboarded: true } };
    // @ts-expect-error merge is defined in the persist options
    const merged = useHub.persist.getOptions().merge(persistedState, useHub.getState());
    expect(merged.profile.name).toBe("Legacy User");
    expect(merged.profile.onboarded).toBe(true);
    // The crashing field — must be defined, never undefined.
    expect(Array.isArray(merged.profile.roles)).toBe(true);
    // Wellness slices added later are backfilled from seed/defaults.
    expect(Array.isArray(merged.habits)).toBe(true);
    expect(typeof merged.water).toBe("object");
    expect(typeof merged.waterGoal).toBe("number");
  });
});

describe("wellness", () => {
  it("toggles a habit for today and back", async () => {
    const { useHub } = await import("../store/hub");
    const habit = useHub.getState().habits[0]!;
    const before = habit.history.length;
    useHub.getState().toggleHabitToday(habit.id);
    const after = useHub.getState().habits.find((h) => h.id === habit.id)!;
    // seed history includes today, so first toggle removes it
    expect(after.history.length).toBe(before - 1);
    useHub.getState().toggleHabitToday(habit.id);
    expect(useHub.getState().habits.find((h) => h.id === habit.id)!.history.length).toBe(before);
  });

  it("adds and removes a custom habit", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().addHabit("Stretch", "🤸");
    const added = useHub.getState().habits.find((h) => h.name === "Stretch");
    expect(added?.icon).toBe("🤸");
    useHub.getState().removeHabit(added!.id);
    expect(useHub.getState().habits.some((h) => h.name === "Stretch")).toBe(false);
  });

  it("logs water without going negative", async () => {
    const { useHub } = await import("../store/hub");
    const { todayISO } = await import("../dates");
    useHub.getState().logWater(3);
    expect(useHub.getState().water[todayISO()]).toBe(3);
    useHub.getState().logWater(-10);
    expect(useHub.getState().water[todayISO()]).toBe(0);
  });
});
