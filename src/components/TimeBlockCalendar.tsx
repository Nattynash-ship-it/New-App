"use client";

import { useRef, useState } from "react";
import { Card, DOMAIN_STYLES, SectionTitle } from "./ui";
import { selectDayBlocks, type DayBlock } from "@/core/selectors";
import { addDays, formatTime, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";
import type { ParsedIntentKind } from "@/core/types";

const PX_PER_MIN = 0.8; // 60 min = 48px

const ADD_KINDS: Array<{ value: ParsedIntentKind; label: string }> = [
  { value: "event", label: "Event" },
  { value: "meeting", label: "Meeting" },
  { value: "assignment", label: "Assignment" },
  { value: "family_activity", label: "Family" },
  { value: "meal", label: "Meal" },
  { value: "workout", label: "Workout" },
];

interface Positioned extends DayBlock {
  lane: number;
  lanes: number;
}

/** Greedy interval-graph colouring so overlapping blocks sit side by side. */
function packLanes(blocks: DayBlock[]): Positioned[] {
  const laneEnds: number[] = [];
  const withLane = blocks.map((b) => {
    let lane = laneEnds.findIndex((end) => end <= b.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(b.endMin);
    } else {
      laneEnds[lane] = b.endMin;
    }
    return { ...b, lane };
  });
  // Per-block lane count = how many blocks it actually overlaps with.
  return withLane.map((b) => {
    const overlapping = withLane.filter((o) => o.startMin < b.endMin && o.endMin > b.startMin);
    const lanes = Math.max(...overlapping.map((o) => o.lane), b.lane) + 1;
    return { ...b, lanes };
  });
}

function fmtDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TimeBlockCalendar() {
  const state = useHub();
  const addFromIntent = useHub((s) => s.addFromIntent);
  const removeTimelineItem = useHub((s) => s.removeTimelineItem);
  const [selected, setSelected] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const date = addDays(todayISO(), offset);
  const isToday = offset === 0;
  const { timed, allDay } = selectDayBlocks(state, date);

  // Add-event form state
  const gridRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTime, setDraftTime] = useState("09:00");
  const [draftKind, setDraftKind] = useState<ParsedIntentKind>("event");

  // Grid bounds: 7am–9pm by default, widened to fit anything earlier/later.
  let startHour = 7;
  let endHour = 21;
  for (const b of timed) {
    startHour = Math.min(startHour, Math.floor(b.startMin / 60));
    endHour = Math.max(endHour, Math.ceil(b.endMin / 60));
  }
  const startMin = startHour * 60;
  const totalMin = endHour * 60 - startMin;
  const height = totalMin * PX_PER_MIN;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const positioned = packLanes(timed);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= startMin && nowMin <= endHour * 60;

  function openAdd(atMin?: number) {
    const base = atMin ?? (isToday ? nowMin : 9 * 60);
    const snapped = Math.min(endHour * 60 - 15, Math.max(startMin, Math.round(base / 15) * 15));
    setDraftTime(minToHM(snapped));
    setDraftTitle("");
    setDraftKind("event");
    setAdding(true);
  }

  function onGridClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    openAdd(startMin + (e.clientY - rect.top) / PX_PER_MIN);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;
    addFromIntent({ kind: draftKind, title, date, time: draftTime, confidence: 1 });
    setAdding(false);
    setDraftTitle("");
  }

  return (
    <Card>
      <SectionTitle
        right={
          <div className="flex items-center gap-1">
            <button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={() => openAdd()} aria-label="Add event">
              ＋ Add
            </button>
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setOffset(offset - 1)} aria-label="Previous day">
              ‹
            </button>
            {!isToday ? (
              <button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setOffset(0)}>
                Today
              </button>
            ) : null}
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setOffset(offset + 1)} aria-label="Next day">
              ›
            </button>
          </div>
        }
      >
        {isToday ? "Today" : fmtDay(date)}
        <span className="ml-2 text-xs font-normal text-muted">{fmtDay(date)}</span>
      </SectionTitle>

      {adding ? (
        <form
          className="animate-slide-in mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper p-2.5"
          onSubmit={save}
        >
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="New event"
            className="input min-w-[140px] flex-1 !py-1.5 text-xs"
          />
          <input
            type="time"
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            className="input !w-auto !py-1.5 text-xs"
            aria-label="Time"
          />
          <select
            value={draftKind}
            onChange={(e) => setDraftKind(e.target.value as ParsedIntentKind)}
            className="input !w-auto !py-1.5 text-xs"
            aria-label="Type"
          >
            {ADD_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs" disabled={!draftTitle.trim()}>
            Add
          </button>
          <button type="button" className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      ) : null}

      {allDay.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {allDay.map((a) => {
            const style = DOMAIN_STYLES[a.domain];
            return (
              <span key={a.id} className={`chip ${style.soft} ${style.text}`}>
                {a.title}
              </span>
            );
          })}
        </div>
      ) : null}

      {timed.length === 0 && allDay.length === 0 ? (
        <button
          onClick={() => openAdd()}
          className="w-full rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Nothing scheduled — a clear day. ＋ Add something
        </button>
      ) : (
        <div
          ref={gridRef}
          onClick={onGridClick}
          className="relative mt-1 cursor-copy overflow-hidden"
          style={{ height }}
          title="Click a time to add"
        >
          {/* Hour grid */}
          {hours.map((h) => {
            const top = (h * 60 - startMin) * PX_PER_MIN;
            return (
              <div key={h} className="absolute inset-x-0 flex items-start" style={{ top }}>
                <span className="w-12 shrink-0 -translate-y-1.5 pr-2 text-right text-[10px] tabular-nums text-muted">
                  {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
                </span>
                <span className="mt-px h-px flex-1 bg-line" />
              </div>
            );
          })}

          {/* Now indicator */}
          {showNow ? (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
              style={{ top: (nowMin - startMin) * PX_PER_MIN }}
            >
              <span className="ml-11 h-1.5 w-1.5 rounded-full bg-fitness" />
              <span className="h-px flex-1 bg-fitness/70" />
            </div>
          ) : null}

          {/* Blocks */}
          <div className="absolute inset-y-0 left-12 right-0">
            {positioned.map((b) => {
              const style = DOMAIN_STYLES[b.domain];
              const top = (b.startMin - startMin) * PX_PER_MIN;
              const h = Math.max(20, (b.endMin - b.startMin) * PX_PER_MIN - 2);
              const widthPct = 100 / b.lanes;
              const isSelected = selected === b.id;
              return (
                <div
                  key={`${b.domain}-${b.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (b.removable) setSelected(isSelected ? null : b.id);
                  }}
                  className={`group absolute overflow-visible rounded-lg ${style.soft} px-2 py-1 ${
                    b.removable ? "cursor-pointer" : "cursor-default"
                  } ${isSelected ? "ring-2 ring-fitness" : ""}`}
                  style={{
                    top,
                    height: h,
                    left: `calc(${b.lane * widthPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                  }}
                  title={
                    b.removable
                      ? `${b.title} · ${formatTime(minToHM(b.startMin))} · tap to remove`
                      : `${b.title} · ${formatTime(minToHM(b.startMin))}`
                  }
                >
                  <span className={`absolute inset-y-1 left-0 w-1 rounded-full ${style.dot}`} aria-hidden />
                  <p className={`truncate pl-1.5 text-[11px] font-semibold leading-tight ${style.text}`}>
                    {b.title}
                  </p>
                  {h > 30 ? (
                    <p className="truncate pl-1.5 text-[10px] leading-tight text-muted">
                      {formatTime(minToHM(b.startMin))}
                      {b.subtitle ? ` · ${b.subtitle}` : ""}
                    </p>
                  ) : null}
                  {b.removable ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTimelineItem(b.id);
                        setSelected(null);
                      }}
                      aria-label={`Remove ${b.title}`}
                      className={`absolute -right-1.5 -top-1.5 z-30 h-5 w-5 items-center justify-center rounded-full bg-fitness text-[11px] leading-none text-white shadow-card ${
                        isSelected ? "flex" : "hidden group-hover:flex"
                      }`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function minToHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
