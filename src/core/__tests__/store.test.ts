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
    expect(useHub.getState().profile).toEqual({ name: "Alex", onboarded: true });
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
});
