"use client";

import { useState } from "react";
import { Card, EmptyState, InlineAdd, PageHeader, ProgressBar, SectionTitle, Skeleton } from "@/components/ui";
import { HabitStreaks } from "@/components/HabitStreaks";
import { WaterCard } from "@/components/WaterCard";
import { WeightTracker } from "@/components/WeightTracker";
import { GluteProgram } from "@/components/GluteProgram";
import { EquipmentCard, WorkoutLibrary } from "@/components/WorkoutLibrary";
import { FoolproofPlan } from "@/components/FoolproofPlan";
import { SectionTasks } from "@/components/SectionTasks";
import { Attachments } from "@/components/Attachments";
import { MicButton } from "@/components/MicButton";
import { formatFriendly, todayISO, addDays } from "@/core/dates";
import { formVideoUrl } from "@/core/fitness/library";
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
  const removeRoutine = useHub((s) => s.removeRoutine);
  const addExercise = useHub((s) => s.addExercise);
  const removeExercise = useHub((s) => s.removeExercise);
  const [effort, setEffort] = useState<WorkoutLog["effort"] | null>(null);
  const [note, setNote] = useState("");
  const [justLogged, setJustLogged] = useState(false);

  if (!routine) return null;
  const lastLog = logs.find((l) => l.routineId === routine.id);
  const loggedToday = logs.some((l) => l.routineId === routine.id && l.date === todayISO());

  return (
    <Card>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{routine.name}</h3>
          <p className="text-xs text-muted">{routine.focus}</p>
        </div>
        <button
          onClick={() => removeRoutine(routine.id)}
          aria-label={`Delete routine ${routine.name}`}
          className="rounded-full px-1.5 text-sm text-muted opacity-40 transition-opacity hover:bg-fitness-soft hover:text-fitness-bright hover:opacity-100"
        >
          ×
        </button>
      </div>
      <ul className="space-y-1 text-xs">
        {routine.exercises.map((ex) => (
          <li key={ex.id} className="group flex items-baseline justify-between gap-2 rounded-lg bg-paper px-2.5 py-1.5">
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
            <span className="flex shrink-0 items-center gap-1">
              <span className="text-muted">{ex.target}</span>
              <button
                onClick={() => removeExercise(routine.id, ex.id)}
                aria-label={`Remove ${ex.name}`}
                className="rounded-full px-1 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      <InlineAdd
        placeholder='Add exercise ("Hip Thrust — 4 × 12")'
        onAdd={(value) => {
          const [name, target] = value.split(/\s*[—-]\s*/, 2);
          addExercise(routine.id, (name ?? value).trim(), (target ?? "").trim());
        }}
      />

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
  const removeWorkoutLog = useHub((s) => s.removeWorkoutLog);
  const recent = logs.slice(0, 6);

  return (
    <Card>
      <SectionTitle>Recent sessions</SectionTitle>
      {recent.length === 0 ? (
        <EmptyState>No sessions logged yet — tap an effort level above to start.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {recent.map((l) => (
            <li key={l.id} className="group flex items-center justify-between gap-3 py-2 text-sm">
              <span>{routines.find((r) => r.id === l.routineId)?.name ?? "Workout"}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {formatFriendly(l.date)} · effort {l.effort}/5
                <button
                  onClick={() => removeWorkoutLog(l.id)}
                  aria-label="Delete log entry"
                  className="rounded-full px-1 opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddRoutine() {
  const addRoutine = useHub((s) => s.addRoutine);
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");

  return (
    <form
      className="card flex flex-wrap items-center gap-2 border-dashed p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          addRoutine(name.trim(), focus.trim() || "Custom routine");
          setName("");
          setFocus("");
        }
      }}
    >
      <span className="text-sm text-muted">New routine</span>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Routine name" className="input min-w-[150px] flex-1 !py-1.5 text-xs" />
      <MicButton value={name} onChange={setName} />
      <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus (e.g. Upper body)" className="input min-w-[150px] flex-1 !py-1.5 text-xs" />
      <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs" disabled={!name.trim()}>
        Create
      </button>
    </form>
  );
}

function TrainingPlans() {
  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">tap to open</span>}>
        Training plans
      </SectionTitle>
      <a
        href="/plans/8-week-glute-sculpt-tracker.pdf"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5 transition-colors hover:border-accent"
      >
        <span className="text-xl" aria-hidden>📄</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">8-Week Glute &amp; Sculpt Tracker</span>
          <span className="block text-xs text-muted">7-page PDF · progressive glute + sculpt program</span>
        </span>
        <span className="shrink-0 text-xs font-medium text-accent">Open →</span>
      </a>
      <Attachments ownerType="general" ownerId="fitness" label="My plans & PDFs" />
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
        subtitle="Pick goals once — the plan, targets, streaks, and habits follow automatically."
      />

      {/* Quick add front and center */}
      <SectionTasks domain="fitness" title="Fitness tasks" />

      {/* Everyday wellness — habits & hydration */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HabitStreaks manage />
        </div>
        <div className="lg:col-span-2">
          <WaterCard />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GoalsCard />
        <WeekPlanCard />
      </div>

      {/* Weight-loss accountability — log weight, set a goal, watch the trend */}
      <WeightTracker />

      {/* The foolproof plan — workouts + meal prep + groceries for your goal */}
      <FoolproofPlan />

      {/* The 8-Week Glute program — every day labeled with its workouts, tracked */}
      <GluteProgram />

      {/* Training plans — the printable 8-week glute PDF + your own uploads */}
      <TrainingPlans />

      {/* At-home workout library — pick from full routines built for your gear */}
      <EquipmentCard />
      <WorkoutLibrary />

      <div>
        <SectionTitle right={<span className="text-xs text-muted">tap an effort to log</span>}>
          My routines
        </SectionTitle>
        <div className="grid gap-5 lg:grid-cols-3">
          {routineIds.map((id) => (
            <RoutineCard key={id} routineId={id} />
          ))}
        </div>
      </div>
      <AddRoutine />
      <History />
    </div>
  );
}
