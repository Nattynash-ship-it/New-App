"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useHub, useHydrated } from "@/core/store/hub";

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
      <p className="mt-2 text-xs text-muted">Version 1.0 · runs fully offline, no account needed.</p>
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
      <ConnectionsCard />
      <DataCard />
      <AboutCard />
    </div>
  );
}
