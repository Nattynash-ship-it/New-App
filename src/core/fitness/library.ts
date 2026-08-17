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

  // --- 8-Week Glute & Sculpt Tracker (from the uploaded plan) ---
  // A 6-day split: bands + dumbbells at home. Progressive overload weekly.
  {
    id: "lib_glute_mon",
    name: "Glute Program · Day 1 — Upper Glutes + Arms",
    focus: "8-Week Tracker · upper-glute shelf, triceps/biceps, core",
    goals: ["sculpt", "strength"],
    equipment: ["bands", "dumbbells", "bodyweight"],
    durationMin: 45,
    level: "moderate",
    exercises: [
      { name: "Banded Hip Thrusts (band above knees)", target: "4 × 15" },
      { name: "Frog Pumps", target: "3 × 20" },
      { name: "Banded Lateral Walks", target: "3 × 20 steps" },
      { name: "Standing Kickbacks at 45°", target: "3 × 15 / side" },
      { name: "Seated Banded Hip Abductions (lean forward)", target: "3 × 25" },
      { name: "Tricep Dips on Chair", target: "4 × 12" },
      { name: "Overhead Dumbbell Tricep Extension", target: "3 × 12" },
      { name: "Bicep Curls", target: "3 × 12" },
      { name: "Dead Bugs", target: "3 × 12 / side" },
      { name: "Reverse Crunches", target: "3 × 15" },
      { name: "Forearm Plank", target: "3 × 45 sec" },
    ],
  },
  {
    id: "lib_glute_tue",
    name: "Glute Program · Day 2 — Glutes + Legs",
    focus: "8-Week Tracker · posterior chain, quads, core",
    goals: ["strength", "sculpt"],
    equipment: ["dumbbells", "bodyweight"],
    durationMin: 45,
    level: "moderate",
    exercises: [
      { name: "Dumbbell Romanian Deadlifts", target: "4 × 12" },
      { name: "Bulgarian Split Squats", target: "3 × 10 / side" },
      { name: "Goblet Squats", target: "4 × 12" },
      { name: "Curtsy Lunges", target: "3 × 12 / side" },
      { name: "Single-Leg Glute Bridge", target: "3 × 12 / side" },
      { name: "Calf Raises", target: "3 × 20" },
      { name: "Leg Raises", target: "3 × 15" },
      { name: "Bicycle Crunches", target: "3 × 20" },
      { name: "Side Plank", target: "2 × 30 sec / side" },
    ],
  },
  {
    id: "lib_glute_wed",
    name: "Glute Program · Day 3 — Upper Glutes + Arms",
    focus: "8-Week Tracker · glute activation, shoulders/arms, core",
    goals: ["sculpt", "strength"],
    equipment: ["bands", "dumbbells", "bodyweight"],
    durationMin: 45,
    level: "moderate",
    exercises: [
      { name: "Single-Leg Hip Thrusts", target: "4 × 10 / side" },
      { name: "Fire Hydrants (band)", target: "3 × 15 / side" },
      { name: "Rainbow Kicks", target: "3 × 12 / side" },
      { name: "Standing Banded Abductions", target: "3 × 20 / side" },
      { name: "Glute Bridge Hold + Abduction Pulses", target: "3 × 20" },
      { name: "Close-Grip Push-Ups (knees fine)", target: "4 × 10" },
      { name: "Tricep Kickbacks", target: "3 × 12 / side" },
      { name: "Hammer Curls", target: "3 × 12" },
      { name: "Lateral Raises", target: "3 × 12" },
      { name: "Mountain Climbers", target: "3 × 30" },
      { name: "Hollow Hold", target: "3 × 30 sec" },
      { name: "Reverse Crunches", target: "3 × 15" },
    ],
  },
  {
    id: "lib_glute_thu",
    name: "Glute Program · Day 4 — Glutes + Legs",
    focus: "8-Week Tracker · heavy hip thrusts, unilateral legs, core",
    goals: ["strength", "sculpt"],
    equipment: ["dumbbells", "bodyweight"],
    durationMin: 45,
    level: "tough",
    exercises: [
      { name: "Dumbbell Hip Thrusts (heaviest weight)", target: "4 × 12" },
      { name: "Step-Ups on Chair (lean slightly forward)", target: "3 × 12 / side" },
      { name: "Sumo Squats", target: "4 × 15" },
      { name: "Reverse Lunges", target: "3 × 12 / side" },
      { name: "Donkey Kicks (ankle weights)", target: "3 × 15 / side" },
      { name: "Wall Sit", target: "3 × 45 sec" },
      { name: "Plank Hip Dips", target: "3 × 20" },
      { name: "Flutter Kicks", target: "3 × 30 sec" },
      { name: "Dead Bugs", target: "3 × 12 / side" },
    ],
  },
  {
    id: "lib_glute_fri",
    name: "Glute Program · Day 5 — Upper Glutes + Arms",
    focus: "8-Week Tracker · beat Day 1's numbers, shoulders, core",
    goals: ["sculpt", "strength"],
    equipment: ["bands", "dumbbells", "bodyweight"],
    durationMin: 45,
    level: "moderate",
    exercises: [
      { name: "Banded Hip Thrusts (beat Day 1!)", target: "4 × 15" },
      { name: "Frog Pumps", target: "3 × 25" },
      { name: "Kneeling Banded Kickback (upward angle)", target: "3 × 15 / side" },
      { name: "Clamshells", target: "3 × 20 / side" },
      { name: "Seated Abductions", target: "3 × 30" },
      { name: "Shoulder Press", target: "4 × 12" },
      { name: "Skull Crushers (lying tricep extension)", target: "3 × 12" },
      { name: "Bicep 21s", target: "3 sets" },
      { name: "Plank", target: "3 × 60 sec" },
      { name: "Leg Raises", target: "3 × 15" },
      { name: "Russian Twists", target: "3 × 30" },
    ],
  },
  {
    id: "lib_glute_sat",
    name: "Glute Program · Day 6 — Full Burn",
    focus: "8-Week Tracker · full-body glutes, legs, arms + a core circuit",
    goals: ["strength", "conditioning", "sculpt"],
    equipment: ["bands", "dumbbells", "bodyweight"],
    durationMin: 50,
    level: "tough",
    exercises: [
      { name: "Romanian Deadlifts", target: "4 × 12" },
      { name: "Hip Thrusts", target: "4 × 15" },
      { name: "Goblet Squats", target: "3 × 12" },
      { name: "Curtsy Lunges", target: "3 × 10 / side" },
      { name: "Lateral Band Walks", target: "3 × 20" },
      { name: "Tricep Dips", target: "3 × 15" },
      { name: "Bicep Curls", target: "3 × 12" },
      { name: "Overhead Press", target: "3 × 12" },
      { name: "Core Circuit: mtn climbers / rev crunches / plank / bicycles", target: "3 rounds × 30 sec each" },
    ],
  },
  {
    id: "lib_glute_sun",
    name: "Glute Program · Day 7 — Stretch, Mobility & Glute Pump",
    focus: "8-Week Tracker · active recovery — mobility, a light glute pump, and core",
    goals: ["mobility", "sculpt"],
    equipment: ["bands", "bodyweight"],
    durationMin: 30,
    level: "starter",
    exercises: [
      { name: "Glute Bridge March", target: "3 × 20 total" },
      { name: "Banded Glute Bridge Hold + Pulses", target: "3 × 20" },
      { name: "Clamshells (light band)", target: "3 × 20 / side" },
      { name: "World's Greatest Stretch", target: "5 / side, slow" },
      { name: "Hip Flexor Stretch", target: "60 sec / side" },
      { name: "Figure-4 Glute Stretch", target: "60 sec / side" },
      { name: "Cat–Cow + Thread the Needle", target: "2 min flow" },
      { name: "Dead Bug", target: "3 × 12 / side" },
      { name: "Side Plank", target: "2 × 30 sec / side" },
    ],
  },

  // --- More at-home routines ---
  {
    id: "lib_full_body_dumbbell",
    name: "Full-Body Dumbbell Strength",
    focus: "One pair of dumbbells, every major muscle — the efficient default",
    goals: ["strength", "sculpt"],
    equipment: ["dumbbells"],
    durationMin: 40,
    level: "moderate",
    exercises: [
      { name: "Dumbbell Goblet Squat", target: "4 × 10" },
      { name: "Dumbbell Romanian Deadlift", target: "4 × 10" },
      { name: "Dumbbell Floor Press", target: "4 × 10" },
      { name: "Single-Arm Dumbbell Row", target: "3 × 12 / arm" },
      { name: "Dumbbell Reverse Lunge", target: "3 × 10 / leg" },
      { name: "Dumbbell Shoulder Press", target: "3 × 10" },
    ],
  },
  {
    id: "lib_kb_glute_conditioning",
    name: "Kettlebell Glute & Cardio",
    focus: "Hips, hamstrings, and heart rate with a single kettlebell",
    goals: ["sculpt", "conditioning"],
    equipment: ["kettlebell"],
    durationMin: 28,
    level: "moderate",
    exercises: [
      { name: "Kettlebell Swing", target: "5 × 20" },
      { name: "Kettlebell Sumo Deadlift", target: "4 × 12" },
      { name: "Kettlebell Reverse Lunge", target: "3 × 10 / leg" },
      { name: "Kettlebell Single-Leg Deadlift", target: "3 × 8 / leg" },
      { name: "Kettlebell Halo", target: "3 × 10 / direction" },
    ],
  },
  {
    id: "lib_bike_endurance_builder",
    name: "Bike Tempo Builder",
    focus: "Steady tempo blocks to build an aerobic base on the bike",
    goals: ["conditioning", "habit"],
    equipment: ["bike"],
    durationMin: 30,
    level: "moderate",
    exercises: [
      { name: "Warm-up spin", target: "5 min easy" },
      { name: "Tempo blocks", target: "4 × (4 min moderate-hard / 2 min easy)" },
      { name: "Cool-down spin", target: "5 min easy" },
    ],
  },
  {
    id: "lib_rope_medball_hiit",
    name: "Rope + Medicine Ball HIIT",
    focus: "Full-body conditioning circuit — rope, ball, and floor",
    goals: ["conditioning", "sculpt"],
    equipment: ["jump_rope", "medicine_ball"],
    durationMin: 24,
    level: "tough",
    exercises: [
      { name: "Jump Rope", target: "45s fast" },
      { name: "Medicine Ball Slams", target: "15 reps" },
      { name: "Med Ball Squat Throw", target: "12 reps" },
      { name: "Rope Fast Feet", target: "45s" },
      { name: "Rest, then repeat", target: "5 rounds" },
    ],
  },
  {
    id: "lib_band_full_body",
    name: "Resistance Band Full-Body",
    focus: "Travel-friendly, joint-easy strength with just bands",
    goals: ["strength", "mobility"],
    equipment: ["bands"],
    durationMin: 30,
    level: "starter",
    exercises: [
      { name: "Banded Squat", target: "4 × 15" },
      { name: "Banded Row", target: "4 × 15" },
      { name: "Banded Chest Press", target: "3 × 15" },
      { name: "Banded Deadlift", target: "3 × 15" },
      { name: "Banded Overhead Press", target: "3 × 15" },
      { name: "Banded Glute Bridge", target: "3 × 20" },
    ],
  },
  {
    id: "lib_bodyweight_hiit",
    name: "No-Equipment HIIT",
    focus: "Nothing but you and the floor — quick, sweaty, anywhere",
    goals: ["conditioning", "habit"],
    equipment: ["bodyweight"],
    durationMin: 18,
    level: "moderate",
    exercises: [
      { name: "Squat Jumps", target: "40s / 20s rest" },
      { name: "Push-ups", target: "40s / 20s rest" },
      { name: "Mountain Climbers", target: "40s / 20s rest" },
      { name: "Reverse Lunges", target: "40s / 20s rest" },
      { name: "Burpees", target: "40s / 20s rest" },
      { name: "Repeat", target: "3 rounds" },
    ],
  },
  {
    id: "lib_rower_strength_combo",
    name: "Row & Dumbbell Combo",
    focus: "Alternating rowing bursts with dumbbell strength sets",
    goals: ["conditioning", "strength"],
    equipment: ["rower", "dumbbells"],
    durationMin: 32,
    level: "tough",
    exercises: [
      { name: "Row", target: "500m hard" },
      { name: "Dumbbell Thrusters", target: "12 reps" },
      { name: "Dumbbell Row", target: "12 / arm" },
      { name: "Row", target: "500m hard" },
      { name: "Repeat", target: "4 rounds" },
    ],
  },
  {
    id: "lib_pilates_core_flow",
    name: "Mat Core & Stability Flow",
    focus: "Slow, controlled mat work for deep core and posture",
    goals: ["sculpt", "mobility"],
    equipment: ["bodyweight"],
    durationMin: 22,
    level: "starter",
    exercises: [
      { name: "Hundred", target: "100 pulses" },
      { name: "Single-Leg Stretch", target: "3 × 10 / leg" },
      { name: "Glute Bridge March", target: "3 × 20 total" },
      { name: "Bird Dog", target: "3 × 10 / side" },
      { name: "Side-Lying Leg Lifts", target: "3 × 15 / side" },
    ],
  },
];

/**
 * A YouTube search link for an exercise's proper form. Using a search (rather
 * than a hardcoded video id) means the link never rots and always surfaces
 * current demos — strip any parenthetical cue first so the query stays clean.
 */
export function formVideoUrl(exercise: string): string {
  const clean = exercise.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${clean} proper form`)}`;
}

/** Workouts you can do with the equipment you own (every required piece). */
export function workoutsForEquipment(owned: Equipment[]): LibraryWorkout[] {
  const set = new Set<Equipment>([...owned, "bodyweight"]);
  return WORKOUT_LIBRARY.filter((w) => w.equipment.every((e) => set.has(e)));
}
