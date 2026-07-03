"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle } from "./ui";
import { addDays, formatShort, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";

const DAYS = 14;
const COL_W = 20; // 14px bar + 6px gap
const BAR_W = 14;
const PLOT_H = 64;
const CHART_W = DAYS * COL_W - 6;
// Theme-aware chart colors via CSS variables (contrast validated per theme).
const BAR_COLOR = "rgb(var(--accent))";
const GRID_COLOR = "var(--line)";
const LABEL_COLOR = "rgb(var(--muted))";
const DOT_COLOR = "rgb(var(--ink))";

const MOOD_LABEL: Record<number, string> = {
  1: "Heavy",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
};

/** Bar path with rounded top corners, square base anchored to the baseline. */
function barPath(x: number, h: number): string {
  const r = Math.min(3.5, h / 2);
  const top = PLOT_H - h;
  return [
    `M ${x} ${PLOT_H}`,
    `V ${top + r}`,
    `Q ${x} ${top} ${x + r} ${top}`,
    `H ${x + BAR_W - r}`,
    `Q ${x + BAR_W} ${top} ${x + BAR_W} ${top + r}`,
    `V ${PLOT_H}`,
    "Z",
  ].join(" ");
}

interface DayPoint {
  date: string;
  mood: number | null; // averaged across morning/evening; null = no check-in
}

export function MoodTrend() {
  const checkIns = useHub((s) => s.checkIns);
  const [active, setActive] = useState<number | null>(null);

  const points = useMemo<DayPoint[]>(() => {
    const today = todayISO();
    return Array.from({ length: DAYS }, (_, i) => {
      const date = addDays(today, i - (DAYS - 1));
      const moods = checkIns.filter((c) => c.date === date).map((c) => c.mood);
      return {
        date,
        mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
      };
    });
  }, [checkIns]);

  const logged = points.filter((p) => p.mood !== null);
  if (logged.length === 0) return null; // nothing to show until the first check-in

  const activePoint = active !== null ? points[active] : undefined;

  return (
    <Card>
      <SectionTitle
        right={
          activePoint?.mood != null ? (
            <span className="text-xs tabular-nums text-muted">
              {formatShort(activePoint.date)} · {MOOD_LABEL[Math.round(activePoint.mood)]}
            </span>
          ) : (
            <span className="text-xs text-muted">
              {logged.length} check-in day{logged.length === 1 ? "" : "s"}
            </span>
          )
        }
      >
        Mood, last {DAYS} days
      </SectionTitle>

      <svg
        viewBox={`0 0 ${CHART_W} ${PLOT_H + 14}`}
        className="w-full max-w-md"
        role="img"
        aria-label={`Mood over the last ${DAYS} days`}
        onMouseLeave={() => setActive(null)}
      >
        {/* recessive baseline */}
        <line x1="0" y1={PLOT_H + 0.5} x2={CHART_W} y2={PLOT_H + 0.5} style={{ stroke: GRID_COLOR }} strokeWidth="1" />

        {points.map((p, i) => {
          const x = i * COL_W;
          const isActive = active === i;
          return (
            <g key={p.date}>
              {p.mood !== null ? (
                <path
                  d={barPath(x, Math.max(6, (p.mood / 5) * PLOT_H))}
                  style={{ fill: BAR_COLOR }}
                  opacity={active === null || isActive ? 1 : 0.45}
                />
              ) : (
                // no check-in that day — faint placeholder at the baseline
                <circle cx={x + BAR_W / 2} cy={PLOT_H - 3} r="1.5" style={{ fill: DOT_COLOR }} opacity="0.18" />
              )}
              {/* full-column hit target for hover */}
              <rect
                x={x - 3}
                y="0"
                width={COL_W}
                height={PLOT_H + 14}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
              >
                <title>
                  {formatShort(p.date)}:{" "}
                  {p.mood !== null ? MOOD_LABEL[Math.round(p.mood)] : "No check-in"}
                </title>
              </rect>
              {/* sparse x labels: first, middle, today */}
              {i === 0 || i === Math.floor(DAYS / 2) || i === DAYS - 1 ? (
                <text
                  x={i === 0 ? x : i === DAYS - 1 ? x + BAR_W : x + BAR_W / 2}
                  y={PLOT_H + 11}
                  textAnchor={i === 0 ? "start" : i === DAYS - 1 ? "end" : "middle"}
                  fontSize="6.5"
                  style={{ fill: LABEL_COLOR }}
                >
                  {i === DAYS - 1 ? "Today" : formatShort(p.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* screen-reader table alternative */}
      <ul className="sr-only">
        {logged.map((p) => (
          <li key={p.date}>
            {p.date}: mood {MOOD_LABEL[Math.round(p.mood ?? 3)]}
          </li>
        ))}
      </ul>
    </Card>
  );
}
