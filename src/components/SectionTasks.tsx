"use client";

import { useState } from "react";
import { Card, Checkbox, DOMAIN_STYLES, EmptyState, SectionTitle } from "./ui";
import { MicButton } from "./MicButton";
import { daysUntil, formatShort } from "@/core/dates";
import { useHub } from "@/core/store/hub";
import { useUndo } from "@/core/store/undo";
import type { Domain, Urgency } from "@/core/types";

const URGENCY: Record<Urgency, { label: string; chip: string; order: number }> = {
  high: { label: "Urgent", chip: "bg-fitness-soft text-fitness-bright", order: 0 },
  medium: { label: "Soon", chip: "bg-school-soft text-school-bright", order: 1 },
  low: { label: "Later", chip: "bg-meals-soft text-meals-bright", order: 2 },
};
const NEXT: Record<Urgency, Urgency> = { high: "medium", medium: "low", low: "high" };

/** A friendly due label with an overdue/today/soon tint. */
function dueMeta(dueDate: string): { label: string; cls: string } {
  const d = daysUntil(dueDate);
  if (d < 0) return { label: `Overdue · ${formatShort(dueDate)}`, cls: "bg-fitness-soft text-fitness-bright" };
  if (d === 0) return { label: "Due today", cls: "bg-school-soft text-school-bright" };
  if (d === 1) return { label: "Due tomorrow", cls: "bg-school-soft text-school-bright" };
  if (d <= 6) return { label: `Due ${formatShort(dueDate)}`, cls: "bg-work-soft text-work-bright" };
  return { label: `Due ${formatShort(dueDate)}`, cls: "border border-line text-muted" };
}

/**
 * A tasks list scoped to one section (Work, School, …). Add a task right here —
 * with an optional due date and an alert (a reminder when it's due) — and it
 * shows on this page. Same store as the master list on Today.
 */
export function SectionTasks({ domain, title = "Tasks" }: { domain: Domain; title?: string }) {
  const todos = useHub((s) => s.todos);
  const addTodo = useHub((s) => s.addTodo);
  const toggleTodo = useHub((s) => s.toggleTodo);
  const removeTodo = useHub((s) => s.removeTodo);
  const setTodoUrgency = useHub((s) => s.setTodoUrgency);
  const setTodoDue = useHub((s) => s.setTodoDue);
  const toggleTodoAlert = useHub((s) => s.toggleTodoAlert);
  const pushUndo = useUndo((s) => s.push);
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [due, setDue] = useState("");
  const [alert, setAlert] = useState(false);

  const mine = todos
    .filter((t) => t.domain === domain && !t.done)
    .sort(
      (a, b) =>
        URGENCY[a.urgency].order - URGENCY[b.urgency].order ||
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        b.createdAt.localeCompare(a.createdAt),
    );
  const style = DOMAIN_STYLES[domain];

  function add() {
    const t = text.trim();
    if (!t) return;
    addTodo(t, urgency, domain, due || undefined, alert);
    setText("");
    setDue("");
    setAlert(false);
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">{mine.length} open</span>}>
        {title}
      </SectionTitle>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a task…"
            className="input min-w-[140px] flex-1 !py-1.5 text-sm"
          />
          <MicButton value={text} onChange={setText} />
          <button
            type="button"
            onClick={() => setUrgency(NEXT[urgency])}
            className={`chip ${URGENCY[urgency].chip}`}
            title="Tap to change urgency"
          >
            {URGENCY[urgency].label}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted">
            Due
            <input
              type="date"
              value={due}
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
          <button type="submit" className="btn-primary ml-auto shrink-0 !px-3 !py-1.5 text-xs" disabled={!text.trim()}>
            Add
          </button>
        </div>
      </form>

      {mine.length === 0 ? (
        <div className="mt-2">
          <EmptyState>No {style.label.toLowerCase()} tasks yet — add one above.</EmptyState>
        </div>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {mine.map((t) => {
            const meta = t.dueDate ? dueMeta(t.dueDate) : null;
            return (
              <li key={t.id} className="flex items-start gap-1.5">
                <button
                  onClick={() => setTodoUrgency(t.id, NEXT[t.urgency])}
                  className={`chip mt-1 shrink-0 ${URGENCY[t.urgency].chip}`}
                  title="Tap to change urgency"
                >
                  {URGENCY[t.urgency].label}
                </button>
                <div className="min-w-0 flex-1">
                  <Checkbox
                    checked={t.done}
                    onChange={() => {
                      toggleTodo(t.id);
                      pushUndo(`Done: ${t.title}`, () => toggleTodo(t.id));
                    }}
                    onRemove={() => removeTodo(t.id)}
                    label={t.title}
                    vanish
                  />
                  {(meta || t.dueDate !== undefined) && (
                    <div className="ml-9 -mt-1 mb-1 flex flex-wrap items-center gap-1.5">
                      {meta ? <span className={`chip !text-[10px] ${meta.cls}`}>{meta.label}</span> : null}
                      <button
                        onClick={() => toggleTodoAlert(t.id)}
                        title={t.alert ? "Reminder on — tap to turn off" : "Remind me when it's due"}
                        aria-pressed={Boolean(t.alert)}
                        className={`text-[11px] ${t.alert ? "text-accent" : "text-muted/60 hover:text-muted"}`}
                      >
                        🔔
                      </button>
                      {t.dueDate ? (
                        <button
                          onClick={() => setTodoDue(t.id, undefined)}
                          className="text-[10px] text-muted/60 hover:text-muted"
                          title="Clear due date"
                        >
                          clear
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
