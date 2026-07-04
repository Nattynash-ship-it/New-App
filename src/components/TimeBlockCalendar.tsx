"use client";

import { useState } from "react";
import { Card, DOMAIN_STYLES, SectionTitle } from "./ui";
import { selectDayBlocks, type DayBlock } from "@/core/selectors";
import { addDays, formatTime, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";

const PX_PER_MIN = 0.8; // 60 min = 48px

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
  const [offset, setOffset] = useState(0);
  const date = addDays(todayISO(), offset);
  const isToday = offset === 0;
  const { timed, allDay } = selectDayBlocks(state, date);

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

  return (
    <Card>
      <SectionTitle
        right={
          <div className="flex items-center gap-1">
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
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Nothing scheduled — a clear day on the calendar. ✦
        </p>
      ) : (
        <div className="relative mt-1 overflow-hidden" style={{ height }}>
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
              return (
                <div
                  key={`${b.domain}-${b.id}`}
                  className={`absolute overflow-hidden rounded-lg ${style.soft} px-2 py-1`}
                  style={{
                    top,
                    height: h,
                    left: `calc(${b.lane * widthPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                  }}
                  title={`${b.title} · ${formatTime(minToHM(b.startMin))}`}
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
