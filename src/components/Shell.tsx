"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Onboarding } from "./Onboarding";

const NAV = [
  { href: "/", label: "Today", icon: "✦" },
  { href: "/work", label: "Work", icon: "▤" },
  { href: "/school", label: "School", icon: "✎" },
  { href: "/meals", label: "Meals", icon: "❋" },
  { href: "/fitness", label: "Fitness", icon: "◮" },
  { href: "/family", label: "Family", icon: "☖" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh md:flex">
      <Onboarding />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-line md:bg-surface/60 md:px-4 md:py-8 md:sticky md:top-0 md:h-dvh">
        <Link href="/" className="group px-3">
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl tracking-tight">Vela</span>
            <span className="text-accent transition-transform duration-300 group-hover:rotate-45" aria-hidden>
              ✦
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] uppercase tracking-[0.18em] text-muted">
            Your life, under sail
          </span>
        </Link>
        <nav className="mt-8 space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-accent-soft text-accent font-medium"
                    : "text-muted hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 px-3">
          <ThemeSwitcher />
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-0 py-1 text-sm transition-colors ${
              pathname.startsWith("/settings") ? "text-accent font-medium" : "text-muted hover:text-ink"
            }`}
          >
            <span className="text-base leading-none">⚙</span> Settings
          </Link>
          <p className="text-[11px] leading-relaxed text-muted/70">
            Vela keeps the whole day on course — so you don&apos;t have to hold it in your head.
          </p>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 pb-24 md:pb-12">
        {/* Mobile top bar: wordmark + theme switcher */}
        <div className="flex items-center justify-between border-b border-line bg-surface/80 px-4 py-2.5 backdrop-blur md:hidden">
          <span className="font-display text-base tracking-tight">
            Vela <span className="text-accent">✦</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <Link href="/settings" aria-label="Settings" className="text-lg text-muted">
              ⚙
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-4 pt-6 md:px-8 md:pt-10">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md justify-between px-4 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] ${
                  active ? "text-accent font-semibold" : "text-muted"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
