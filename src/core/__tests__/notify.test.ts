import { afterEach, describe, expect, it, vi } from "vitest";

/** Build a fake browser environment, then import the module fresh. */
async function loadNotify(opts: {
  hasNotification?: boolean;
  permission?: string;
  ua?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayModeStandalone?: boolean;
  serviceWorker?: { showNotification: (t: string, o?: unknown) => void } | null;
}) {
  const {
    hasNotification = true,
    permission = "granted",
    ua = "Mozilla/5.0 (Macintosh)",
    maxTouchPoints = 0,
    standalone = false,
    displayModeStandalone = false,
    serviceWorker = null,
  } = opts;

  const ctor = function () {} as unknown as { permission: string; requestPermission: () => Promise<string> };
  ctor.permission = permission;
  ctor.requestPermission = async () => permission;

  const win: Record<string, unknown> = {
    matchMedia: () => ({ matches: displayModeStandalone }),
  };
  if (hasNotification) win.Notification = ctor;

  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {});
  vi.stubGlobal("Notification", hasNotification ? ctor : undefined);
  vi.stubGlobal("navigator", {
    userAgent: ua,
    maxTouchPoints,
    standalone,
    ...(serviceWorker ? { serviceWorker: { ready: Promise.resolve(serviceWorker) } } : {}),
  });

  vi.resetModules();
  return await import("../../lib/notify");
}

afterEach(() => vi.unstubAllGlobals());

describe("notification support detection", () => {
  it("reports unsupported when the API is missing", async () => {
    const n = await loadNotify({ hasNotification: false });
    expect(n.notificationsSupported()).toBe(false);
    expect(n.notifyPermission()).toBe("unsupported");
  });

  it("detects iPadOS, which masquerades as a Mac", async () => {
    const n = await loadNotify({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", maxTouchPoints: 5 });
    expect(n.isIOS()).toBe(true);
  });

  it("does not mistake a real Mac for iOS", async () => {
    const n = await loadNotify({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", maxTouchPoints: 0 });
    expect(n.isIOS()).toBe(false);
  });

  it("detects an installed (standalone) app", async () => {
    expect((await loadNotify({ standalone: true })).isInstalled()).toBe(true);
    expect((await loadNotify({ displayModeStandalone: true })).isInstalled()).toBe(true);
    expect((await loadNotify({})).isInstalled()).toBe(false);
  });
});

describe("notifyBlocker explains the real reason", () => {
  it("tells iPhone/iPad users to add Vela to the Home Screen", async () => {
    const n = await loadNotify({
      hasNotification: false,
      ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      maxTouchPoints: 5,
    });
    expect(n.notifyBlocker()).toMatch(/Home Screen/i);
  });

  it("reports a plain unsupported browser differently", async () => {
    const n = await loadNotify({ hasNotification: false, ua: "Mozilla/5.0 (Windows NT 10.0)" });
    expect(n.notifyBlocker()).toMatch(/doesn't support/i);
  });

  it("flags blocked permission", async () => {
    const n = await loadNotify({ permission: "denied" });
    expect(n.notifyBlocker()).toMatch(/blocked/i);
  });

  it("returns null when everything is fine", async () => {
    const n = await loadNotify({ permission: "granted" });
    expect(n.notifyBlocker()).toBeNull();
  });
});

describe("showNotification uses the service worker (required on iOS)", () => {
  it("prefers registration.showNotification over the constructor", async () => {
    const calls: string[] = [];
    const n = await loadNotify({
      permission: "granted",
      serviceWorker: { showNotification: (t: string) => void calls.push(t) },
    });
    expect(await n.showNotification("Starting now", { body: "Yoga" })).toBe(true);
    expect(calls).toEqual(["Starting now"]);
  });

  it("refuses to show anything without permission", async () => {
    const n = await loadNotify({
      permission: "default",
      serviceWorker: { showNotification: () => {} },
    });
    expect(await n.showNotification("Nope")).toBe(false);
  });
});
