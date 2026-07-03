/**
 * At-home workout library — full, ready-to-run routines built around the
 * essentials most home gyms actually have: a rower, a stationary bike,
 * dumbbells, kettlebells, weighted ropes, a medicine ball, and resistance
 * bands. No studio, no machines. Every workout lists exactly what it needs so
 * the Fitness screen can show only the ones you can do right now, and add any
 * of them to your routines in one tap.
 */

import type { Equipment, FitnessGoal } from "../types";

export const EQUIPMENT_META: Record<Equipment, { label: string; icon: string }> = {
  rower: { label: "Rower", icon: "🚣" },
  bike: { label: "Stationary bike", icon: "🚲" },
  dumbbells: { label: "Dumbbells", icon: "🏋️" },
  kettlebell: { label: "Kettlebells", icon: "🔔" },
  jump_rope: { label: "Weighted rope", icon: "🪢" },
  medicine_ball: { label: "Medicine ball", icon: "⚽" },
  bands: { label: "Resistance bands", icon: "➰" },
  bodyweight: { label: "Bodyweight", icon: "🤸" },
};

export interface LibraryExercise {
  name: string;
  target: string;
}

export type WorkoutLevel = "starter" | "moderate" | "tough";

export interface LibraryWorkout {
  id: string;
  name: string;
  focus: string;
  goals: FitnessGoal[];
  equipment: Equipment[];
  durationMin: number;
  level: WorkoutLevel;
  exercises: LibraryExercise[];
}

export const LEVEL_META: Record<WorkoutLevel, { label: string; dots: number }> = {
  starter: { label: "Starter", dots: 1 },
  moderate: { label: "Moderate", dots: 2 },
  tough: { label: "Tough", dots: 3 },
};

