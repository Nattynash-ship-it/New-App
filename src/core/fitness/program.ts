/**
 * The 8-Week Glute & Sculpt program, laid out day by day from a start date.
 * Every day (including Sunday) has a workout; the week repeats the 7-day split
 * and the tracker note reminds you to progress the load/reps each week. Days
 * are dated so "today" is easy to find and completion is tracked per date.
 */

import { addDays, fromISODate } from "../dates";
import { WORKOUT_LIBRARY, type LibraryWorkout } from "./library";

export const PROGRAM_WEEKS = 8;
export const PROGRAM_ID = "glute8w";

/** Day-of-week (0 = Sunday … 6 = Saturday) → the workout for that day. */
const SPLIT: Record<number, string> = {
  1: "lib_glute_mon",
  2: "lib_glute_tue",
  3: "lib_glute_wed",
  4: "lib_glute_thu",
  5: "lib_glute_fri",
  6: "lib_glute_sat",
  0: "lib_glute_sun",
};

const byId = new Map(WORKOUT_LIBRARY.map((w) => [w.id, w]));

/** A weekly progression cue, keyed by week number (1-based). */
function progressionNote(week: number): string {
  if (week === 1) return "Week 1 — set your baseline; focus on form and full range.";
  if (week <= 3) return `Week ${week} — add 1–2 reps per set or a little more load than last week.`;
  if (week === 4) return "Week 4 — deload slightly if you're sore; keep the movement quality high.";
  if (week <= 6) return `Week ${week} — push the weight up; the last 2 reps should feel hard.`;
  if (week === 7) return "Week 7 — peak week: heaviest hip thrusts, tightest form.";
  return "Week 8 — finish strong and beat your Week 1 numbers everywhere.";
}

export interface ProgramDay {
  /** ISO date this day falls on. */
  date: string;
  /** 1-based day number across the whole program (1–56). */
  dayNumber: number;
  /** 1-based week number (1–8). */
  week: number;
  /** Short weekday label, e.g. "Sun". */
  weekdayLabel: string;
  workout: LibraryWorkout;
  progressionNote: string;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Build the full 8-week schedule starting on `startDate` (ISO). */
export function buildGluteProgram(startDate: string): ProgramDay[] {
  const days: ProgramDay[] = [];
  for (let i = 0; i < PROGRAM_WEEKS * 7; i++) {
    const date = addDays(startDate, i);
    const dow = fromISODate(date).getDay();
    const workout = byId.get(SPLIT[dow]!);
    if (!workout) continue;
    const week = Math.floor(i / 7) + 1;
    days.push({
      date,
      dayNumber: i + 1,
      week,
      weekdayLabel: WEEKDAY[dow]!,
      workout,
      progressionNote: progressionNote(week),
    });
  }
  return days;
}
