"use client";

import { useState, type ReactNode } from "react";

/**
 * A tap-to-expand section. Progressive disclosure: the home page leads with
 * what you need at a glance and tucks the rest behind these, so the day reads
 * calm instead of as a wall of cards. Everything is still one tap away.
 */
export function Collapsible({
  title,
  hint,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  icon?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface/70 px-4 py-3 text-left transition-colors hover:border-ink/20"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {icon ? <span className="text-base" aria-hidden>{icon}</span> : null}
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{title}</span>
            {hint ? <span className="block truncate text-[11px] text-muted">{hint}</span> : null}
          </span>
        </span>
        <span
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ›
        </span>
      </button>
      {open ? <div className="animate-slide-in mt-3 space-y-4">{children}</div> : null}
    </section>
  );
}
