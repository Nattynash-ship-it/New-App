"use client";

import { useState } from "react";
import { Card, Checkbox, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { daysUntil, formatFriendly, formatShort, formatTime, todayISO } from "@/core/dates";
import { useHub, useHydrated } from "@/core/store/hub";
import type { ProjectStatus } from "@/core/types";

const STATUS_STYLE: Record<ProjectStatus, string> = {
  active: "bg-work-soft text-work-bright",
  waiting: "bg-family-soft text-family-bright",
  blocked: "bg-fitness-soft text-fitness-bright",
  done: "bg-accent-soft text-accent",
};

function MeetingList() {
  const meetings = useHub((s) => s.meetings);
  const removeMeeting = useHub((s) => s.removeMeeting);
  const upcoming = [...meetings]
    .filter((m) => m.date >= todayISO())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

  return (
    <Card>
      <SectionTitle>Meeting schedule</SectionTitle>
      {upcoming.length === 0 ? (
        <EmptyState>No upcoming meetings. Use quick add on the Compass.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((m) => (
            <li key={m.id} className="group flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted">
                  {formatFriendly(m.date)} · {formatTime(m.time)} · {m.durationMin} min
                </p>
              </div>
              <button
                onClick={() => removeMeeting(m.id)}
                className="rounded-full px-2 py-1 text-xs text-muted opacity-0 transition-opacity hover:bg-fitness-soft hover:text-fitness-bright group-hover:opacity-100"
                aria-label={`Remove ${m.title}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProjectCard({ projectId }: { projectId: string }) {
  const project = useHub((s) => s.projects.find((p) => p.id === projectId));
  const toggleWorkTask = useHub((s) => s.toggleWorkTask);
  const addWorkTask = useHub((s) => s.addWorkTask);
  const [newTask, setNewTask] = useState("");

  if (!project) return null;
  const open = project.tasks.filter((t) => !t.done).length;

  return (
    <Card>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{project.name}</h3>
          <p className="text-xs text-muted">{project.category}</p>
        </div>
        <span className={`chip ${STATUS_STYLE[project.status]}`}>{project.status}</span>
      </div>
      {project.trackingRefs.length > 0 ? (
        <p className="mb-2 flex flex-wrap gap-1.5">
          {project.trackingRefs.map((ref) => (
            <span key={ref} className="chip border border-line bg-paper font-mono text-[10px] text-muted">
              {ref}
            </span>
          ))}
        </p>
      ) : null}
      {project.notes ? <p className="mb-2 text-xs text-muted">{project.notes}</p> : null}

      <div className="mt-2 space-y-0.5">
        {project.tasks.map((t) => (
          <Checkbox
            key={t.id}
            checked={t.done}
            onChange={() => toggleWorkTask(project.id, t.id)}
            label={t.title}
            sub={
              t.dueDate && !t.done
                ? `Due ${formatShort(t.dueDate)}${daysUntil(t.dueDate) <= 2 ? " · soon" : ""}`
                : undefined
            }
          />
        ))}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTask.trim()) {
            addWorkTask(project.id, newTask.trim());
            setNewTask("");
          }
        }}
      >
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={`Add a task (${open} open)`}
          className="input !py-1.5 text-xs"
        />
        <button type="submit" className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" disabled={!newTask.trim()}>
          Add
        </button>
      </form>
    </Card>
  );
}

export default function WorkPage() {
  const hydrated = useHydrated();
  const projectIds = useHub((s) => s.projects).map((p) => p.id);

  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Work Hub"
        title="Professional projects"
        subtitle="Document tracking, policy correspondence, and your meeting schedule."
      />
      <MeetingList />
      <div className="grid gap-5 lg:grid-cols-2">
        {projectIds.map((id) => (
          <ProjectCard key={id} projectId={id} />
        ))}
      </div>
    </div>
  );
}
