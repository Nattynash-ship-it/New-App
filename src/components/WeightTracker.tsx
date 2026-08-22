"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, ProgressBar, SectionTitle } from "./ui";
import { formatShort, todayISO } from "@/core/dates";
import { weightStats } from "@/core/selectors";
import { useHub } from "@/core/store/hub";
import type { WeightUnit } from "@/core/types";

const PLOT_H = 70;
const PLOT_W = 280;
const PAD = 6;

/** A compact line chart of weight over time, with a dashed goal line. */
function WeightChart({
  points,
  goal,
  unit,
}: {
  points: Array<{ date: string; weight: number }>;
  goal: number | null;
  unit: string;
}) {
  const geom = useMemo(() => {
    if (points.length === 0) return null;
    const weights = points.map((p) => p.weight);
    const candidates = goal !== null ? [...weights, goal] : weights;
    let lo = Math.min(...candidates);
    let hi = Math.max(...candidates);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;
    const x = (i: number) =>
      points.length === 1
        ? PLOT_W / 2
        : PAD + (i / (points.length - 1)) * (PLOT_W - PAD * 2);
    const y = (w: number) => PAD + (1 - (w - lo) / (hi - lo)) * (PLOT_H - PAD * 2);
    return { x, y, lo, hi };
  }, [points, goal]);

  if (!geom) return null;
  const { x, y } = geom;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.weight)}`).join(" ");
  const goalY = goal !== null ? y(goal) : null;

  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full max-w-sm"
      role="img"
      aria-label="Weight trend"
    >
      {goalY !== null ? (
        <>
          <line
            x1={PAD}
            y1={goalY}
            x2={PLOT_W - PAD}
            y2={goalY}
            style={{ stroke: "rgb(var(--fitness-bright))" }}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          <text x={PLOT_W - PAD} y={Math.max(8, goalY - 3)} textAnchor="end" fontSize="7" style={{ fill: "rgb(var(--fitness-bright))" }}>
            goal {goal} {unit}
          </text>
        </>
      ) : null}
      {points.length > 1 ? (
        <path d={line} fill="none" style={{ stroke: "rgb(var(--accent))" }} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.weight)} r="2.4" style={{ fill: "rgb(var(--accent))" }}>
          <title>{`${formatShort(p.date)}: ${p.weight} ${unit}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function WeightTracker() {
  const state = useHub();
  const logWeight = useHub((s) => s.logWeight);
  const removeWeightEntry = useHub((s) => s.removeWeightEntry);
  const setWeightGoal = useHub((s) => s.setWeightGoal);
  const setWeightUnit = useHub((s) => s.setWeightUnit);

  const stats = weightStats(state);
  const { weightLog, weightUnit } = state;
  const [entry, setEntry] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  const loggedToday = weightLog.some((e) => e.date === todayISO());
  const recent = weightLog.slice(-30);

  function submitWeight() {
    const n = parseFloat(entry);
    if (!Number.isFinite(n) || n <= 0) return;
    logWeight(n);
    setEntry("");
  }

  function submitGoal() {
    const raw = goalDraft.trim();
    if (raw === "") {
      setWeightGoal(null);
    } else {
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) setWeightGoal(n);
    }
    setEditingGoal(false);
  }

  const changeLabel =
    stats.changeFromStart === null
      ? "—"
      : `${stats.changeFromStart > 0 ? "+" : ""}${stats.changeFromStart} ${weightUnit}`;

  return (
    <Card>
      <SectionTitle
        right={
          <div className="flex overflow-hidden rounded-full border border-line text-[11px]">
            {(["lb", "kg"] as WeightUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setWeightUnit(u)}
                aria-pressed={weightUnit === u}
                className={`px-2.5 py-0.5 transition-colors ${
                  weightUnit === u ? "bg-fitness-soft font-semibold text-fitness-bright" : "text-muted"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        }
      >
        Weight & goal
      </SectionTitle>

      {/* Log today's weight */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitWeight();
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder={loggedToday ? "Update today's weight" : `Today's weight (${weightUnit})`}
          className="input !py-1.5 text-sm"
        />
        <button type="submit" className="btn-primary shrink-0 !px-3 !py-1.5 text-xs" disabled={!entry.trim()}>
          {loggedToday ? "Update" : "Log"}
        </button>
      </form>

      {stats.entryCount === 0 ? (
        <div className="mt-3">
          <EmptyState>Log your weight to start tracking progress toward your goal.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Now" value={`${stats.latest} ${weightUnit}`} />
            <Stat label="Start" value={`${stats.start} ${weightUnit}`} />
            <Stat label="Change" value={changeLabel} />
          </div>

          {recent.length > 0 ? (
            <div className="mt-3">
              <WeightChart points={recent} goal={stats.goal} unit={weightUnit} />
            </div>
          ) : null}

          {stats.goal !== null && stats.goalPct !== null ? (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
                <span>
                  {stats.toGoal !== null && stats.toGoal > 0
                    ? `${stats.toGoal} ${weightUnit} to goal`
                    : "Goal reached — nice work!"}
                </span>
                <span className="tabular-nums">{stats.goalPct}%</span>
              </div>
              <ProgressBar pct={stats.goalPct} colorClass="bg-fitness" />
            </div>
          ) : null}
        </>
      )}

      {/* Goal editor */}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        {editingGoal ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitGoal();
            }}
          >
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              autoFocus
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              placeholder={`Goal weight (${weightUnit}) — blank to clear`}
              className="input !py-1.5 text-xs"
            />
            <button type="submit" className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs">
              Save
            </button>
          </form>
        ) : (
          <>
            <span className="text-muted">
              {stats.goal !== null ? `Goal: ${stats.goal} ${weightUnit}` : "No goal set"}
            </span>
            <button
              className="btn-ghost !px-2.5 !py-1 text-[11px]"
              onClick={() => {
                setGoalDraft(stats.goal !== null ? String(stats.goal) : "");
                setEditingGoal(true);
              }}
            >
              {stats.goal !== null ? "Edit goal" : "Set goal"}
            </button>
          </>
        )}
      </div>

      {weightLog.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-muted">History ({weightLog.length})</summary>
          <ul className="mt-2 divide-y divide-line">
            {[...weightLog].reverse().map((e) => (
              <li key={e.id} className="group flex items-center justify-between py-1.5 text-xs">
                <span className="text-muted">{formatShort(e.date)}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  {e.weight} {weightUnit}
                  <button
                    onClick={() => removeWeightEntry(e.id)}
                    aria-label={`Delete ${e.date} entry`}
                    className="rounded-full px-1 opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
