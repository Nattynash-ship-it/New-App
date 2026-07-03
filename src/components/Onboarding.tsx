"use client";

import { useState } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useHub, useHydrated } from "@/core/store/hub";

/**
 * First-run welcome. Captures the one thing that personalizes everything —
 * your name — and lets you pick a theme, then gets out of the way. Shown only
 * until onboarding is complete.
 */
export function Onboarding() {
  const hydrated = useHydrated();
  const onboarded = useHub((s) => s.profile.onboarded);
  const completeOnboarding = useHub((s) => s.completeOnboarding);
  const [name, setName] = useState("");

  if (!hydrated || onboarded) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-paper/95 px-5 backdrop-blur">
      <div className="animate-page w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl text-accent-ink shadow-lift">
            ✦
          </div>
          <h1 className="font-display text-3xl tracking-tight">Welcome to Vela</h1>
          <p className="mt-1.5 text-sm text-muted">
            Your whole life — work, school, meals, fitness, family — on one calm deck.
          </p>
        </div>

        <form
          className="card space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            completeOnboarding(name);
          }}
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              What should Vela call you?
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="input"
              maxLength={40}
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              Pick a look (change it anytime)
            </p>
            <ThemeSwitcher />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
            Set sail →
          </button>
          <button
            type="button"
            onClick={() => completeOnboarding("friend")}
            className="w-full text-center text-xs text-muted hover:text-ink"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
