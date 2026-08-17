"use client";

import { useState } from "react";
import { Card, ProgressBar, SectionTitle } from "./ui";
import { Collapsible } from "./Collapsible";
import { formVideoUrl } from "@/core/fitness/library";
import { formatShort, todayISO } from "@/core/dates";
import {
  GLUTE_PROGRAM,
  ORDERED_DAYS,
  PROGRAM_TOTAL_SESSIONS,
  PROGRAM_WEEKS,
  TRAINING_DAYS,
  programCellKey,
  programCurrentWeek,
  programDayDate,
  programDaysUntilStart,
  programEndDate,
  programHasStarted,
  programWeekRange,
  type ProgramDay,
} from "@/core/fitness/pdfTracker";
import { useHub } from "@/core/store/hub";

function DayRow({ day, week, date }: { day: ProgramDay; week: number; date: string }) {
  const progress = useHub((s) => s.programProgress);
  const toggleTrackerDay = useHub((s) => s.toggleTrackerDay);
  const addRoutineWithExercises = useHub((s) => s.addRoutineWithExercises);
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const done = !!progress[programCellKey(week, day.day)];
  const weeksDone = Array.from({ length: PROGRAM_WEEKS }, (_, i) =>
    progress[programCellKey(i + 1, day.day)] ? 1 : 0,
  ).reduce((a: number, b) => a + b, 0);

  return (
    <div className={`rounded-xl border transition-colors ${done ? "border-fitness bg-fitness-soft" : "border-line bg-paper"}`}>
      <div className="flex items-start gap-2 p-3">
        <button
          onClick={() => toggleTrackerDay(week, day.day)}
          aria-pressed={done}
          aria-label={`Mark ${day.name} week ${week} ${done ? "not done" : "done"}`}
          className={`mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-md border transition-colors ${
            done ? "border-fitness bg-fitness text-white" : "border-ink/25 bg-surface hover:border-fitness"
          }`}
        >
          {done ? (
            <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : null}
        </button>
        <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="text-sm font-semibold">{day.name}</span>
            <span className="text-[11px] font-medium text-fitness-bright">{formatShort(date)}</span>
            <span className="text-[11px] text-muted">· {day.exercises.length} moves</span>
          </span>
          <span className="block text-xs text-muted">{day.focus}</span>
          {/* 8-week dot strip — how consistently this day gets done */}
          <span className="mt-1.5 flex items-center gap-1" aria-label={`${weeksDone} of ${PROGRAM_WEEKS} weeks done`}>
            {Array.from({ length: PROGRAM_WEEKS }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  progress[programCellKey(i + 1, day.day)]
                    ? "bg-fitness"
                    : i + 1 === week
                      ? "bg-fitness/30 ring-1 ring-fitness"
                      : "bg-ink/15"
                }`}
              />
            ))}
          </span>
        </button>
        <span className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
          ›
        </span>
      </div>

      {open ? (
        <div className="animate-slide-in border-t border-line px-3 pb-3 pt-2">
          <ul className="space-y-1 text-xs">
            {day.exercises.map((ex, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 rounded-lg bg-surface/60 px-2.5 py-1.5">
                <span className="min-w-0">
                  {ex.name}
                  <a
                    href={formVideoUrl(ex.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1.5 whitespace-nowrap text-[10px] font-semibold text-fitness-bright hover:underline"
                    title={`Watch proper form for ${ex.name}`}
                  >
                    ▶ form
                  </a>
                </span>
                <span className="shrink-0 font-medium text-muted tabular-nums">{ex.scheme}</span>
              </li>
            ))}
          </ul>
          <button
            className="btn-ghost mt-2 !px-3 !py-1.5 text-[11px]"
            onClick={() => {
              addRoutineWithExercises(
                `${day.name} — ${day.focus}`,
                day.focus,
                day.exercises.map((e) => ({ name: e.name, target: e.scheme })),
              );
              setAdded(true);
              setTimeout(() => setAdded(false), 2500);
            }}
          >
            {added ? "Added to My routines ✓" : "Add to My routines"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function GluteProgram() {
  const progress = useHub((s) => s.programProgress);
  const week = useHub((s) => s.programWeek);
  const startDate = useHub((s) => s.trackerStartDate);
  const setProgramWeek = useHub((s) => s.setProgramWeek);
  const restartTracker = useHub((s) => s.restartTracker);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(startDate);

  const doneTotal = Object.values(progress).filter(Boolean).length;
  const weekDone = TRAINING_DAYS.filter((d) => progress[programCellKey(week, d.day)]).length;
  const [weekStart, weekEnd] = programWeekRange(startDate, week);
  const endDate = programEndDate(startDate);
  const today = todayISO();
  const currentWeek = programCurrentWeek(startDate, today);
  const started = programHasStarted(startDate, today);
  const daysUntil = programDaysUntilStart(startDate, today);

  return (
    <Card>
      <SectionTitle
        right={
          <span className="chip bg-fitness-soft text-fitness-bright">
            {doneTotal}/{PROGRAM_TOTAL_SESSIONS} sessions
          </span>
        }
      >
        {GLUTE_PROGRAM.title}
      </SectionTitle>
      <p className="-mt-1 mb-2 text-xs text-muted">
        6 days a week · at home · {formatShort(startDate)} → {formatShort(endDate)}
      </p>

      {/* Start date + restart control */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-[11px]">
        <span className="text-muted">
          {started ? (
            <>Started Sun, {formatShort(startDate)}</>
          ) : (
            <>
              Starts Sun, {formatShort(startDate)}
              <span className="ml-1 text-fitness-bright">· in {daysUntil} day{daysUntil === 1 ? "" : "s"}</span>
            </>
          )}
        </span>
        <button
          className="btn-ghost !px-2.5 !py-1 text-[11px]"
          onClick={() => {
            setDraft(startDate);
            setEditing((v) => !v);
          }}
        >
          {editing ? "Cancel" : "Restart…"}
        </button>
      </div>
      {editing ? (
        <form
          className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            restartTracker(draft);
            setEditing(false);
          }}
        >
          <label className="text-[11px] text-muted">
            Start date
            <input
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="input ml-2 !w-auto !py-1.5 text-xs"
            />
          </label>
          <button type="submit" className="btn-primary !px-3 !py-1.5 text-[11px]">
            Restart &amp; clear progress
          </button>
          <span className="text-[10px] text-muted">Clears every checkmark and re-anchors Week 1.</span>
        </form>
      ) : null}

      {/* Week selector + this-week progress */}
      <div className="rounded-xl border border-line bg-paper p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Week</span>
            {started && week === currentWeek ? (
              <span className="chip bg-fitness-soft !py-0 text-[10px] text-fitness-bright">this week</span>
            ) : null}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              className="btn-ghost !px-2 !py-0.5 text-xs"
              onClick={() => setProgramWeek(week - 1)}
              disabled={week <= 1}
              aria-label="Previous week"
            >
              −
            </button>
            <span className="w-14 text-center text-sm font-semibold tabular-nums">
              {week} / {PROGRAM_WEEKS}
            </span>
            <button
              className="btn-ghost !px-2 !py-0.5 text-xs"
              onClick={() => setProgramWeek(week + 1)}
              disabled={week >= PROGRAM_WEEKS}
              aria-label="Next week"
            >
              +
            </button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {formatShort(weekStart)} – {formatShort(weekEnd)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar pct={(weekDone / TRAINING_DAYS.length) * 100} colorClass="bg-fitness" />
          <span className="shrink-0 text-[11px] text-muted tabular-nums">
            {weekDone}/{TRAINING_DAYS.length} days
          </span>
        </div>
      </div>

      {/* The days, Sunday-first, labeled with their date + workouts */}
      <div className="mt-3 space-y-2">
        {ORDERED_DAYS.map((day) => {
          const date = programDayDate(startDate, week, day.day);
          if (day.rest) {
            return (
              <div key={day.day} className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5">
                <span className="text-sm font-semibold">{day.name}</span>
                <span className="text-[11px] font-medium text-muted">{formatShort(date)}</span>
                <span className="text-xs text-muted">· {day.note}</span>
              </div>
            );
          }
          return <DayRow key={day.day} day={day} week={week} date={date} />;
        })}
      </div>

      {/* Equipment & rules, tucked away */}
      <div className="mt-3">
        <Collapsible title="Equipment & rules for max results" icon="🎒">
          <div className="space-y-3 text-xs">
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wider text-muted">Equipment</p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted">
                {GLUTE_PROGRAM.equipment.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wider text-muted">Rules</p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted">
                {GLUTE_PROGRAM.rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </Collapsible>
      </div>
    </Card>
  );
}
