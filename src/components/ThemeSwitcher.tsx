"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from "@/core/themes";

function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // private-mode storage failures are fine — theme just won't persist
  }
}

/** Four built-in themes, switchable live. Persisted per device. */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(DEFAULT_THEME);

  useEffect(() => {
    setActive(document.documentElement.dataset.theme ?? DEFAULT_THEME);
  }, []);

  return (
    <div
      className={compact ? "flex items-center gap-1.5" : "flex flex-wrap items-center gap-2"}
      role="radiogroup"
      aria-label="App theme"
    >
      {THEMES.map((t) => (
        <button
          key={t.id}
          role="radio"
          aria-checked={active === t.id}
          title={t.label}
          onClick={() => {
            applyTheme(t.id);
            setActive(t.id);
          }}
          className={`group flex items-center gap-1.5 rounded-full border p-1 transition-all ${
            active === t.id ? "border-accent" : "border-line hover:border-ink/30"
          } ${compact ? "" : "pr-2.5"}`}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full border border-black/10"
            style={{ backgroundColor: t.bg }}
            aria-hidden
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.accent }} />
          </span>
          {compact ? null : (
            <span className={`text-[11px] ${active === t.id ? "font-semibold" : "text-muted"}`}>
              {t.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
