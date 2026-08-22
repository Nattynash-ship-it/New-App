"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MicButton } from "./MicButton";
import { DOMAIN_STYLES } from "./ui";
import { useHub } from "@/core/store/hub";
import { parseSmartTask } from "@/core/nlp/parser";
import { addDays, formatShort, formatTime, todayISO } from "@/core/dates";
import type { Domain, Urgency } from "@/core/types";

/** Which life-domain a task belongs to, inferred from the page you're on. */
function domainForPath(path: string): Domain {
  if (path.startsWith("/work")) return "work";
  if (path.startsWith("/school")) return "school";
  if (path.startsWith("/meals")) return "meals";
  if (path.startsWith("/fitness")) return "fitness";
  if (path.startsWith("/family")) return "family";
  return "compass"; // Today, Notes, Settings, Connections → general
}

const URGENCY: Array<{ id: Urgency; label: string }> = [
  { id: "high", label: "Urgent" },
  { id: "medium", label: "Soon" },
  { id: "low", label: "Later" },
];

function dateLabel(iso: string): string {
  const t = todayISO();
  if (iso === t) return "Today";
  if (iso === addDays(t, 1)) return "Tomorrow";
  return formatShort(iso);
}

/**
 * Global "add a task from anywhere" button. Floats above the bottom nav on
 * every screen. It reads what you type — "order groceries friday 5pm !high" —
 * and fills the due date, time, urgency, and section automatically, so a whole
 * task is one line. Manual controls still override. Type or dictate.
 */
export function AddTaskButton() {
  const pathname = usePathname();
  const addTodo = useHub((s) => s.addTodo);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [touchedUrgency, setTouchedUrgency] = useState(false);
  const [due, setDue] = useState("");
  const [alert, setAlert] = useState(false);
  const [added, setAdded] = useState(false);

  const routeDomain = domainForPath(pathname);
  const parsed = useMemo(() => parseSmartTask(title), [title]);

  // Effective values = what the parse found, unless you overrode it manually.
  const effUrgency = touchedUrgency ? urgency : parsed.urgency;
  const effDomain = parsed.domain ?? routeDomain;
  const effDue = due || parsed.dueDate;
  const effTime = parsed.dueTime;
  const style = DOMAIN_STYLES[effDomain];

  const hasPreview =
    title.trim().length > 0 &&
    (parsed.dueDate || parsed.dueTime || parsed.domain || effUrgency !== "medium");

  function reset() {
    setTitle("");
    setDue("");
    setAlert(false);
    setUrgency("medium");
    setTouchedUrgency(false);
  }

  function submit() {
    const p = parseSmartTask(title);
    const finalTitle = p.title || title.trim();
    if (!finalTitle) return;
    addTodo(
      finalTitle,
      touchedUrgency ? urgency : p.urgency,
      p.domain ?? routeDomain,
      due || p.dueDate,
      alert || Boolean(p.dueDate), // auto-remind when a deadline was detected
      p.dueTime,
    );
    reset();
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <>
      {/* Floating action button — clears the bottom tab bar on mobile */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Add a task"
        className="fixed bottom-[76px] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-accent-ink shadow-lift transition-transform active:scale-90 md:bottom-6"
      >
        ＋
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/30 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-slide-in w-full max-w-md rounded-2xl bg-surface p-4 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                Add a task
                <span className={`chip !text-[10px] ${style.soft} ${style.text}`}>{style.label}</span>
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-ink">
                ×
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder='e.g. "order groceries friday 5pm !high"'
                className="input flex-1 !py-2 text-sm"
              />
              <MicButton value={title} onChange={setTitle} />
            </div>

            {/* Live smart-parse preview */}
            {hasPreview ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-accent-soft/40 px-2.5 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Reads as</span>
                {effDue ? <span className="chip !text-[10px] bg-surface">📅 {dateLabel(effDue)}</span> : null}
                {effTime ? <span className="chip !text-[10px] bg-surface">🕒 {formatTime(effTime)}</span> : null}
                {effUrgency !== "medium" ? (
                  <span className="chip !text-[10px] bg-surface">
                    ⚡ {effUrgency === "high" ? "Urgent" : "Later"}
                  </span>
                ) : null}
                {parsed.domain ? (
                  <span className={`chip !text-[10px] ${style.soft} ${style.text}`}>{style.label}</span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-2 flex items-center gap-1.5">
              {URGENCY.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setUrgency(u.id);
                    setTouchedUrgency(true);
                  }}
                  aria-pressed={effUrgency === u.id}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    effUrgency === u.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-muted">
                Due
                <input
                  type="date"
                  value={due || parsed.dueDate || ""}
                  onChange={(e) => setDue(e.target.value)}
                  className="input !w-auto !py-1 text-xs"
                  aria-label="Due date (optional)"
                />
              </label>
              <button
                type="button"
                onClick={() => setAlert((v) => !v)}
                aria-pressed={alert}
                title="Remind me when it's due"
                className={`chip cursor-pointer ${alert ? "bg-accent-soft text-accent" : "border border-line text-muted"}`}
              >
                🔔 {alert ? "Alert on" : "Alert off"}
              </button>
              <button
                onClick={submit}
                disabled={!title.trim()}
                className="btn-primary ml-auto !px-4 !py-1.5 text-sm"
              >
                Add
              </button>
            </div>

            {added ? (
              <p className="mt-2 text-xs text-meals-bright">Added to your to-do list ✓ — add another, or close.</p>
            ) : (
              <p className="mt-2 text-[11px] text-muted">
                Type a date, time, <span className="font-medium">!high</span>, or a keyword like{" "}
                <span className="font-medium">groceries</span> and Vela files it for you.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
