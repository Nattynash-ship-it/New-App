import { describe, expect, it, beforeEach, vi } from "vitest";
import { pack, unpack, GIST_FILE, GIST_DESC } from "../../lib/githubSync";

describe("github sync pack/unpack", () => {
  it("round-trips the exported state with a timestamp", () => {
    const state = JSON.stringify({ hello: "world" });
    const content = pack(state);
    const back = unpack(content);
    expect(back).not.toBeNull();
    expect(back!.state).toBe(state);
    expect(back!.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles an empty gist and bad content", () => {
    const empty = unpack(pack(null));
    expect(empty!.state).toBeNull();
    expect(unpack("not json")).toBeNull();
    expect(unpack("{}")).toBeNull(); // no updatedAt
  });

  it("uses stable file + description constants", () => {
    expect(GIST_FILE).toBe("vela-data.json");
    expect(GIST_DESC).toMatch(/Vela sync/);
  });
});

describe("github sync config storage", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
  });

  it("saves, reads, and clears the token config (kept out of the data store)", async () => {
    const { getGhConfig, setGhConfig, clearGhConfig } = await import("../../lib/githubSync");
    expect(getGhConfig()).toBeNull();
    setGhConfig({ token: "t", gistId: "g", login: "me", auto: true, lastSyncedAt: "2026-08-27T00:00:00Z" });
    const cfg = getGhConfig();
    expect(cfg?.login).toBe("me");
    expect(cfg?.auto).toBe(true);
    clearGhConfig();
    expect(getGhConfig()).toBeNull();
  });
});
