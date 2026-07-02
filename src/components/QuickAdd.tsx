"use client";

import { useState } from "react";
import { parseQuickAdd } from "@/core/nlp/parser";
import { useHub } from "@/core/store/hub";
import { formatFriendly, formatTime } from "@/core/dates";
import type { ParsedIntent } from "@/core/types";
import { DOMAIN_STYLES } from "./ui";

const KIND_TO_DOMAIN = {
  meeting: "work",
  assignment: "school",
  family_activity: "family",
  meal: "meals",
  workout: "fitness",
  event: "compass",
} as const;

/**
 * Zero-friction natural-language capture:
 * "Add a meeting tomorrow at 2 PM for policy review" → parsed instantly
 * on-device; ambiguous phrases are refined by the AI parse route.
 */
export function QuickAdd() {
  const addFromIntent = useHub((s) => s.addFromIntent);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<ParsedIntent | null>(null);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      let intent = parseQuickAdd(trimmed);
      if (intent.confidence < 0.75) {
        try {
          const res = await fetch("/api/ai/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: trimmed }),
          });
          if (res.ok) {
            const data = (await res.json()) as { intent: ParsedIntent };
            intent = data.intent;
          }
        } catch {
          // network hiccup — the on-device parse already gave a usable result
        }
      }
      addFromIntent(intent);
      setConfirmation(intent);
      setText("");
      setTimeout(() => setConfirmation(null), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-2.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex items-center gap-2"
      >
        <span className="pl-2 text-muted" aria-hidden>
          ✦
        </span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Try “Add a meeting tomorrow at 2 PM for policy review”'
          className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted/60"
          aria-label="Natural language quick add"
        />
        <button type="submit" className="btn-primary !px-3.5 !py-1.5" disabled={!text.trim() || busy}>
          {busy ? "…" : "Add"}
        </button>
      </form>
      {confirmation ? (
        <p className="flex flex-wrap items-center gap-1.5 px-3 pb-1.5 pt-1 text-xs text-muted">
          <span
            className={`chip ${DOMAIN_STYLES[KIND_TO_DOMAIN[confirmation.kind]].soft} ${DOMAIN_STYLES[KIND_TO_DOMAIN[confirmation.kind]].text}`}
          >
            {DOMAIN_STYLES[KIND_TO_DOMAIN[confirmation.kind]].label}
          </span>
          Added “{confirmation.title}” · {formatFriendly(confirmation.date)}
          {confirmation.time ? ` at ${formatTime(confirmation.time)}` : ""}
        </p>
      ) : null}
    </div>
  );
}
