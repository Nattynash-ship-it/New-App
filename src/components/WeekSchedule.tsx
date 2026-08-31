"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import { formatTime, weekStartISO } from "@/core/dates";
import { CATEGORY_META, toMinutes, type BlockCategory } from "@/core/data/weeklySchedule";
import { workoutById } from "@/core/fitness/program";
import { formVideoUrl, LEVEL_META } from "@/core/fitness/library";
import { downloadWeeklyICS, type WeeklyCalEvent } from "@/lib/calendar";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-first
const DAY_LABEL: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
const DAY_FULL: Record<number, string> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday",
};
const CATS = Object.keys(CATEGORY_META) as BlockCategory[];

function hoursFor(mins: number): string {
  const h = mins / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

/** A search link for the whole workout session, done at home. */
function sessionVideoUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} at home workout`)}`;
}

/**
 * "My Week" — the recurring time-block schedule, one day at a time. Today is
 * selected by default; each day shows its movement + study totals so the goals
 * stay visible. Fully editable: add or remove any block, or reset to the plan.
 */
export function WeekSchedule() {
  const weekBlocks = useHub((s) => s.weekBlocks);
  const weekChecks = useHub((s) => s.weekChecks);
  const addWeekBlock = useHub((s) => s.addWeekBlock);
  const editWeekBlock = useHub((s) => s.editWeekBlock);
  const removeWeekBlock = useHub((s) => s.removeWeekBlock);
  const resetWeekBlocks = useHub((s) => s.resetWeekBlocks);
  const toggleWeekBlockDone = useHub((s) => s.toggleWeekBlockDone);
  const toggleWeekBlockReminder = useHub((s) => s.toggleWeekBlockReminder);

  const thisWeek = weekStartISO();
  const isDone = (id: string) => weekChecks[id] === thisWeek;
  const today = new Date().getDay();
  const [sel, setSel] = useState(today);
  const [adding, setAdding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [openWorkout, setOpenWorkout] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ day: today, start: "", end: "", title: "" });
  const [draft, setDraft] = useState({ start: "", end: "", title: "", category: "study" as BlockCategory });

  const dayBlocks = weekBlocks
    .filter((b) => b.day === sel)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  const studyMin = dayBlocks
    .filter((b) => b.category === "study")
    .reduce((n, b) => n + (toMinutes(b.end) - toMinutes(b.start)), 0);
  const moveMin = dayBlocks
    .filter((b) => b.category === "workout")
    .reduce((n, b) => n + (toMinutes(b.end) - toMinutes(b.start)), 0);

  // Checkboxes appear "as the day approaches": on today and earlier days this
  // week, not on days still ahead. (Mon-based position in the week.)
  const pos = (d: number) => (d + 6) % 7;
  const checkable = pos(sel) <= pos(today);
  const doneCount = dayBlocks.filter((b) => isDone(b.id)).length;
  const reminderCount = weekBlocks.filter((b) => b.reminder).length;

  function submitAdd() {
    if (!draft.start || !draft.end || !draft.title.trim()) return;
    addWeekBlock({ day: sel, start: draft.start, end: draft.end, title: draft.title.trim(), category: draft.category });
    setDraft({ start: "", end: "", title: "", category: draft.category });
    setAdding(false);
  }

  function startEdit(b: { id: string; day: number; start: string; end: string; title: string }) {
    setEditingId(b.id);
    setOpenWorkout(null);
    setEditDraft({ day: b.day, start: b.start, end: b.end, title: b.title });
  }

  function submitEdit() {
    if (!editingId || !editDraft.start || !editDraft.end || !editDraft.title.trim()) return;
    editWeekBlock(editingId, {
      day: editDraft.day,
      start: editDraft.start,
      end: editDraft.end,
      title: editDraft.title.trim(),
    });
    // Follow the block to its new day so you can see where it landed.
    setSel(editDraft.day);
    setEditingId(null);
  }

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-accent" aria-hidden />
      <SectionTitle right={<span className="text-xs text-muted">recurring</span>}>My week</SectionTitle>
      <p className="-mt-1 mb-2 text-xs text-muted">
        Your weekly rhythm — movement at 5&nbsp;AM, study on the train, dinner &amp; reading at 7. Check
        blocks off as you go; they reset fresh every Monday. Tap <span className="text-accent">✎</span> on
        any block to move it to another day or time.
      </p>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAY_ORDER.map((d) => {
          const active = d === sel;
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => setSel(d)}
              aria-pressed={active}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-accent text-accent-ink" : "text-muted hover:bg-ink/[0.04]"
              }`}
            >
              {DAY_LABEL[d]}
              {isToday ? <span className={`ml-1 text-[9px] ${active ? "opacity-80" : "text-accent"}`}>●</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {DAY_FULL[sel]}
          {sel === today ? <span className="ml-1.5 text-[11px] font-normal text-accent">today</span> : null}
        </span>
        <span className="flex flex-wrap justify-end gap-1.5">
          {checkable ? (
            <span className={`chip !text-[10px] ${doneCount === dayBlocks.length && dayBlocks.length ? "bg-meals-soft text-meals-bright" : "border border-line text-muted"}`}>
              ✓ {doneCount}/{dayBlocks.length}
            </span>
          ) : null}
          <span className="chip !text-[10px]" style={{ background: `${CATEGORY_META.study.color}1f`, color: CATEGORY_META.study.color }}>
            📚 {hoursFor(studyMin)}
          </span>
          <span className="chip !text-[10px]" style={{ background: `${CATEGORY_META.workout.color}1f`, color: CATEGORY_META.workout.color }}>
            🏋️ {hoursFor(moveMin)}
          </span>
        </span>
      </div>

      <ul className="mt-2 space-y-0.5">
        {dayBlocks.map((b) => {
          const meta = CATEGORY_META[b.category];
          const done = isDone(b.id);
          const workout = b.workoutId ? workoutById(b.workoutId) : undefined;
          const expanded = openWorkout === b.id;
          return (
            <li key={b.id} className="group rounded-lg px-1.5 py-1.5 hover:bg-paper">
              <div className="flex items-start gap-2">
                {checkable ? (
                  <button
                    onClick={() => toggleWeekBlockDone(b.id)}
                    role="checkbox"
                    aria-checked={done}
                    aria-label={done ? `Undo ${b.title}` : `Mark ${b.title} done`}
                    className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                      done ? "border-meals bg-meals text-white" : "border-ink/25 bg-surface hover:border-meals-bright"
                    }`}
                    style={done ? { borderColor: meta.color, background: meta.color } : undefined}
                  >
                    {done ? (
                      <svg width="11" height="9" viewBox="0 0 10 8" fill="none" aria-hidden>
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </button>
                ) : (
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-sm" style={{ background: meta.color }} aria-hidden />
                )}
                <span className="w-[86px] shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-muted">
                  {formatTime(b.start)}–{formatTime(b.end)}
                </span>
                {workout ? (
                  <button
                    onClick={() => setOpenWorkout(expanded ? null : b.id)}
                    aria-expanded={expanded}
                    className={`min-w-0 flex-1 text-left text-[13px] ${done ? "text-muted line-through" : ""}`}
                  >
                    {b.title}
                    <span className="ml-1.5 whitespace-nowrap text-[11px] font-semibold text-fitness-bright">
                      {expanded ? "▾ hide" : "▸ exercises"}
                    </span>
                  </button>
                ) : (
                  <span className={`min-w-0 flex-1 text-[13px] ${done ? "text-muted line-through" : ""}`}>{b.title}</span>
                )}
                <button
                  onClick={() => toggleWeekBlockReminder(b.id)}
                  aria-label={b.reminder ? `Reminder on for ${b.title}` : `Remind me at ${b.title}`}
                  aria-pressed={Boolean(b.reminder)}
                  title={b.reminder ? "Reminder on — tap to turn off" : "Remind me when this starts"}
                  className={`shrink-0 rounded-full px-1 text-[13px] ${
                    b.reminder ? "text-accent" : "text-muted/50 opacity-0 hover:text-muted group-hover:opacity-100"
                  }`}
                >
                  🔔
                </button>
                <button
                  onClick={() => (editingId === b.id ? setEditingId(null) : startEdit(b))}
                  aria-label={`Move or edit ${b.title}`}
                  aria-pressed={editingId === b.id}
                  title="Move to another day or time"
                  className={`shrink-0 rounded-full px-1 text-[13px] transition-opacity hover:text-accent ${
                    editingId === b.id ? "text-accent opacity-100" : "text-muted/50 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  ✎
                </button>
                <button
                  onClick={() => removeWeekBlock(b.id)}
                  aria-label={`Remove ${b.title}`}
                  className="shrink-0 rounded-full px-1 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                >
                  ×
                </button>
              </div>

              {editingId === b.id ? (
                <div className="animate-slide-in ml-[26px] mt-1.5 space-y-2 rounded-lg border border-line bg-paper p-2.5">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted">
                    Day
                    <select
                      value={editDraft.day}
                      onChange={(e) => setEditDraft({ ...editDraft, day: Number(e.target.value) })}
                      className="input !w-auto !py-1 text-xs"
                      aria-label="Move to day"
                    >
                      {DAY_ORDER.map((d) => (
                        <option key={d} value={d}>{DAY_FULL[d]}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-[11px] text-muted">
                      From
                      <input type="time" value={editDraft.start} onChange={(e) => setEditDraft({ ...editDraft, start: e.target.value })} className="input !w-auto !py-1 text-xs" />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-muted">
                      to
                      <input type="time" value={editDraft.end} onChange={(e) => setEditDraft({ ...editDraft, end: e.target.value })} className="input !w-auto !py-1 text-xs" />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={editDraft.title}
                      onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                      placeholder="What is it?"
                      className="input flex-1 !py-1.5 text-xs"
                    />
                    <button onClick={submitEdit} disabled={!editDraft.start || !editDraft.end || !editDraft.title.trim()} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-[11px] text-muted hover:text-ink">Cancel</button>
                  </div>
                </div>
              ) : null}

              {workout && expanded ? (
                <div className="animate-slide-in ml-[26px] mt-1.5 rounded-lg border border-line bg-paper p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted">
                      {workout.durationMin} min · {LEVEL_META[workout.level].label}
                    </span>
                    <a
                      href={sessionVideoUrl(workout.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-[11px] font-semibold text-fitness-bright hover:underline"
                    >
                      ▶ Watch the session
                    </a>
                  </div>
                  <ul className="space-y-1">
                    {workout.exercises.map((ex) => (
                      <li key={ex.name} className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="min-w-0">
                          <span className="font-medium">{ex.name}</span>
                          <span className="text-muted"> · {ex.target}</span>
                        </span>
                        <a
                          href={formVideoUrl(ex.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 font-semibold text-fitness-bright hover:underline"
                        >
                          ▶ Form
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
        {dayBlocks.length === 0 ? (
          <li className="px-1.5 py-3 text-center text-xs text-muted">No blocks yet — add one below.</li>
        ) : null}
      </ul>

      {reminderCount > 0 ? (
        <button
          onClick={() =>
            downloadWeeklyICS(
              "vela-schedule-reminders",
              weekBlocks
                .filter((b) => b.reminder)
                .map<WeeklyCalEvent>((b) => ({
                  id: b.id,
                  title: b.title,
                  day: b.day,
                  time: b.start,
                  durationMin: toMinutes(b.end) - toMinutes(b.start),
                })),
            )
          }
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          title="Adds the 🔔 blocks to your phone's calendar as weekly reminders — so they alert you even when Vela is closed"
        >
          📅 Add your {reminderCount} reminders to your calendar
        </button>
      ) : null}

      {adding ? (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-paper p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-muted">
              From
              <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="input !w-auto !py-1 text-xs" />
            </label>
            <label className="flex items-center gap-1 text-[11px] text-muted">
              to
              <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="input !w-auto !py-1 text-xs" />
            </label>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as BlockCategory })}
              className="input !w-auto !py-1 text-xs"
              aria-label="Category"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c].label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="What is it?"
              className="input flex-1 !py-1.5 text-xs"
            />
            <button onClick={submitAdd} disabled={!draft.start || !draft.end || !draft.title.trim()} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="text-[11px] text-muted hover:text-ink">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => setAdding(true)} className="btn-ghost !px-3 !py-1.5 text-xs">
            ＋ Add a block to {DAY_LABEL[sel]}
          </button>
          {confirmReset ? (
            <span className="flex items-center gap-1.5">
              <button
                className="btn text-xs !bg-fitness !text-white"
                onClick={() => {
                  resetWeekBlocks();
                  setConfirmReset(false);
                }}
              >
                Reset all
              </button>
              <button className="text-[11px] text-muted" onClick={() => setConfirmReset(false)}>Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="text-[11px] text-muted hover:text-ink">
              ⟲ Reset to my plan
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
