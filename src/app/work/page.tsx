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

function TopThree() {
  const projects = useHub((s) => s.projects);
  const focus = useHub((s) => s.focus);
  const toggleFocusTask = useHub((s) => s.toggleFocusTask);
  const toggleWorkTask = useHub((s) => s.toggleWorkTask);

  const focusIds = focus.date === todayISO() ? focus.taskIds : [];
  const allOpen = projects.flatMap((p) =>
    p.tasks.filter((t) => !t.done).map((t) => ({ ...t, projectId: p.id, projectName: p.name })),
  );
  const picked = allOpen.filter((t) => focusIds.includes(t.id));
  const candidates = allOpen.filter((t) => !focusIds.includes(t.id));

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-work" aria-hidden />
      <SectionTitle right={<span className="text-xs text-muted">{picked.length}/3 picked</span>}>
        Today&apos;s top 3
      </SectionTitle>
      <p className="mb-2 text-xs text-muted">
        Pick the three tasks that would make today a win — everything else can wait.
      </p>
      {picked.length > 0 ? (
        <div className="mb-2 space-y-0.5">
          {picked.map((t) => (
            <div key={t.id} className="flex items-center gap-1">
              <div className="flex-1">
                <Checkbox
                  checked={t.done}
                  onChange={() => toggleWorkTask(t.projectId, t.id)}
                  label={t.title}
                  sub={t.projectName}
                />
              </div>
              <button
                onClick={() => toggleFocusTask(t.id)}
                className="shrink-0 rounded-full px-2 py-1 text-xs text-muted hover:text-fitness-bright"
                aria-label={`Remove ${t.title} from focus`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {picked.length < 3 && candidates.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {candidates.slice(0, 6).map((t) => (
            <button
              key={t.id}
              onClick={() => toggleFocusTask(t.id)}
              className="chip border border-line text-muted hover:border-work hover:text-work-bright"
            >
              + {t.title}
            </button>
          ))}
        </div>
      ) : null}
      {allOpen.length === 0 ? <EmptyState>All tasks done — enjoy it.</EmptyState> : null}
    </Card>
  );
}

function MeetingList() {
  const meetings = useHub((s) => s.meetings);
  const projects = useHub((s) => s.projects);
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
          {upcoming.map((m) => {
            const project = projects.find((p) => p.id === m.projectId);
            return (
              <li key={m.id} className="group flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.title}
                    {project ? (
                      <span className="chip ml-2 bg-work-soft !text-[10px] text-work-bright">
                        {project.name}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    {formatFriendly(m.date)} · {formatTime(m.time)} · {m.durationMin} min
                  </p>
                  {m.agenda ? (
                    <p className="truncate text-xs italic text-muted/80">↳ {m.agenda}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {m.link ? (
                    <a
                      href={m.link}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary !px-3 !py-1 text-xs"
                    >
                      Join
                    </a>
                  ) : null}
                  <button
                    onClick={() => removeMeeting(m.id)}
                    className="rounded-full px-2 py-1 text-xs text-muted opacity-0 transition-opacity hover:bg-fitness-soft hover:text-fitness-bright group-hover:opacity-100"
                    aria-label={`Remove ${m.title}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ProjectCard({ projectId }: { projectId: string }) {
  const project = useHub((s) => s.projects.find((p) => p.id === projectId));
  const toggleWorkTask = useHub((s) => s.toggleWorkTask);
  const addWorkTask = useHub((s) => s.addWorkTask);
  const toggleMilestone = useHub((s) => s.toggleMilestone);
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

      {/* Roadmap: dated milestones */}
      {project.milestones?.length ? (
        <div className="mb-2 rounded-xl border border-line p-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Milestones
          </p>
          <ol className="space-y-1">
            {project.milestones.map((ms) => (
              <li key={ms.id} className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => toggleMilestone(project.id, ms.id)}
                  aria-pressed={ms.done}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    ms.done ? "border-work bg-work" : "border-ink/30 hover:border-work"
                  }`}
                  aria-label={`Toggle milestone ${ms.title}`}
                >
                  {ms.done ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </button>
                <span className={ms.done ? "text-muted line-through" : ""}>{ms.title}</span>
                {ms.targetDate ? (
                  <span className="ml-auto shrink-0 text-[10px] text-muted">
                    {formatShort(ms.targetDate)}
                    {!ms.done && daysUntil(ms.targetDate) <= 5 ? " · soon" : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

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
        subtitle="Plan the projects, protect the focus, join the meetings — one place."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <TopThree />
        <MeetingList />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {projectIds.map((id) => (
          <ProjectCard key={id} projectId={id} />
        ))}
      </div>
    </div>
  );
}
