"use client";

import { useEffect, useRef } from "react";
import { useHub } from "@/core/store/hub";
import { getGhConfig, pullState, pushState, setGhConfig } from "@/lib/githubSync";

/**
 * Runs GitHub auto-sync in the background when connected: pulls the latest once
 * on open, then backs up (debounced) after you change anything. Comparing the
 * exported snapshot to the last synced one prevents a pull from bouncing
 * straight back as a push. Last write wins across your devices.
 */
export function SyncManager() {
  const exportData = useHub((s) => s.exportData);
  const importData = useHub((s) => s.importData);
  const applied = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    // 1) Pull the latest on open.
    (async () => {
      const cfg = getGhConfig();
      if (!cfg || !cfg.auto) {
        applied.current = exportData();
        return;
      }
      try {
        const remote = await pullState(cfg.token, cfg.gistId);
        if (cancelled) return;
        if (remote?.state && remote.updatedAt !== cfg.lastSyncedAt) {
          importData(remote.state);
          setGhConfig({ ...cfg, lastSyncedAt: remote.updatedAt });
        }
      } catch {
        /* offline / token issue — the Settings card surfaces problems */
      } finally {
        // Whatever we ended up with is now our baseline; don't re-push it.
        applied.current = exportData();
      }
    })();

    // 2) Back up (debounced) whenever the store changes.
    const unsub = useHub.subscribe(() => {
      const cfg = getGhConfig();
      if (!cfg || !cfg.auto) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const current = exportData();
        if (current === applied.current) return; // nothing new
        try {
          const updatedAt = await pushState(cfg.token, cfg.gistId, current);
          applied.current = current;
          const latest = getGhConfig();
          if (latest) setGhConfig({ ...latest, lastSyncedAt: updatedAt });
        } catch {
          /* will retry on the next change */
        }
      }, 4000);
    });

    return () => {
      cancelled = true;
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
