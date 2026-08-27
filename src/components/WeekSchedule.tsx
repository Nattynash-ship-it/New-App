"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import { formatTime } from "@/core/dates";
import { CATEGORY_META, toMinutes, type BlockCategory } from "@/core/data/weeklySchedule";

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

/**
 * "My Week" — the recurring time-block schedule, one day at a time. Today is
 * selected by default; each day shows its movement + study totals so the goals
 * stay visible. Fully editable: add or remove any block, or reset to the plan.
 */
export function WeekSchedule() {
  const weekBlocks = useHub((s) => s.weekBlocks);
  const addWeekBlock = useHub((s) => s.addWeekBlock);
  const removeWeekBlock = useHub((s) => s.removeWeekBlock);
  const resetWeekBlocks = useHub((s) => s.resetWeekBlocks);

  const today = new Date().getDay();
  const [sel, setSel] = useState(today);
  const [adding, setAdding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
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

  function submitAdd() {
    if (!draft.start || !draft.end || !draft.title.trim()) return;
    addWeekBlock({ day: sel, start: draft.start, end: draft.end, title: draft.title.trim(), category: draft.category });
    setDraft({ start: "", end: "", title: "", category: draft.category });
    setAdding(false);
  }

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-accent" aria-hidden />
      <SectionTitle right={<span className="text-xs text-muted">recurring</span>}>My week</SectionTitle>
      <p className="-mt-1 mb-2 text-xs text-muted">
        Your weekly rhythm — movement at 5&nbsp;AM, study on the train, dinner &amp; reading at 7. Tap a day
        to see or edit it.
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
        <span className="flex gap-1.5">
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
          return (
            <li key={b.id} className="group flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-paper">
              <span className="w-[92px] shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-muted">
                {formatTime(b.start)}–{formatTime(b.end)}
              </span>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm" style={{ background: meta.color }} aria-hidden />
              <span className="min-w-0 flex-1 text-[13px]">{b.title}</span>
              <button
                onClick={() => removeWeekBlock(b.id)}
                aria-label={`Remove ${b.title}`}
                className="shrink-0 rounded-full px-1 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          );
        })}
        {dayBlocks.length === 0 ? (
          <li className="px-1.5 py-3 text-center text-xs text-muted">No blocks yet — add one below.</li>
        ) : null}
      </ul>

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
