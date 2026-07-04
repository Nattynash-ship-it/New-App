"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle } from "./ui";
import {
  EQUIPMENT_META,
  LEVEL_META,
  workoutsForEquipment,
  type LibraryWorkout,
} from "@/core/fitness/library";
import { GOAL_META } from "@/core/fitness/plan";
import { useHub } from "@/core/store/hub";
import type { Equipment, FitnessGoal } from "@/core/types";

const ALL_EQUIPMENT = Object.keys(EQUIPMENT_META) as Equipment[];

/** Editable home-gym inventory — filters the library to what you can do. */
export function EquipmentCard() {
  const equipment = useHub((s) => s.equipment);
  const setEquipment = useHub((s) => s.setEquipment);

  function toggle(e: Equipment) {
    if (e === "bodyweight") return; // always available
    setEquipment(
      equipment.includes(e) ? equipment.filter((x) => x !== e) : [...equipment, e],
    );
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">tap what you own</span>}>
        My equipment
      </SectionTitle>
      <div className="flex flex-wrap gap-2">
        {ALL_EQUIPMENT.map((e) => {
          const meta = EQUIPMENT_META[e];
          const owned = e === "bodyweight" || equipment.includes(e);
          return (
            <button
              key={e}
              onClick={() => toggle(e)}
              aria-pressed={owned}
              disabled={e === "bodyweight"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                owned
                  ? "border-fitness bg-fitness-soft text-fitness-bright"
                  : "border-line text-muted hover:border-ink/25"
              }`}
            >
              <span aria-hidden>{meta.icon}</span>
              {meta.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function LevelDots({ level }: { level: LibraryWorkout["level"] }) {
  const { dots, label } = LEVEL_META[level];
  return (
    <span className="inline-flex items-center gap-0.5" title={label} aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < dots ? "bg-fitness" : "bg-ink/15"}`}
        />
      ))}
    </span>
  );
}

function WorkoutCard({ workout }: { workout: LibraryWorkout }) {
  const routines = useHub((s) => s.routines);
  const addRoutineWithExercises = useHub((s) => s.addRoutineWithExercises);
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const added = justAdded || routines.some((r) => r.name === workout.name);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{workout.name}</h3>
          <p className="mt-0.5 text-xs text-muted">{workout.focus}</p>
        </div>
        <LevelDots level={workout.level} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span className="chip bg-fitness-soft text-fitness-bright">⏱ {workout.durationMin} min</span>
        {workout.goals.map((g) => (
          <span key={g} className="chip border border-line">
            {GOAL_META[g].label}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {workout.equipment.map((e) => (
          <span key={e} title={EQUIPMENT_META[e].label} aria-label={EQUIPMENT_META[e].label}>
            {EQUIPMENT_META[e].icon}
          </span>
        ))}
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="mt-2.5 text-xs font-medium text-fitness-bright"
        aria-expanded={open}
      >
        {open ? "Hide exercises" : `See ${workout.exercises.length} exercises`}
      </button>
      {open ? (
        <ul className="mt-2 space-y-1">
          {workout.exercises.map((ex, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-paper px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium">{ex.name}</span>
              <span className="shrink-0 text-muted">{ex.target}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        onClick={() => {
          if (added) return;
          addRoutineWithExercises(workout.name, workout.focus, workout.exercises);
          setJustAdded(true);
        }}
        disabled={added}
        className={`mt-3 w-full rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
          added
            ? "cursor-default bg-fitness-soft text-fitness-bright"
            : "btn-primary"
        }`}
      >
        {added ? "✓ In your routines" : "＋ Add to my routines"}
      </button>
    </div>
  );
}

export function WorkoutLibrary() {
  const equipment = useHub((s) => s.equipment);
  const [goal, setGoal] = useState<FitnessGoal | "all">("all");

  const doable = useMemo(() => workoutsForEquipment(equipment), [equipment]);
  const shown = goal === "all" ? doable : doable.filter((w) => w.goals.includes(goal));
  const goalOptions: Array<FitnessGoal | "all"> = ["all", "strength", "sculpt", "conditioning", "mobility"];

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">{doable.length} you can do at home</span>}>
        Workout library
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Full routines built for your gear. Tap one to drop it straight into your routines — then log
        it like any other session.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {goalOptions.map((g) => (
          <button
            key={g}
            onClick={() => setGoal(g)}
            aria-pressed={goal === g}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              goal === g ? "border-fitness bg-fitness-soft text-fitness-bright" : "border-line text-muted hover:border-ink/25"
            }`}
          >
            {g === "all" ? "All" : GOAL_META[g].label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          No workouts match that filter with your current equipment. Add gear above or pick another
          goal.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}
    </Card>
  );
}
