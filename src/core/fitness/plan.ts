/**
 * Goal-driven weekly plan — maps selected fitness goals to a recommended
 * split across the pre-configured routines (goal-based programming, the
 * pattern behind Fitbod/Nike Training Club-style personalization).
 */

import type { FitnessGoal } from "../types";

export const GOAL_META: Record<FitnessGoal, { label: string; blurb: string }> = {
  strength: { label: "Build strength", blurb: "progressive overload, heavier lifts" },
  sculpt: { label: "Tone & sculpt", blurb: "time under tension, higher reps" },
  conditioning: { label: "Fat loss & conditioning", blurb: "keep the heart rate up" },
  mobility: { label: "Mobility & recovery", blurb: "move well, recover faster" },
  habit: { label: "Build the habit", blurb: "consistency beats intensity" },
};

export interface PlanLine {
  routineId: string;
  sessions: number;
  reason: string;
}

/** Deterministic goal → weekly split mapping over the built-in routines. */
export function recommendPlan(goals: FitnessGoal[]): PlanLine[] {
  const sessions = new Map<string, { sessions: number; reasons: Set<string> }>();
  const add = (routineId: string, n: number, reason: string) => {
    const entry = sessions.get(routineId) ?? { sessions: 0, reasons: new Set<string>() };
    entry.sessions = Math.max(entry.sessions, n);
    entry.reasons.add(reason);
    sessions.set(routineId, entry);
  };

  for (const goal of goals) {
    switch (goal) {
      case "strength":
        add("routine_glute", 2, "drives strength");
        add("routine_recovery", 1, "supports recovery between lifts");
        break;
      case "sculpt":
        add("routine_lagree", 2, "time under tension");
        add("routine_glute", 1, "shapes the posterior chain");
        break;
      case "conditioning":
        add("routine_lagree", 2, "slow-twitch endurance burn");
        add("routine_recovery", 1, "active calorie floor");
        break;
      case "mobility":
        add("routine_recovery", 2, "mobility & circulation");
        break;
      case "habit":
        add("routine_lagree", 1, "anchor session");
        add("routine_recovery", 1, "easy win to keep the streak");
        break;
    }
  }

  // Sensible default when no goals picked yet
  if (sessions.size === 0) {
    add("routine_lagree", 1, "balanced starting point");
    add("routine_glute", 1, "balanced starting point");
    add("routine_recovery", 1, "balanced starting point");
  }

  return [...sessions.entries()]
    .map(([routineId, v]) => ({
      routineId,
      sessions: v.sessions,
      reason: [...v.reasons].join(" · "),
    }))
    .sort((a, b) => b.sessions - a.sessions);
}
