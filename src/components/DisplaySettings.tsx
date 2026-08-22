"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "./ui";
import {
  DEFAULT_FONT,
  DEFAULT_TEXT_SIZE,
  FONTS,
  FONT_STORAGE_KEY,
  TEXT_SIZES,
  TEXT_SIZE_STORAGE_KEY,
  fontStack,
  textScale,
} from "@/core/fonts";

function applyTextSize(id: string) {
  document.documentElement.style.setProperty("--font-scale", String(textScale(id)));
  try {
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, id);
  } catch {
    /* private mode — preference just won't persist */
  }
}

function applyFont(id: string) {
  const stack = fontStack(id);
  if (stack) document.documentElement.style.setProperty("--font-body-override", stack);
  else document.documentElement.style.removeProperty("--font-body-override");
  try {
    localStorage.setItem(FONT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Text size + font family — larger, more readable type on request. */
export function DisplaySettings() {
  const [size, setSize] = useState(DEFAULT_TEXT_SIZE);
  const [font, setFont] = useState(DEFAULT_FONT);

  useEffect(() => {
    try {
      setSize(localStorage.getItem(TEXT_SIZE_STORAGE_KEY) ?? DEFAULT_TEXT_SIZE);
      setFont(localStorage.getItem(FONT_STORAGE_KEY) ?? DEFAULT_FONT);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Card>
      <SectionTitle>Display</SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Make the type bigger and pick a font that reads best for you. Saved on this device.
      </p>

      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Text size</p>
      <div className="flex flex-wrap gap-2">
        {TEXT_SIZES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              applyTextSize(t.id);
              setSize(t.id);
            }}
            aria-pressed={size === t.id}
            className={`rounded-xl border px-3 py-2 transition-colors ${
              size === t.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-ink/25"
            }`}
            style={{ fontSize: `${t.scale}rem` }}
          >
            Aa <span className="ml-1 align-middle text-[11px]">{t.label}</span>
          </button>
        ))}
      </div>

      <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Font</p>
      <div className="flex flex-wrap gap-2">
        {FONTS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              applyFont(f.id);
              setFont(f.id);
            }}
            aria-pressed={font === f.id}
            className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
              font === f.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-ink/25"
            }`}
            style={{ fontFamily: f.stack || undefined }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
