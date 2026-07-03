"use client";

import { encouragementForToday } from "@/core/selectors";

/** Gentle daily encouragement — the "progress, not perfection" footer note. */
export function MotivationBanner() {
  return (
    <div className="card flex items-center justify-between gap-4 overflow-hidden px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          🌿
        </span>
        <div>
          <p className="font-display text-base tracking-tight">{encouragementForToday()}</p>
          <p className="text-xs text-muted">A little each day adds up to a lot.</p>
        </div>
      </div>
      <span className="text-xl text-accent" aria-hidden>
        ♥
      </span>
    </div>
  );
}
