"use client";

import { useState } from "react";
import { useHub } from "@/core/store/hub";
import { formatFriendly } from "@/core/dates";
import type { ParsedCourse } from "@/core/nlp/courses";
import type { ParsedIntent } from "@/core/types";

export interface Findings {
  fileName: string;
  classes: Array<ParsedCourse & { include: boolean }>;
  items: Array<ParsedIntent & { include: boolean }>;
  note?: string;
}

/**
 * The "✨ Found in your upload" review panel. Shared by the Attachments widget
 * and the inline add-bars so extraction looks and behaves the same everywhere:
 * pick the classes + dates found, add them in one tap (classes → degree plan,
 * dates → calendar). Nothing is added silently.
 */
export function ExtractionReview({
  findings,
  onDone,
}: {
  findings: Findings;
  onDone: (addedMsg: string | null) => void;
}) {
  const addCourse = useHub((s) => s.addCourse);
  const addFromIntent = useHub((s) => s.addFromIntent);
  const [classes, setClasses] = useState(findings.classes);
  const [items, setItems] = useState(findings.items);

  const selectedCount =
    classes.filter((c) => c.include).length + items.filter((i) => i.include).length;

  function addSelected() {
    const cls = classes.filter((c) => c.include && c.name.trim());
    const its = items.filter((i) => i.include);
    cls.forEach((c) =>
      addCourse(c.code.trim() || "COURSE", c.name.trim(), c.credits, c.completed ?? false),
    );
    its.forEach((i) =>
      addFromIntent({ kind: i.kind, title: i.title, date: i.date, time: i.time, confidence: i.confidence }),
    );
    const parts = [
      cls.length ? `${cls.length} ${cls.length === 1 ? "class" : "classes"}` : "",
      its.length ? `${its.length} ${its.length === 1 ? "date" : "dates"}` : "",
    ].filter(Boolean);
    onDone(parts.length ? `Added ${parts.join(" & ")} ✓` : null);
  }

  const summary = [
    classes.length ? `${classes.length} ${classes.length === 1 ? "class" : "classes"}` : "",
    items.length ? `${items.length} ${items.length === 1 ? "date" : "dates"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="animate-slide-in mt-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-2.5">
      <p className="text-[11px] font-semibold">
        ✨ Found in {findings.fileName || "your upload"}
        {summary ? ` — ${summary}` : ""}
      </p>
      {findings.note ? <p className="mt-1 text-[11px] text-muted">{findings.note}</p> : null}

      {classes.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {classes.map((c, i) => (
            <li key={`c${i}`} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={c.include}
                onChange={(e) =>
                  setClasses((prev) => prev.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))
                }
                aria-label={`Include ${c.name}`}
              />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-mono text-[11px] text-muted">{c.code}</span>{" "}
                <span className="font-medium">{c.name}</span>
              </span>
              <span
                className={`chip shrink-0 !text-[10px] ${c.completed ? "bg-school-soft text-school-bright" : "border border-line text-muted"}`}
              >
                {c.completed ? "✓ done" : "in progress"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((it, i) => (
            <li key={`i${i}`} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={it.include}
                onChange={(e) =>
                  setItems((prev) => prev.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))
                }
                aria-label={`Include ${it.title}`}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{it.title}</span>
              <span className="shrink-0 text-[11px] text-muted">{formatFriendly(it.date)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {classes.length > 0 || items.length > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <button onClick={addSelected} disabled={selectedCount === 0} className="btn-primary !px-3 !py-1 text-xs">
            Add {selectedCount} selected
          </button>
          <button onClick={() => onDone(null)} className="text-[11px] text-muted hover:text-ink">
            Dismiss
          </button>
        </div>
      ) : (
        <button onClick={() => onDone(null)} className="mt-1.5 text-[11px] text-muted hover:text-ink">
          Dismiss
        </button>
      )}
    </div>
  );
}
