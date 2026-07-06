/**
 * The "foolproof plan" — one weekly plan that ties together the three things a
 * goal actually needs: the right workouts (with form videos), goal-aligned
 * meal-prep, and the grocery list to make it happen. It's assembled from the
 * on-device workout + recipe libraries and the user's selected goals and gear,
 * so it always fits what she can actually do at home.
 */

import type { FitnessGoal } from "../types";
import type { HubState } from "../store/hub";
import { RECIPE_LIBRARY, type LibraryRecipe } from "../data/recipeLibrary";
import { GOAL_META } from "./plan";
import { workoutsForEquipment, type LibraryWorkout } from "./library";

export interface PlanDay {
  label: string; // Mon, Tue…
  workout: LibraryWorkout | null; // null = rest / active recovery
}

export interface FoolproofPlan {
  goalLabels: string[];
  /** How many training days the week is built around. */
  trainingDays: number;
  schedule: PlanDay[];
  /** The distinct workouts used this week. */
  workouts: LibraryWorkout[];
  /** Batch-cook recipes aligned to the goal. */
  meals: LibraryRecipe[];
  /** De-duplicated grocery list to make the meals (ingredient names). */
  groceries: string[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** How many sessions the week is built around, from the primary goals. */
function targetDays(goals: FitnessGoal[]): number {
  if (goals.includes("strength") || goals.includes("sculpt")) return 4;
  if (goals.includes("conditioning")) return 4;
  if (goals.length === 0 || goals.includes("habit")) return 3;
  return 3; // mobility-led weeks stay gentle
}

/** Score a recipe for the goal: strength/sculpt lean higher-calorie/protein,
 *  conditioning leans lighter/high-volume, everything else stays balanced. */
function mealScore(recipe: LibraryRecipe, goals: FitnessGoal[]): number {
  const wantsBulk = goals.includes("strength") || goals.includes("sculpt");
  const wantsLean = goals.includes("conditioning");
  if (wantsBulk) return recipe.calories; // prefer the more substantial plates
  if (wantsLean) return -recipe.calories; // prefer lighter, high-volume plates
  return -Math.abs(recipe.calories - 420); // closest to a balanced ~420 cal
}

export function buildFoolproofPlan(state: HubState): FoolproofPlan {
  const goals = state.fitnessGoals;
  const goalLabels = goals.length > 0 ? goals.map((g) => GOAL_META[g].label) : ["A balanced week"];

  // Workouts she can actually do with her gear, prioritising goal matches.
  const available = workoutsForEquipment(state.equipment);
  const matches = goals.length
    ? available.filter((w) => w.goals.some((g) => goals.includes(g)))
    : available;
  const pool = (matches.length > 0 ? matches : available).slice(0, 4);

  const trainingDays = Math.min(targetDays(goals), Math.max(1, pool.length) + 1);

  // Spread training across the week (rest days interleaved), cycling the pool.
  const trainIdx = new Set<number>();
  if (trainingDays >= 3) [0, 2, 4].forEach((i) => trainIdx.add(i));
  if (trainingDays >= 4) trainIdx.add(5);
  if (trainingDays >= 5) trainIdx.add(1);
  if (trainingDays >= 6) trainIdx.add(3);

  let cursor = 0;
  const schedule: PlanDay[] = DAY_LABELS.map((label, i) => {
    if (pool.length > 0 && trainIdx.has(i)) {
      const workout = pool[cursor % pool.length]!;
      cursor += 1;
      return { label, workout };
    }
    return { label, workout: null };
  });

  const workouts = [...new Map(schedule.filter((d) => d.workout).map((d) => [d.workout!.id, d.workout!])).values()];

  // Four batch-cook meals aligned to the goal.
  const meals = [...RECIPE_LIBRARY]
    .sort((a, b) => mealScore(b, goals) - mealScore(a, goals))
    .slice(0, 4);

  // Grocery list = every distinct ingredient across the meals.
  const groceries = [...new Set(meals.flatMap((m) => m.ingredients))];

  return { goalLabels, trainingDays, schedule, workouts, meals, groceries };
}
