"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import {
  clearGhConfig,
  findOrCreateGist,
  getGhConfig,
  pullState,
  pushState,
  setGhConfig,
  validateToken,
  type GhConfig,
} from "@/lib/githubSync";

function whenLabel(iso?: string): string {
  if (!iso) return "not yet";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Connect GitHub to sync Vela across devices. Setup is one-time on a computer
 * (paste a token); after that every device with the same token shares one
 * private gist. Backing up and restoring are also here for a manual push/pull.
 */
export function GitHubSync() {
  const exportData = useHub((s) => s.exportData);
  const importData = useHub((s) => s.importData);
  const [cfg, setCfg] = useState<GhConfig | null>(null);
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"" | "connect" | "push" | "pull">("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCfg(getGhConfig());
    setMounted(true);
  }, []);

  async function connect() {
    const t = token.trim();
    if (!t) return;
    setBusy("connect");
    setError(null);
    setStatus(null);
    try {
      const login = await validateToken(t);
      const gistId = await findOrCreateGist(t);
      const updatedAt = await pushState(t, gistId, exportData());
      const next: GhConfig = { token: t, gistId, login, auto: true, lastSyncedAt: updatedAt };
      setGhConfig(next);
      setCfg(next);
      setToken("");
      setStatus(`Connected as ${login} — your data is backed up and syncing.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect to GitHub.");
    } finally {
      setBusy("");
    }
  }

  async function syncNow() {
    if (!cfg) return;
    setBusy("push");
    setError(null);
    setStatus(null);
    try {
      const updatedAt = await pushState(cfg.token, cfg.gistId, exportData());
      const next = { ...cfg, lastSyncedAt: updatedAt };
      setGhConfig(next);
      setCfg(next);
      setStatus("Backed up to GitHub ✓");
      setTimeout(() => setStatus(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBusy("");
    }
  }

  async function pullNow() {
    if (!cfg) return;
    setBusy("pull");
    setError(null);
    setStatus(null);
    try {
      const remote = await pullState(cfg.token, cfg.gistId);
      if (!remote?.state) {
        setStatus("Nothing on GitHub yet — back up from a device first.");
      } else if (importData(remote.state)) {
        const next = { ...cfg, lastSyncedAt: remote.updatedAt };
        setGhConfig(next);
        setCfg(next);
        setStatus("Restored the latest from GitHub ✓");
      } else {
        setError("The synced data couldn't be read.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setBusy("");
    }
  }

  function toggleAuto() {
    if (!cfg) return;
    const next = { ...cfg, auto: !cfg.auto };
    setGhConfig(next);
    setCfg(next);
  }

  function disconnect() {
    clearGhConfig();
    setCfg(null);
    setStatus("Disconnected. Your data stays on this device; GitHub keeps its last copy.");
  }

  return (
    <Card>
      <SectionTitle right={mounted && cfg ? <span className="chip bg-meals-soft text-meals-bright">● Syncing</span> : undefined}>
        Sync across devices
      </SectionTitle>

      {!mounted ? null : !cfg ? (
        <>
          <p className="mb-3 text-xs text-muted">
            Keep Vela in sync on your phone, tablet, and laptop through your own private GitHub gist —
            no account or server. <span className="font-medium text-ink">Do this once on a computer.</span>
          </p>
          <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-muted">
            <li>
              On GitHub, create a token with the <span className="font-mono">gist</span> scope:{" "}
              <a href="https://github.com/settings/tokens/new?scopes=gist&description=Vela%20sync" target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                open the token page ↗
              </a>
            </li>
            <li>Paste it below and press Connect.</li>
            <li>On your other devices, come here and paste the same token.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="GitHub token (gist scope)"
              className="input min-w-[180px] flex-1 text-sm"
              aria-label="GitHub personal access token"
            />
            <button onClick={connect} disabled={busy === "connect" || !token.trim()} className="btn-primary text-sm">
              {busy === "connect" ? "Connecting…" : "Connect"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted/70">
            The token is stored only on this device and never included in your synced data.
          </p>
        </>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            Synced as <span className="font-medium text-ink">{cfg.login}</span> ·{" "}
            <a href={`https://gist.github.com/${cfg.gistId}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              your private gist ↗
            </a>{" "}
            · last synced {whenLabel(cfg.lastSyncedAt)}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={syncNow} disabled={busy !== ""} className="btn-primary text-xs">
              {busy === "push" ? "Backing up…" : "↑ Back up now"}
            </button>
            <button onClick={pullNow} disabled={busy !== ""} className="btn-ghost text-xs">
              {busy === "pull" ? "Restoring…" : "↓ Get latest"}
            </button>
            <button onClick={toggleAuto} className="btn-ghost text-xs">
              {cfg.auto ? "⏸ Pause auto-sync" : "▶ Resume auto-sync"}
            </button>
            <button onClick={disconnect} className="btn-ghost text-xs !text-fitness-bright hover:!border-fitness">
              Disconnect
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {cfg.auto
              ? "Auto-sync is on: Vela pulls the latest when you open it and backs up shortly after changes."
              : "Auto-sync is paused — use Back up / Get latest to sync manually."}
          </p>
        </>
      )}

      {status ? <p className="mt-2 text-xs text-meals-bright">{status}</p> : null}
      {error ? <p className="mt-2 text-xs text-fitness-bright">{error}</p> : null}
    </Card>
  );
}
