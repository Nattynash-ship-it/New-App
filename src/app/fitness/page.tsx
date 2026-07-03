"use client";

import { useState } from "react";
import { Card, EmptyState, PageHeader, ProgressBar, SectionTitle, Skeleton } from "@/components/ui";
import { formatFriendly, todayISO, addDays } from "@/core/dates";
import { GOAL_META, recommendPlan } from "@/core/fitness/plan";
import { fitnessWeek } from "@/core/selectors";
import { useHub, useHydrated } from "@/core/store/hub";
import type { FitnessGoal, WorkoutLog } from "@/core/types";

const EFFORTS: Array<{ value: WorkoutLog["effort"]; label: string }> = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Light" },
  { value: 3, label: "Solid" },
  { value: 4, label: "Hard" },
  { value: 5, label: "Max" },
];

const ALL_GOALS = Object.keys(GOAL_META) as FitnessGoal[];

function GoalsCard() {
  const goals = useHub((s) => s.fitnessGoals);
  const setFitnessGoals = useHub((s) => s.setFitnessGoals);
  const target = useHub((s) => s.weeklySessionTarget);
  const setTarget = useHub((s) => s.setWeeklySessionTarget);

  function toggle(goal: FitnessGoal) {
    setFitnessGoals(
      goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal],
    );
  }

  return (
    <Card>
      <SectionTitle
        right={
          <span className="flex items-center gap-1.5 text-xs text-muted">
            Weekly target
            <button className="btn-ghost !px-2 !py-0.5 text-xs" onClick={() => setTarget(target - 1)} aria-label="Decrease target">
              −
            </button>
            <span className="w-4 text-center font-semibold text-ink">{target}</span>
            <button className="btn-ghost !px-2 !py-0.5 text-xs" onClick={() => setTarget(target + 1)} aria-label="Increase target">
              +
            </button>
          </span>
        }
      >
        My goals
      </SectionTitle>
      <div className="flex flex-wrap gap-2">
        {ALL_GOALS.map((g) => {
          const meta = GOAL_META[g];
          const active = goals.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              aria-pressed={active}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                active
                  ? "border-fitness bg-fitness-soft"
                  : "border-line hover:border-ink/25"
              }`}
            >
              <span className={`block text-xs font-semibold ${active ? "text-fitness-bright" : ""}`}>
                {meta.label}
              </span>
              <span className="block text-[10px] text-muted">{meta.blurb}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function WeekPlanCard() {
  const goals = useHub((s) => s.fitnessGoals);
  const routines = useHub((s) => s.routines);
  const state = useHub();
  const { sessionsThisWeek, target, weekStreak } = fitnessWeek(state);
  const plan = recommendPlan(goals);

  return (
    <Card>
      <SectionTitle
        right={
          weekStreak > 0 ? (
            <span className="chip bg-fitness-soft text-fitness-bright">
              🔥 {weekStreak}-week streak
            </span>
          ) : undefined
        }
      >
        This week
      </SectionTitle>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl">{sessionsThisWeek}</span>
        <span className="text-sm text-muted">of {target} sessions</span>
      </div>
      <div className="mt-2">
        <ProgressBar pct={(sessionsThisWeek / target) * 100} colorClass="bg-fitness" />
      </div>
      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Recommended split for your goals
      </p>
      <ul className="space-y-1">
        {plan.map((line) => {
          const routine = routines.find((r) => r.id === line.routineId);
          return (
            <li key={line.routineId} className="flex items-baseline justify-between gap-3 rounded-lg bg-paper px-2.5 py-1.5 text-xs">
              <span>
                <span className="font-medium">{routine?.name}</span>
                <span className="text-muted"> ×{line.sessions}</span>
              </span>
              <span className="shrink-0 text-[10px] text-muted">{line.reason}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function RoutineCard({ routineId }: { routineId: string }) {
  const routine = useHub((s) => s.routines.find((r) => r.id === routineId));
  const logs = useHub((s) => s.workoutLogs);
  const logWorkout = useHub((s) => s.logWorkout);
  const [effort, setEffort] = useState<WorkoutLog["effort"] | null>(null);
  const [note, setNote] = useState("");
  const [justLogged, setJustLogged] = useState(false);

  if (!routine) return null;
  const lastLog = logs.find((l) => l.routineId === routine.id);
  const loggedToday = logs.some((l) => l.routineId === routine.id && l.date === todayISO());

  return (
    <Card>
      <div className="mb-2">
        <h3 className="text-sm font-semibold">{routine.name}</h3>
        <p className="text-xs text-muted">{routine.focus}</p>
      </div>
      <ul className="space-y-1 text-xs">
        {routine.exercises.map((ex) => (
          <li key={ex.id} className="flex items-baseline justify-between gap-3 rounded-lg bg-paper px-2.5 py-1.5">
            <span>{ex.name}</span>
            <span className="shrink-0 text-muted">{ex.target}</span>
          </li>
        ))}
      </ul>

      {loggedToday || justLogged ? (
        <p className="mt-3 rounded-xl bg-fitness-soft px-3 py-2 text-xs text-fitness-bright">
          Logged for today — nice work.
        </p>
      ) : (
        <div className="mt-3">
          <div className="flex gap-1.5">
            {EFFORTS.map((e) => (
              <button
                key={e.value}
                onClick={() => setEffort(e.value)}
                className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition-colors ${
                  effort === e.value
                    ? "border-fitness bg-fitness-soft text-fitness-bright"
                    : "border-line text-muted hover:border-ink/25"
                }`}
                aria-pressed={effort === e.value}
              >
                {e.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (weight, reps, how it felt)"
              className="input !py-1.5 text-xs"
              maxLength={120}
            />
            <button
              className="btn-primary shrink-0 !px-3 !py-1.5 text-xs"
              disabled={effort === null}
              onClick={() => {
                if (effort !== null) {
                  logWorkout(routine.id, effort, note.trim());
                  setJustLogged(true);
                  setNote("");
                }
              }}
            >
              Log
            </button>
          </div>
        </div>
      )}
      {lastLog && !loggedToday && !justLogged ? (
        <p className="mt-2 text-[11px] text-muted">
          Last: {formatFriendly(lastLog.date)} · effort {lastLog.effort}/5
          {lastLog.note ? ` · “${lastLog.note}”` : ""}
        </p>
      ) : null}
    </Card>
  );
}

function History() {
  const logs = useHub((s) => s.workoutLogs);
  const routines = useHub((s) => s.routines);
  const recent = logs.slice(0, 6);

  return (
    <Card>
      <SectionTitle>Recent sessions</SectionTitle>
      {recent.length === 0 ? (
        <EmptyState>No sessions logged yet — tap an effort level above to start.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {recent.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{routines.find((r) => r.id === l.routineId)?.name ?? "Workout"}</span>
              <span className="text-xs text-muted">
                {formatFriendly(l.date)} · effort {l.effort}/5
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function FitnessPage() {
  const hydrated = useHydrated();
  const routineIds = useHub((s) => s.routines).map((r) => r.id);

  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fitness & Wellness"
        title="Your training"
        subtitle="Pick goals once — the plan, targets, and streaks follow automatically."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <GoalsCard />
        <WeekPlanCard />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {routineIds.map((id) => (
          <RoutineCard key={id} routineId={id} />
        ))}
      </div>
      <History />
    </div>
  );
}
