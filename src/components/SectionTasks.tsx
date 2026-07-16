"use client";

import { useState } from "react";
import { Card, Checkbox, DOMAIN_STYLES, EmptyState, SectionTitle } from "./ui";
import { MicButton } from "./MicButton";
import { useHub } from "@/core/store/hub";
import { useUndo } from "@/core/store/undo";
import type { Domain, Urgency } from "@/core/types";

const URGENCY: Record<Urgency, { label: string; chip: string; order: number }> = {
  high: { label: "Urgent", chip: "bg-fitness-soft text-fitness-bright", order: 0 },
  medium: { label: "Soon", chip: "bg-school-soft text-school-bright", order: 1 },
  low: { label: "Later", chip: "bg-meals-soft text-meals-bright", order: 2 },
};
const NEXT: Record<Urgency, Urgency> = { high: "medium", medium: "low", low: "high" };

/**
 * A tasks list scoped to one section (Work, School, Meals, …). Shows the tasks
 * you've tagged for this area and lets you add one right here — so adding a task
 * on a page actually shows up on that page. Backed by the same to-do store, so
 * everything also appears in the master list on Today.
 */
export function SectionTasks({ domain, title = "Tasks" }: { domain: Domain; title?: string }) {
  const todos = useHub((s) => s.todos);
  const addTodo = useHub((s) => s.addTodo);
  const toggleTodo = useHub((s) => s.toggleTodo);
  const removeTodo = useHub((s) => s.removeTodo);
  const setTodoUrgency = useHub((s) => s.setTodoUrgency);
  const pushUndo = useUndo((s) => s.push);
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");

  const mine = todos
    .filter((t) => t.domain === domain && !t.done)
    .sort((a, b) => URGENCY[a.urgency].order - URGENCY[b.urgency].order || b.createdAt.localeCompare(a.createdAt));
  const style = DOMAIN_STYLES[domain];

  function add() {
    const t = text.trim();
    if (!t) return;
    addTodo(t, urgency, domain);
    setText("");
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">{mine.length} open</span>}>
        {title}
      </SectionTitle>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          className="input min-w-[140px] flex-1 !py-1.5 text-sm"
        />
        <MicButton value={text} onChange={setText} />
        <button type="button" onClick={() => setUrgency(NEXT[urgency])} className={`chip ${URGENCY[urgency].chip}`} title="Tap to change urgency">
          {URGENCY[urgency].label}
        </button>
        <button type="submit" className={`btn-primary shrink-0 !px-3 !py-1.5 text-xs`} disabled={!text.trim()}>
          Add
        </button>
      </form>

      {mine.length === 0 ? (
        <div className="mt-2">
          <EmptyState>No {style.label.toLowerCase()} tasks yet — add one above.</EmptyState>
        </div>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {mine.map((t) => (
            <li key={t.id} className="flex items-center gap-1.5">
              <button
                onClick={() => setTodoUrgency(t.id, NEXT[t.urgency])}
                className={`chip shrink-0 ${URGENCY[t.urgency].chip}`}
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
