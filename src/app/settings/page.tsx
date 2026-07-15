"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useHub, useHydrated } from "@/core/store/hub";
import {
  clearPasscode,
  isLockSet,
  lock,
  lockSupported,
  setPasscode,
  verifyPasscode,
} from "@/lib/lock";

function ProfileCard() {
  const name = useHub((s) => s.profile.name);
  const setProfileName = useHub((s) => s.setProfileName);
  const [draft, setDraft] = useState(name);
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <SectionTitle>Your profile</SectionTitle>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setProfileName(draft);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Display name
          </label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input"
            maxLength={40}
            placeholder="Your name"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={!draft.trim() || draft === name}>
          {saved ? "Saved ✓" : "Save"}
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">This is the name Vela greets you with each day.</p>
    </Card>
  );
}

function AppearanceCard() {
  return (
    <Card>
      <SectionTitle>Appearance</SectionTitle>
      <p className="mb-3 text-xs text-muted">
        Pick a look — light and playful or a calm dark. Remembered on this device.
      </p>
      <ThemeSwitcher />
    </Card>
  );
}

function DataCard() {
  const exportData = useHub((s) => s.exportData);
  const importData = useHub((s) => s.importData);
  const resetToSeed = useHub((s) => s.resetToSeed);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  function download() {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vela-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded.");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setStatus(importData(text) ? "Backup restored ✓" : "That file wasn't a valid Vela backup.");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card>
      <SectionTitle>Your data</SectionTitle>
      <p className="mb-3 text-xs text-muted">
        Everything lives on this device. Back it up, move it to another device, or start fresh.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={download}>
          ↓ Export backup
        </button>
        <button className="btn-ghost text-xs" onClick={() => fileRef.current?.click()}>
          ↑ Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json" onChange={onFile} className="hidden" />
        {confirmReset ? (
          <span className="flex items-center gap-1.5">
            <button
              className="btn text-xs !bg-fitness !text-white"
              onClick={() => {
                resetToSeed();
                setConfirmReset(false);
                setStatus("Reset to a fresh start.");
              }}
            >
              Confirm reset
            </button>
            <button className="btn-ghost text-xs" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button
            className="btn-ghost text-xs !text-fitness-bright hover:!border-fitness"
            onClick={() => setConfirmReset(true)}
          >
            ⟲ Reset all data
          </button>
        )}
      </div>
      {status ? <p className="mt-2 text-xs text-accent">{status}</p> : null}
    </Card>
  );
}

function PasscodeCard() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState("");
  const [removing, setRemoving] = useState(false);

  // Read lock state on the client only.
  useEffect(() => {
    setEnabled(isLockSet());
    setMounted(true);
  }, []);

  const supported = mounted ? lockSupported() : true;

  async function save() {
    setStatus("");
    if (pass.length < 4) {
      setStatus("Use at least 4 characters.");
      return;
    }
    if (pass !== confirm) {
      setStatus("The two passcodes don't match.");
      return;
    }
    if (enabled) {
      const ok = await verifyPasscode(current);
      if (!ok) {
        setStatus("Your current passcode is wrong.");
        return;
      }
    }
    await setPasscode(pass, hint);
    setEnabled(true);
    setEditing(false);
    setCurrent("");
    setPass("");
    setConfirm("");
    setHint("");
    setStatus("Passcode saved ✓");
    setTimeout(() => setStatus(""), 3000);
  }

  async function remove() {
    setStatus("");
    const ok = await verifyPasscode(current);
    if (!ok) {
      setStatus("Enter your current passcode to remove the lock.");
      return;
    }
    clearPasscode();
    setEnabled(false);
    setRemoving(false);
    setCurrent("");
    setStatus("Passcode removed.");
    setTimeout(() => setStatus(""), 3000);
  }

  return (
    <Card>
      <SectionTitle
        right={
          mounted ? (
            <span className={`chip ${enabled ? "bg-meals-soft text-meals-bright" : "border border-line text-muted"}`}>
              {enabled ? "● On" : "Off"}
            </span>
          ) : undefined
        }
      >
        Passcode lock
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Require a passcode to open Vela on this device — so your family, school, and health details
        stay private if someone else picks up your phone. It stays on this device (no cloud); Vela
        can&apos;t recover it if you forget it.
      </p>

      {!supported ? (
        <p className="text-xs text-fitness-bright">
          This browser can&apos;t secure a passcode (needs a secure https context).
        </p>
      ) : !editing && !removing ? (
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary text-xs" onClick={() => setEditing(true)}>
            {enabled ? "Change passcode" : "Set a passcode"}
          </button>
          {enabled ? (
            <>
              <button className="btn-ghost text-xs" onClick={() => lock()}>
                🔒 Lock now
              </button>
              <button
                className="btn-ghost text-xs !text-fitness-bright hover:!border-fitness"
                onClick={() => setRemoving(true)}
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-2">
          {enabled ? (
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Current passcode"
              className="input text-sm"
            />
          ) : null}
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="New passcode (min 4 characters)"
            className="input text-sm"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm passcode"
            className="input text-sm"
          />
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Optional hint (shown on the lock screen)"
            className="input text-sm"
            maxLength={60}
          />
          <div className="flex gap-2">
            <button className="btn-primary text-xs" onClick={() => void save()}>
              Save passcode
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setEditing(false);
                setStatus("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {removing ? (
        <div className="space-y-2">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current passcode"
            className="input text-sm"
          />
          <div className="flex gap-2">
            <button className="btn text-xs !bg-fitness !text-white" onClick={() => void remove()}>
              Remove lock
            </button>
            <button className="btn-ghost text-xs" onClick={() => setRemoving(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {status ? <p className="mt-2 text-xs text-accent">{status}</p> : null}
    </Card>
  );
}

function ConnectionsCard() {
  return (
    <Card>
      <SectionTitle>Connections</SectionTitle>
      <p className="mb-3 text-xs text-muted">
        Send grocery lists to Whole Foods, Aldi, or Instacart, and link your Gmail, Outlook, or
        school email so nothing slips.
      </p>
      <Link href="/connections" className="btn-primary text-sm">
        Manage connections →
      </Link>
    </Card>
  );
}

function AboutCard() {
  return (
    <Card>
      <SectionTitle>About Vela</SectionTitle>
      <p className="text-sm text-muted">
        <span className="text-accent">✦</span> Vela — your life, under sail. One calm place for
        work, school, meals, fitness, and family, built to lower the mental load of holding it all
        in your head.
      </p>
      <p className="mt-2 text-xs text-muted">
        Version 1.0 · runs fully offline · optional passcode lock, no cloud account.
      </p>
    </Card>
  );
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Make Vela yours"
        subtitle="Your name, your palette, your data — all in your hands."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileCard />
        <AppearanceCard />
      </div>
      <PasscodeCard />
      <ConnectionsCard />
      <DataCard />
      <AboutCard />
    </div>
  );
}
