"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MicButton } from "./MicButton";
import { DOMAIN_STYLES } from "./ui";
import { useHub } from "@/core/store/hub";
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

/**
 * Global "add a task from anywhere" button. Floats above the bottom nav on
 * every screen; the task is tagged with the section you're on (Work, School,
 * Meals, …) and lands in your to-do list. Type or dictate.
 */
export function AddTaskButton() {
  const pathname = usePathname();
  const addTodo = useHub((s) => s.addTodo);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [added, setAdded] = useState(false);

  const domain = domainForPath(pathname);
  const style = DOMAIN_STYLES[domain];

  function submit() {
    const t = title.trim();
    if (!t) return;
    addTodo(t, urgency, domain);
    setTitle("");
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
                placeholder="What needs doing?"
                className="input flex-1 !py-2 text-sm"
              />
              <MicButton value={title} onChange={setTitle} />
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              {URGENCY.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUrgency(u.id)}
                  aria-pressed={urgency === u.id}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    urgency === u.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
                  }`}
                >
                  {u.label}
                </button>
              ))}
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
                Tagged <span className="font-medium">{style.label}</span> and saved to your to-do list on Today.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
