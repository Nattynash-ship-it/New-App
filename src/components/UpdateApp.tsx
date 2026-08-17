"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";

/**
 * Forces the installed PWA to pick up the newest deploy: revalidates the
 * service worker, activates any waiting version, clears the old caches, and
 * reloads. This is the reliable "why am I not seeing the update?" escape hatch
 * for an installed home-screen app.
 */
export function UpdateApp() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function update() {
    setBusy(true);
    setStatus("Checking for the newest version…");
    try {
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        // No service worker (e.g. dev / unsupported) — a plain hard reload is
        // the best we can do.
        window.location.reload();
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update().catch(() => {});
        // Activate a freshly-installed worker if one is waiting.
        reg.waiting?.postMessage("SKIP_WAITING");
        // Wipe cached assets so the reload pulls everything fresh.
        (reg.active ?? reg.waiting)?.postMessage("CLEAR_CACHES");
      }
      setStatus("Updating — reloading now…");
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setStatus("Couldn't reach the network — try again when you're online.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle>App version</SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Vela installs like an app and updates itself in the background. If something looks stale or
        you just want the latest, grab it now.
      </p>
      <button className="btn-primary text-sm" onClick={() => void update()} disabled={busy}>
        {busy ? "Updating…" : "↻ Update to the newest version"}
      </button>
      {status ? <p className="mt-2 text-xs text-accent">{status}</p> : null}
    </Card>
  );
}