export const WORKOUT_LIBRARY: LibraryWorkout[] = [
  {
    id: "lib_glute_strength",
    name: "Glutes & Posterior Chain",
    focus: "Build the glutes, hamstrings, and back with dumbbells + kettlebell",
    goals: ["strength", "sculpt"],
    equipment: ["dumbbells", "kettlebell"],
    durationMin: 40,
    level: "moderate",
    exercises: [
      { name: "Romanian (Russian) Deadlift", target: "4 × 10 — moderate–heavy" },
      { name: "Kettlebell Hip Thrust", target: "4 × 12" },
      { name: "Bulgarian Split Squat", target: "3 × 10 / leg" },
      { name: "Kettlebell Swing", target: "3 × 15 explosive" },
      { name: "Dumbbell Glute Bridge March", target: "3 × 20 total" },
    ],
  },
  {
    id: "lib_full_body_kb",
    name: "Full-Body Kettlebell Flow",
    focus: "One kettlebell, whole body — strength + conditioning in one",
    goals: ["strength", "conditioning"],
    equipment: ["kettlebell"],
    durationMin: 30,
    level: "moderate",
    exercises: [
      { name: "Kettlebell Goblet Squat", target: "4 × 12" },
      { name: "Single-Arm Clean & Press", target: "3 × 8 / arm" },
      { name: "Kettlebell Swing", target: "4 × 20" },
      { name: "Kettlebell Row", target: "3 × 12 / arm" },
      { name: "Turkish Get-Up", target: "3 × 3 / side, slow" },
    ],
  },
  {
    id: "lib_row_intervals",
    name: "Rower Intervals",
    focus: "Fat-burning intervals on the rowing machine",
    goals: ["conditioning"],
    equipment: ["rower"],
    durationMin: 25,
    level: "tough",
    exercises: [
      { name: "Warm-up row", target: "3 min easy" },
      { name: "Intervals", target: "8 × (250m hard / 90s easy)" },
      { name: "Cool-down row", target: "3 min easy" },
    ],
  },
  {
    id: "lib_bike_hiit",
    name: "Bike HIIT Sprints",
    focus: "Short, brutal, effective — stationary bike sprints",
    goals: ["conditioning"],
    equipment: ["bike"],
    durationMin: 22,
    level: "tough",
    exercises: [
      { name: "Warm-up spin", target: "4 min building" },
      { name: "Sprints", target: "10 × (30s all-out / 60s easy)" },
      { name: "Cool-down spin", target: "3 min easy" },
    ],
  },
  {
    id: "lib_rope_conditioning",
    name: "Weighted Rope Burner",
    focus: "Coordination + cardio with the weighted rope",
    goals: ["conditioning", "habit"],
    equipment: ["jump_rope"],
    durationMin: 20,
    level: "moderate",
    exercises: [
      { name: "Steady skipping", target: "5 × 2 min" },
      { name: "Fast feet intervals", target: "6 × (30s fast / 30s rest)" },
      { name: "Double-under practice", target: "5 × 30s" },
    ],
  },
  {
    id: "lib_medball_core",
    name: "Medicine Ball Core",
    focus: "Power and a strong midsection with the medicine ball",
    goals: ["sculpt", "conditioning"],
    equipment: ["medicine_ball"],
    durationMin: 25,
    level: "moderate",
    exercises: [
      { name: "Medicine Ball Slams", target: "4 × 15" },
      { name: "Russian Twists", target: "3 × 20 total" },
      { name: "Wall Ball Squat-Throws", target: "4 × 12" },
      { name: "Weighted Sit-up Pass", target: "3 × 15" },
      { name: "Plank Ball Rollout", target: "3 × 10" },
    ],
  },
  {
    id: "lib_upper_dumbbell",
    name: "Upper-Body Sculpt",
    focus: "Shoulders, back, and arms with dumbbells + bands",
    goals: ["strength", "sculpt"],
    equipment: ["dumbbells", "bands"],
    durationMin: 35,
    level: "moderate",
    exercises: [
      { name: "Dumbbell Shoulder Press", target: "4 × 10" },
      { name: "Bent-Over Dumbbell Row", target: "4 × 12" },
      { name: "Banded Pull-Apart", target: "3 × 20" },
      { name: "Dumbbell Curl → Hammer Curl", target: "3 × 10 each" },
      { name: "Overhead Triceps Extension", target: "3 × 12" },
    ],
  },
  {
    id: "lib_lower_bands",
    name: "Lower-Body Band Sculpt",
    focus: "Time-under-tension legs & glutes with bands + dumbbells",
    goals: ["sculpt", "strength"],
    equipment: ["bands", "dumbbells"],
    durationMin: 30,
    level: "starter",
    exercises: [
      { name: "Banded Goblet Squat", target: "4 × 15 slow tempo" },
      { name: "Banded Lateral Walks", target: "3 × 15 / direction" },
      { name: "Dumbbell Step-Back Lunge", target: "3 × 12 / leg" },
      { name: "Banded Glute Kickback", target: "3 × 20 / leg" },
    ],
  },
  {
    id: "lib_emom_mix",
    name: "20-Minute Full-Body EMOM",
    focus: "Every minute on the minute — kettlebell, rope & medicine ball",
    goals: ["conditioning", "strength"],
    equipment: ["kettlebell", "jump_rope", "medicine_ball"],
    durationMin: 20,
    level: "tough",
    exercises: [
      { name: "Min 1 · Kettlebell Swings", target: "15 reps" },
      { name: "Min 2 · Rope Skips", target: "45 seconds" },
      { name: "Min 3 · Medicine Ball Slams", target: "12 reps" },
      { name: "Min 4 · Rest", target: "recover" },
      { name: "Repeat", target: "5 rounds = 20 min" },
    ],
  },
  {
    id: "lib_cardio_combo",
    name: "Row + Bike Endurance",
    focus: "Steady-state base-building, easy on the joints",
    goals: ["conditioning", "mobility"],
    equipment: ["rower", "bike"],
    durationMin: 35,
    level: "starter",
    exercises: [
      { name: "Row", target: "12 min steady, conversational" },
      { name: "Bike", target: "15 min steady, conversational" },
      { name: "Row cool-down", target: "5 min easy" },
    ],
  },
  {
    id: "lib_active_recovery",
    name: "Active Recovery & Mobility",
    focus: "Gentle movement for a rest day — keeps the streak alive",
    goals: ["mobility", "habit"],
    equipment: ["bike", "bands", "bodyweight"],
    durationMin: 20,
    level: "starter",
    exercises: [
      { name: "Easy bike spin", target: "10 min very easy" },
      { name: "Banded Shoulder Dislocates", target: "2 × 15" },
      { name: "World's Greatest Stretch", target: "5 / side" },
      { name: "Hip Flexor + Hamstring Stretch", target: "8 min hold series" },
    ],
  },
  {
    id: "lib_quick_core",
    name: "10-Minute Core Finisher",
    focus: "A fast, no-equipment core burn to tack onto any day",
    goals: ["sculpt", "habit"],
    equipment: ["bodyweight"],
    durationMin: 10,
    level: "starter",
    exercises: [
      { name: "Plank", target: "3 × 45s" },
      { name: "Dead Bug", target: "3 × 12" },
      { name: "Side Plank", target: "2 × 30s / side" },
      { name: "Hollow Hold", target: "3 × 20s" },
    ],
  },
];

/** Workouts you can do with the equipment you own (every required piece). */
export function workoutsForEquipment(owned: Equipment[]): LibraryWorkout[] {
  const set = new Set<Equipment>([...owned, "bodyweight"]);
  return WORKOUT_LIBRARY.filter((w) => w.equipment.every((e) => set.has(e)));
}
