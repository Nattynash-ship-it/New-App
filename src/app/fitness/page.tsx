"use client";

import { useState } from "react";
import { Card, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { formatFriendly, todayISO, addDays } from "@/core/dates";
import { useHub, useHydrated } from "@/core/store/hub";
import type { WorkoutLog } from "@/core/types";

const EFFORTS: Array<{ value: WorkoutLog["effort"]; label: string }> = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Light" },
  { value: 3, label: "Solid" },
  { value: 4, label: "Hard" },
  { value: 5, label: "Max" },
];

function WeekDots() {
  const logs = useHub((s) => s.workoutLogs);
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i - 6));
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>Last 7 days:</span>
      {days.map((d) => {
        const logged = logs.some((l) => l.date === d);
        return (
          <span
            key={d}
            title={d}
            className={`h-3 w-3 rounded-full ${logged ? "bg-fitness" : "bg-ink/[0.08]"}`}
          />
        );
      })}
    </div>
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
        title="Your routines"
        subtitle="One tap to log a session — no spreadsheets, no burden."
        action={<WeekDots />}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {routineIds.map((id) => (
          <RoutineCard key={id} routineId={id} />
        ))}
      </div>
      <History />
    </div>
  );
}
