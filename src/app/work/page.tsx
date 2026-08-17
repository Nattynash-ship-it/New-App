"use client";

import { useState } from "react";
import { Card, Checkbox, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { Attachments } from "@/components/Attachments";
import { MicButton } from "@/components/MicButton";
import { SmartCapture } from "@/components/SmartCapture";
import { daysUntil, formatFriendly, formatShort, formatTime, todayISO } from "@/core/dates";
import { PlannerBoard } from "@/components/PlannerBoard";
import { SectionTasks } from "@/components/SectionTasks";
import { useHub, useHydrated } from "@/core/store/hub";
import { useUndo } from "@/core/store/undo";
import type { ProjectStatus } from "@/core/types";

const STATUS_STYLE: Record<ProjectStatus, string> = {
  active: "bg-work-soft text-work-bright",
  waiting: "bg-family-soft text-family-bright",
  blocked: "bg-fitness-soft text-fitness-bright",
  done: "bg-accent-soft text-accent",
};
const PROJECT_STATUSES: ProjectStatus[] = ["active", "waiting", "blocked", "done"];

function TopThree() {
  const projects = useHub((s) => s.projects);
  const focus = useHub((s) => s.focus);
  const toggleFocusTask = useHub((s) => s.toggleFocusTask);
  const toggleWorkTask = useHub((s) => s.toggleWorkTask);
  const pushUndo = useUndo((s) => s.push);

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
                  onChange={() => {
                    toggleWorkTask(t.projectId, t.id);
                    pushUndo(`Done: ${t.title}`, () => toggleWorkTask(t.projectId, t.id));
                  }}
                  label={t.title}
                  sub={t.projectName}
                  vanish
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
  const addMeeting = useHub((s) => s.addMeeting);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [link, setLink] = useState("");
  const upcoming = [...meetings]
    .filter((m) => m.date >= todayISO())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

  return (
    <Card>
      <SectionTitle
        right={
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Close" : "+ Meeting"}
          </button>
        }
      >
        Meeting schedule
      </SectionTitle>
      {showAdd ? (
        <form
          className="animate-slide-in mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            addMeeting({
              title: title.trim(),
              date,
              time,
              durationMin: 30,
              link: link.trim() || undefined,
            });
            setTitle("");
            setLink("");
            setShowAdd(false);
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" className="input min-w-[140px] flex-1 !py-1.5 text-xs" />
          <MicButton value={title} onChange={setTitle} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input !w-auto !py-1.5 text-xs" aria-label="Date" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input !w-auto !py-1.5 text-xs" aria-label="Time" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Video link (optional)" className="input min-w-[140px] flex-1 !py-1.5 text-xs" />
          <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs" disabled={!title.trim()}>
            Add
          </button>
        </form>
      ) : null}
      {upcoming.length === 0 ? (
        <EmptyState>No upcoming meetings — add one above or use quick add on Today.</EmptyState>
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
  const pushUndo = useUndo((s) => s.push);
  const addWorkTask = useHub((s) => s.addWorkTask);
  const removeWorkTask = useHub((s) => s.removeWorkTask);
  const toggleMilestone = useHub((s) => s.toggleMilestone);
  const removeMilestone = useHub((s) => s.removeMilestone);
  const addMilestone = useHub((s) => s.addMilestone);
  const removeProject = useHub((s) => s.removeProject);
  const setProjectStatus = useHub((s) => s.setProjectStatus);
  const [newTask, setNewTask] = useState("");
  const [newMilestone, setNewMilestone] = useState("");

  if (!project) return null;
  const open = project.tasks.filter((t) => !t.done).length;

  return (
    <Card>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{project.name}</h3>
          <p className="text-xs text-muted">{project.category}</p>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="relative inline-flex items-center">
            <span className={`chip ${STATUS_STYLE[project.status]}`}>
              {project.status}
              <span aria-hidden className="ml-0.5 opacity-60">▾</span>
            </span>
            <select
              value={project.status}
              onChange={(e) => setProjectStatus(project.id, e.target.value as ProjectStatus)}
              aria-label={`Status for ${project.name}`}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </span>
          <button
            onClick={() => removeProject(project.id)}
            aria-label={`Delete project ${project.name}`}
            className="rounded-full px-1.5 text-sm text-muted opacity-40 transition-opacity hover:bg-fitness-soft hover:text-fitness-bright hover:opacity-100"
          >
            ×
          </button>
        </span>
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
      <div className="mb-2 rounded-xl border border-line p-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Milestones
        </p>
        {project.milestones?.length ? (
          <ol className="space-y-1">
            {project.milestones.map((ms) => (
              <li key={ms.id} className="group/ms flex items-center gap-2 text-xs">
                <button
                  onClick={() => toggleMilestone(project.id, ms.id)}
                  aria-pressed={ms.done}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    ms.done ? "border-work bg-work" : "border-ink/30 hover:border-work"
                  }`}
                  aria-label={`Toggle milestone ${ms.title}`}
                >
                  {ms.done ? <span className="animate-pop h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </button>
                <span className={ms.done ? "text-muted line-through" : ""}>{ms.title}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {ms.targetDate ? (
                    <span className="text-[10px] text-muted">
                      {formatShort(ms.targetDate)}
                      {!ms.done && daysUntil(ms.targetDate) <= 5 ? " · soon" : ""}
                    </span>
                  ) : null}
                  <button
                    onClick={() => removeMilestone(project.id, ms.id)}
                    aria-label={`Delete milestone ${ms.title}`}
                    className="rounded-full px-1 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover/ms:opacity-100"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted">No milestones yet — sketch the roadmap below.</p>
        )}
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newMilestone.trim()) {
              addMilestone(project.id, newMilestone.trim());
              setNewMilestone("");
            }
          }}
        >
          <input
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            placeholder="Add milestone"
            className="input !py-1 text-xs"
          />
          <MicButton value={newMilestone} onChange={setNewMilestone} />
          <button type="submit" className="btn-ghost shrink-0 !px-2.5 !py-1 text-xs" disabled={!newMilestone.trim()}>
            Add
          </button>
        </form>
      </div>

      <div className="mt-2 space-y-0.5">
        {project.tasks
          .filter((t) => !t.done)
          .map((t) => (
            <Checkbox
              key={t.id}
              checked={t.done}
              onChange={() => {
                toggleWorkTask(project.id, t.id);
                pushUndo(`Done: ${t.title}`, () => toggleWorkTask(project.id, t.id));
              }}
              onRemove={() => removeWorkTask(project.id, t.id)}
              label={t.title}
              sub={
                t.dueDate
                  ? `Due ${formatShort(t.dueDate)}${daysUntil(t.dueDate) <= 2 ? " · soon" : ""}`
                  : undefined
              }
              vanish
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
        <MicButton value={newTask} onChange={setNewTask} />
        <button type="submit" className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" disabled={!newTask.trim()}>
          Add
        </button>
      </form>

      <Attachments ownerType="project" ownerId={project.id} label="Documents & correspondence" />
    </Card>
  );
}

const PROJECT_CATEGORIES = [
  "Client work",
  "Internal",
  "Research",
  "Operations",
  "Product",
  "Personal",
];

function AddProject() {
  const createProject = useHub((s) => s.createProject);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [refs, setRefs] = useState("");
  const [notes, setNotes] = useState("");
  const [milestone, setMilestone] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  function reset() {
    setName("");
    setCategory("");
    setStatus("active");
    setRefs("");
    setNotes("");
    setMilestone("");
    setMilestoneDate("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card flex w-full items-center justify-center gap-2 border-dashed p-3.5 text-sm font-medium text-muted transition-colors hover:border-work hover:text-work-bright"
      >
        ＋ New project
      </button>
    );
  }

  return (
    <form
      className="card space-y-3 border-dashed p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        createProject({
          name,
          category,
          status,
          notes,
          trackingRefs: refs ? refs.split(",") : [],
          firstMilestone: milestone.trim()
            ? { title: milestone, targetDate: milestoneDate || undefined }
            : undefined,
        });
        reset();
        setOpen(false);
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New project</h3>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Project name
        </label>
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 policy review"
            className="input !py-2 text-sm"
          />
          <MicButton value={name} onChange={setName} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
            Category
          </label>
          <input
            list="project-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Client work, Internal…"
            className="input !py-2 text-sm"
          />
          <datalist id="project-categories">
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="input !py-2 text-sm"
          >
            {PROJECT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Tracking refs <span className="font-normal normal-case">(optional, comma-separated)</span>
        </label>
        <input
          value={refs}
          onChange={(e) => setRefs(e.target.value)}
          placeholder="DOC-1042, PO-88"
          className="input !py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Notes <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Scope, stakeholders, links…"
          rows={2}
          className="input !py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          First milestone <span className="font-normal normal-case">(optional)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            placeholder="e.g. Kickoff complete"
            className="input min-w-[160px] flex-1 !py-2 text-sm"
          />
          <input
            type="date"
            value={milestoneDate}
            onChange={(e) => setMilestoneDate(e.target.value)}
            className="input !w-auto !py-2 text-sm"
            aria-label="Milestone target date"
          />
        </div>
      </div>

      <button type="submit" className="btn-primary text-sm" disabled={!name.trim()}>
        Create project
      </button>
    </form>
  );
}

export default function WorkPage() {
  const hydrated = useHydrated();
  const projectIds = useHub((s) => s.projects).map((p) => p.id);
  // Notion-style: the same tasks, two views — project list or Planner board.
  const [view, setView] = useState<"list" | "board">("list");

  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Work Hub"
        title="Professional projects"
        subtitle="Plan the projects, protect the focus, join the meetings — one place."
      />
      {/* Quick add front and center */}
      <SectionTasks domain="work" title="Work tasks" />

      <SmartCapture
        title="Capture from an email or notes"
        blurb="Paste a meeting invite, a screenshot, or notes — Vela pulls out the meetings and deadlines and files them under Work for you to confirm."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <TopThree />
        <MeetingList />
      </div>

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "list", label: "☰ Projects" },
            { id: "board", label: "🗂 Board" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              view === v.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-ink/25"
            }`}
          >
            {v.label}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-muted">same tasks, two views</span>
      </div>

      {view === "board" ? (
        <PlannerBoard />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {projectIds.map((id) => (
            <ProjectCard key={id} projectId={id} />
          ))}
        </div>
      )}
      <AddProject />
    </div>
  );
}
