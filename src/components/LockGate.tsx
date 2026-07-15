"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isLockSet, isUnlocked, lockHint, verifyPasscode } from "@/lib/lock";

/**
 * Gates the whole app behind the device passcode. Until unlocked, children are
 * never rendered — so nobody who picks up the device sees the data. When no
 * passcode is set, it's a transparent pass-through.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocked(isLockSet() && !isUnlocked());
    setReady(true);
  }, []);

  async function submit() {
    if (!code || busy) return;
    setBusy(true);
    setError("");
    const ok = await verifyPasscode(code);
    setBusy(false);
    if (ok) {
      setCode("");
      setLocked(false);
    } else {
      setError("That passcode didn't match. Try again.");
      setCode("");
    }
  }

  // Avoid a flash of app content before we know the lock state.
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <span className="font-display text-2xl tracking-tight text-muted">Vela ✦</span>
      </div>
    );
  }

  if (!locked) return <>{children}</>;

  const hint = lockHint();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="card w-full max-w-sm p-6 text-center"
      >
        <p className="mb-1 text-4xl" aria-hidden>🔒</p>
        <h1 className="font-display text-2xl tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Enter your passcode to unlock Vela on this device.</p>

        <input
          autoFocus
          type="password"
          inputMode="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Passcode"
          aria-label="Passcode"
          className="input mt-4 text-center text-lg tracking-widest"
        />

        <button type="submit" disabled={!code || busy} className="btn-primary mt-3 w-full">
          {busy ? "Checking…" : "Unlock"}
        </button>

        {error ? <p className="mt-2 text-xs text-fitness-bright">{error}</p> : null}
        {hint ? <p className="mt-3 text-[11px] text-muted">Hint: {hint}</p> : null}
        <p className="mt-4 text-[11px] text-muted/70">
          Your passcode never leaves this device. Vela can&apos;t recover it — if you forget it,
          you&apos;ll need to reset the app.
        </p>
      </form>
    </div>
  );
}
