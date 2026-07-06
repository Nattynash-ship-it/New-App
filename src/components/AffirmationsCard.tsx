"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { todayISO } from "@/core/dates";
import {
  AFFIRMATION_THEMES,
  affirmationSessionUrl,
  dailyAffirmation,
} from "@/core/data/affirmations";

/**
 * Daily affirmation + a quick rotation of themed 10-minute sessions (beauty,
 * success, health, wealth, good grades, confidence). Tap a theme to read its
 * lines and open a guided 10-minute session.
 */
export function AffirmationsCard() {
  const today = todayISO();
  const daily = dailyAffirmation(today);

  // Start focused on the theme today's affirmation came from.
  const [themeId, setThemeId] = useState(daily.theme.id);
  const [lineIdx, setLineIdx] = useState(0);
  const theme = AFFIRMATION_THEMES.find((t) => t.id === themeId) ?? daily.theme;
  const line = theme.lines[lineIdx % theme.lines.length]!;

  function selectTheme(id: string) {
    setThemeId(id);
    setLineIdx(0);
  }

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-accent" aria-hidden />
      <SectionTitle right={<span className="text-xs text-muted">daily · tap a theme</span>}>
        Affirmations
      </SectionTitle>

      {/* Today's affirmation */}
      <div className={`rounded-xl ${theme.soft} px-4 py-4`}>
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span aria-hidden>{theme.icon}</span>
          {themeId === daily.theme.id && lineIdx === 0 ? "Today's affirmation" : theme.label}
        </p>
        <p className={`font-display text-lg leading-snug ${theme.text}`}>“{line}”</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setLineIdx((i) => i + 1)}
            className="btn-ghost !px-3 !py-1.5 text-xs"
          >
            ↻ Another
          </button>
          <a
            href={affirmationSessionUrl(theme.label)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary !px-3 !py-1.5 text-xs"
            title={`Open a guided 10-minute ${theme.label.toLowerCase()} affirmation session`}
          >
            ▶ Play 10-min {theme.label.toLowerCase()} session
          </a>
        </div>
      </div>

      {/* Theme rotation */}
      <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Switch the theme
      </p>
      <div className="flex flex-wrap gap-1.5">
        {AFFIRMATION_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTheme(t.id)}
            aria-pressed={t.id === themeId}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              t.id === themeId ? `border-transparent ${t.soft} ${t.text}` : "border-line text-muted hover:border-ink/25"
            }`}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
