"use client";

import type { ReactNode } from "react";
import type { Domain } from "@/core/types";

export const DOMAIN_STYLES: Record<Domain, { text: string; soft: string; dot: string; label: string }> = {
  compass: { text: "text-compass-bright", soft: "bg-compass-soft", dot: "bg-compass", label: "General" },
  work: { text: "text-work-bright", soft: "bg-work-soft", dot: "bg-work", label: "Work" },
  school: { text: "text-school-bright", soft: "bg-school-soft", dot: "bg-school", label: "School" },
  meals: { text: "text-meals-bright", soft: "bg-meals-soft", dot: "bg-meals", label: "Meals" },
  fitness: { text: "text-fitness-bright", soft: "bg-fitness-soft", dot: "bg-fitness", label: "Fitness" },
  family: { text: "text-family-bright", soft: "bg-family-soft", dot: "bg-family", label: "Family" },
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-tight">{children}</h2>
      {right}
    </div>
  );
}

export function ProgressBar({ pct, colorClass = "bg-accent" }: { pct: number; colorClass?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  sub,
  strike = true,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sub?: string;
  /** Strike through when checked (tasks). Disable for state toggles like "on hand". */
  strike?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      className="group flex w-full items-start gap-3 rounded-lg px-1.5 py-1.5 text-left hover:bg-ink/[0.03]"
    >
      <span
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked ? "border-accent bg-accent text-accent-ink" : "border-ink/25 bg-surface group-hover:border-accent"
        }`}
      >
        {checked ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm ${checked && strike ? "text-muted line-through" : ""}`}>
          {label}
        </span>
        {sub ? <span className="block text-xs text-muted">{sub}</span> : null}
      </span>
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-ink/[0.06]" />
      <div className="h-40 animate-pulse rounded-card bg-ink/[0.05]" />
      <div className="h-40 animate-pulse rounded-card bg-ink/[0.04]" />
    </div>
  );
}
