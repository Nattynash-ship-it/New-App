"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import type { TaskStatus } from "@/core/types";

const COLUMNS: Array<{ id: TaskStatus; label: string; tint: string }> = [
  { id: "todo", label: "To do", tint: "bg-work-soft text-work-bright" },
  { id: "doing", label: "In progress", tint: "bg-school-soft text-school-bright" },
  { id: "done", label: "Done", tint: "bg-meals-soft text-meals-bright" },
];

function statusOf(t: { done: boolean; status?: TaskStatus }): TaskStatus {
  return t.status ?? (t.done ? "done" : "todo");
}

/**
 * Planner-style board over all work tasks — the same data as the project
 * cards, viewed as To do / In progress / Done buckets (a Planner board and a
 * Notion "same database, different view" in one). ‹ › moves a card between
 * buckets; no drag needed on a phone.
 */
export function PlannerBoard() {
  const projects = useHub((s) => s.projects);
  const setWorkTaskStatus = useHub((s) => s.setWorkTaskStatus);
  const addWorkTask = useHub((s) => s.addWorkTask);
  const [draft, setDraft] = useState("");
  const [draftProject, setDraftProject] = useState(projects[0]?.id ?? "");

  const cards = projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, projectId: p.id, projectName: p.name })),
  );

  function move(card: (typeof cards)[number], dir: -1 | 1) {
    const order: TaskStatus[] = ["todo", "doing", "done"];
    const next = order[order.indexOf(statusOf(card)) + dir];
    if (next) setWorkTaskStatus(card.projectId, card.id, next);
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">‹ › moves a card</span>}>
        Planner board
      </SectionTitle>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="grid min-w-[560px] grid-cols-3 gap-2">
          {COLUMNS.map((col) => {
            const colCards = cards.filter((c) => statusOf(c) === col.id);
            return (
              <div key={col.id} className="rounded-xl bg-paper p-2">
                <p className="mb-1.5 flex items-center justify-between px-1">
                  <span className={`chip !text-[10px] ${col.tint}`}>{col.label}</span>
                  <span className="text-[11px] tabular-nums text-muted">{colCards.length}</span>
                </p>
                <div className="space-y-1.5">
                  {colCards.map((c) => (
                    <div key={c.id} className="rounded-lg border border-line bg-surface p-2 shadow-card">
                      <p className={`text-xs font-medium leading-snug ${col.id === "done" ? "text-muted line-through" : ""}`}>
                        {c.title}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <span className="min-w-0 truncate text-[10px] text-muted">{c.projectName}</span>
                        <span className="flex shrink-0 gap-0.5">
                          <button
                            onClick={() => move(c, -1)}
                            disabled={col.id === "todo"}
                            aria-label={`Move ${c.title} left`}
                            className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-ink/5 disabled:opacity-25"
                          >
                            ‹
                          </button>
                          <button
                            onClick={() => move(c, 1)}
                            disabled={col.id === "done"}
                            aria-label={`Move ${c.title} right`}
                            className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-ink/5 disabled:opacity-25"
                          >
                            ›
                          </button>
                        </span>
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line px-2 py-3 text-center text-[11px] text-muted/70">
                      Nothing here
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim() || !draftProject) return;
          addWorkTask(draftProject, draft.trim());
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task to the board"
          className="input min-w-[140px] flex-1 !py-1.5 text-xs"
        />
        <select
          value={draftProject}
          onChange={(e) => setDraftProject(e.target.value)}
          className="input !w-auto !py-1.5 text-xs"
          aria-label="Project"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </Card>
  );
}
