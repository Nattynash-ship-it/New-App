"use client";

import { useState } from "react";
import { Card, ProgressBar, SectionTitle } from "./ui";
import { buildGluteProgram, PROGRAM_WEEKS, type ProgramDay } from "@/core/fitness/program";
import { formVideoUrl, LEVEL_META } from "@/core/fitness/library";
import { formatShort, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";

/** A whole-workout video search (the day's session, done at home). */
function workoutVideoUrl(name: string): string {
  const clean = name.replace(/·.*$/, "").replace(/Glute Program.*—\s*/, "").trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${clean} at home workout`)}`;
}

function DayRow({ day, done, isToday, onToggle }: {
  day: ProgramDay;
  done: boolean;
  isToday: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(isToday);
  const title = day.workout.name.replace(/^Glute Program · Day \d+ — /, "");

  return (
    <div className={`rounded-xl border ${isToday ? "border-fitness" : "border-line"} ${done ? "bg-fitness-soft/30" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={onToggle}
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Mark ${day.weekdayLabel} not done` : `Mark ${day.weekdayLabel} complete`}
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border transition-colors ${
            done ? "border-fitness bg-fitness text-white" : "border-ink/25 bg-surface hover:border-fitness"
          }`}
        >
          {done ? (
            <svg width="12" height="9" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : null}
        </button>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className={`text-sm font-semibold ${done ? "text-muted line-through" : ""}`}>
                {day.weekdayLabel}
              </span>
              {isToday ? <span className="chip bg-fitness-soft !text-[10px] text-fitness-bright">Today</span> : null}
              <span className="text-[11px] text-muted">{formatShort(day.date)}</span>
            </span>
            <span className="block truncate text-[11px] text-muted">
              {title} · {day.workout.durationMin} min · {LEVEL_META[day.workout.level].label}
            </span>
          </span>
          <span className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>›</span>
        </button>
      </div>

      {open ? (
        <div className="border-t border-line px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted">{day.workout.focus.replace("8-Week Tracker · ", "")}</p>
            <a
              href={workoutVideoUrl(day.workout.name)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[11px] font-semibold text-fitness-bright hover:underline"
            >
              ▶ Watch the session
            </a>
          </div>
          <ul className="space-y-1">
            {day.workout.exercises.map((ex) => (
              <li key={ex.name} className="flex items-start justify-between gap-2 text-xs">
                <span className="min-w-0">
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-muted"> · {ex.target}</span>
                </span>
                <a
                  href={formVideoUrl(ex.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 font-semibold text-fitness-bright hover:underline"
                  title={`Watch proper form for ${ex.name}`}
                >
                  ▶ Form
                </a>
              </li>
            ))}
          </ul>
          <button
            onClick={onToggle}
            className={`mt-3 w-full rounded-xl py-2 text-sm font-semibold transition-colors ${
              done ? "bg-fitness-soft text-fitness-bright" : "btn-primary"
            }`}
          >
            {done ? "✓ Completed — tap to undo" : "Mark this workout complete"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WeekBlock({ week, days, done, today, onToggle, defaultOpen }: {
  week: number;
  days: ProgramDay[];
  done: Set<string>;
  today: string;
  onToggle: (date: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const doneCount = days.filter((d) => done.has(d.date)).length;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface/70 px-4 py-2.5 text-left transition-colors hover:border-ink/20"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">Week {week}</span>
          <span className="text-[11px] text-muted">{days[0] ? formatShort(days[0].date) : ""}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`chip !text-[10px] ${doneCount === 7 ? "bg-fitness-soft text-fitness-bright" : "border border-line text-muted"}`}>
            {doneCount}/7
          </span>
          <span className={`text-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>›</span>
        </span>
      </button>
      {open ? (
        <div className="mt-2 space-y-1.5">
          {days.map((d) => (
            <DayRow
              key={d.date}
              day={d}
              done={done.has(d.date)}
              isToday={d.date === today}
              onToggle={() => onToggle(d.date)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The 8-week glute program — day by day, expandable, with reps, form videos,
 *  and a completion check per day. Starts on the saved start date (today). */
export function EightWeekProgram() {
  const startDate = useHub((s) => s.programStartDate);
  const programDone = useHub((s) => s.programDone);
  const toggleProgramDay = useHub((s) => s.toggleProgramDay);
  const restartProgram = useHub((s) => s.restartProgram);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const today = todayISO();
  const days = buildGluteProgram(startDate);
  const done = new Set(programDone);
  const totalDone = days.filter((d) => done.has(d.date)).length;
  const currentWeek = Math.min(
    PROGRAM_WEEKS,
    Math.max(1, (days.find((d) => d.date === today)?.week ?? 1)),
  );

  const weeks = Array.from({ length: PROGRAM_WEEKS }, (_, i) => ({
    week: i + 1,
    days: days.filter((d) => d.week === i + 1),
  }));
  const weekNote = days.find((d) => d.week === currentWeek)?.progressionNote;

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-fitness" aria-hidden />
      <SectionTitle
        right={<span className="text-xs text-muted">{totalDone}/{days.length} done</span>}
      >
        8-Week Glute &amp; Sculpt
      </SectionTitle>
      <p className="-mt-1 mb-2 text-xs text-muted">
        A workout every day — including Sundays. Tap a day for the reps + form videos, and check it
        off when you finish.
      </p>
      <ProgressBar pct={(totalDone / days.length) * 100} colorClass="bg-fitness" />
      {weekNote ? <p className="mt-2 text-[11px] font-medium text-fitness-bright">{weekNote}</p> : null}

      <div className="mt-3 space-y-2.5">
        {weeks.map(({ week, days }) => (
          <WeekBlock
            key={week}
            week={week}
            days={days}
            done={done}
            today={today}
            onToggle={toggleProgramDay}
            defaultOpen={week === currentWeek}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {confirmRestart ? (
          <>
            <button
              className="btn text-xs !bg-fitness !text-white"
              onClick={() => {
                restartProgram(today);
                setConfirmRestart(false);
              }}
            >
              Restart from today (clears checks)
            </button>
            <button className="btn-ghost text-xs" onClick={() => setConfirmRestart(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="btn-ghost text-xs" onClick={() => setConfirmRestart(true)}>
            ⟲ Restart from today
          </button>
        )}
        <span className="text-[11px] text-muted">Started {formatShort(startDate)}</span>
      </div>
    </Card>
  );
}
