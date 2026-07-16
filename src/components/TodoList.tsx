"use client";

import { useState } from "react";
import { Card, Checkbox, DOMAIN_STYLES, EmptyState, SectionTitle } from "./ui";
import { MicButton } from "./MicButton";
import { formatShort } from "@/core/dates";
import { useHub } from "@/core/store/hub";
import { useUndo } from "@/core/store/undo";
import type { Urgency } from "@/core/types";

const URGENCY: Record<Urgency, { label: string; order: number; chip: string; dot: string }> = {
  high: { label: "Urgent", order: 0, chip: "bg-fitness-soft text-fitness-bright", dot: "bg-fitness" },
  medium: { label: "Soon", order: 1, chip: "bg-school-soft text-school-bright", dot: "bg-school" },
  low: { label: "Later", order: 2, chip: "bg-meals-soft text-meals-bright", dot: "bg-meals" },
};
const NEXT: Record<Urgency, Urgency> = { high: "medium", medium: "low", low: "high" };
const LEVELS: Urgency[] = ["high", "medium", "low"];

/** A general to-do list with urgency levels — not tied to any module. */
export function TodoList() {
  const todos = useHub((s) => s.todos);
  const addTodo = useHub((s) => s.addTodo);
  const toggleTodo = useHub((s) => s.toggleTodo);
  const removeTodo = useHub((s) => s.removeTodo);
  const setTodoUrgency = useHub((s) => s.setTodoUrgency);
  const pushUndo = useUndo((s) => s.push);
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");

  const open = todos
    .filter((t) => !t.done)
    .sort((a, b) => URGENCY[a.urgency].order - URGENCY[b.urgency].order || b.createdAt.localeCompare(a.createdAt));
  const doneCount = todos.length - open.length;

  return (
    <Card>
      <SectionTitle right={doneCount > 0 ? <span className="text-xs text-muted">{doneCount} done</span> : undefined}>
        To-do list
      </SectionTitle>

      <form
        className="mb-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          addTodo(title, urgency);
          setTitle("");
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a to-do…"
          className="input min-w-[140px] flex-1 !py-1.5 text-sm"
        />
        <MicButton value={title} onChange={setTitle} />
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Urgency">
          {LEVELS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUrgency(u)}
              aria-pressed={urgency === u}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                urgency === u ? `border-transparent ${URGENCY[u].chip}` : "border-line text-muted hover:border-ink/25"
              }`}
            >
              {URGENCY[u].label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs" disabled={!title.trim()}>
          Add
        </button>
      </form>

      {open.length === 0 ? (
        <EmptyState>{doneCount > 0 ? "All done — nice. ✦" : "Nothing on the list. Add something above."}</EmptyState>
      ) : (
        <ul className="space-y-0.5">
          {open.map((t) => (
            <li key={t.id} className="flex items-center gap-1.5">
              <button
                onClick={() => setTodoUrgency(t.id, NEXT[t.urgency])}
                className={`chip shrink-0 ${URGENCY[t.urgency].chip}`}
                title="Tap to change urgency"
                aria-label={`Urgency: ${URGENCY[t.urgency].label}. Tap to change.`}
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
                  sub={
                    [
                      t.domain && t.domain !== "compass" ? DOMAIN_STYLES[t.domain].label : "",
                      t.dueDate ? `${t.alert ? "🔔 " : ""}due ${formatShort(t.dueDate)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  vanish
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
