/**
 * The 8-Week Glute & Sculpt program, transcribed from the printable tracker
 * PDF (public/plans/8-week-glute-sculpt-tracker.pdf) into structured data so the
 * app can render each day, list its workouts, and track completion week by week.
 *
 * Static template — the *plan* never changes; a user's progress against it lives
 * in the store (`programProgress` / `programWeek`).
 */

export const PROGRAM_WEEKS = 8;

/** One movement in a day's workout. `scheme` is the sets × reps prescription. */
export interface ProgramExercise {
  name: string;
  scheme: string;
}

/** A single training day (or the Sunday rest day). Day 1 = Monday … 7 = Sunday. */
export interface ProgramDay {
  /** 1 = Monday … 7 = Sunday, matching the tracker's week layout. */
  day: number;
  /** Weekday label, e.g. "Monday". */
  name: string;
  /** Focus line from the PDF, e.g. "Upper Glutes + Arms + Core". */
  focus: string;
  /** True for the Sunday rest day (no exercises). */
  rest?: boolean;
  /** Coaching note (used for the rest day). */
  note?: string;
  exercises: ProgramExercise[];
}

export interface GluteProgram {
  title: string;
  subtitle: string;
  equipment: string[];
  rules: string[];
  days: ProgramDay[];
}

export const GLUTE_PROGRAM: GluteProgram = {
  title: "8-Week Glute & Sculpt Tracker",
  subtitle: "6 days a week · at home · beat last week's numbers",
  equipment: [
    "Loop resistance bands (light, medium, heavy)",
    "Adjustable dumbbells or 5/10/15 lb pairs",
    "Ankle weights (optional — great for kickbacks)",
    "Yoga mat",
    "Sturdy chair or bench",
  ],
  rules: [
    "Rest 45–60 seconds between sets. Sunday is your rest day — muscles grow on rest.",
    "Progressive overload: every week add reps, a heavier band, or more weight.",
    "Protein: aim for 0.7–1 g per lb of bodyweight daily — this is what grows glutes and reveals a flat stomach.",
    "Squeeze glutes hard at the top of every rep — hold 1–2 seconds.",
    "Log the weight/band you used each week so you can track your overload.",
  ],
  days: [
    {
      day: 1,
      name: "Monday",
      focus: "Upper Glutes + Arms + Core",
      exercises: [
        { name: "Banded hip thrusts (feet close, band above knees)", scheme: "4 × 15" },
        { name: "Frog pumps", scheme: "3 × 20" },
        { name: "Banded lateral walks", scheme: "3 × 20 steps" },
        { name: "Standing kickbacks at 45° (ankle weights)", scheme: "3 × 15/side" },
        { name: "Seated banded hip abductions (lean forward)", scheme: "3 × 25" },
        { name: "Tricep dips on chair", scheme: "4 × 12" },
        { name: "Overhead dumbbell tricep extension", scheme: "3 × 12" },
        { name: "Bicep curls", scheme: "3 × 12" },
        { name: "Dead bugs", scheme: "3 × 12/side" },
        { name: "Reverse crunches", scheme: "3 × 15" },
        { name: "Forearm plank", scheme: "3 × 45 sec" },
      ],
    },
    {
      day: 2,
      name: "Tuesday",
      focus: "Glutes + Legs + Core",
      exercises: [
        { name: "Dumbbell Romanian deadlifts", scheme: "4 × 12" },
        { name: "Bulgarian split squats", scheme: "3 × 10/side" },
        { name: "Goblet squats", scheme: "4 × 12" },
        { name: "Curtsy lunges", scheme: "3 × 12/side" },
        { name: "Single-leg glute bridge", scheme: "3 × 12/side" },
        { name: "Calf raises", scheme: "3 × 20" },
        { name: "Leg raises", scheme: "3 × 15" },
        { name: "Bicycle crunches", scheme: "3 × 20" },
        { name: "Side plank", scheme: "2 × 30 sec/side" },
      ],
    },
    {
      day: 3,
      name: "Wednesday",
      focus: "Upper Glutes + Arms + Core",
      exercises: [
        { name: "Single-leg hip thrusts", scheme: "4 × 10/side" },
        { name: "Fire hydrants (band)", scheme: "3 × 15/side" },
        { name: "Rainbow kicks", scheme: "3 × 12/side" },
        { name: "Standing banded abductions", scheme: "3 × 20/side" },
        { name: "Glute bridge hold + abduction pulses", scheme: "3 × 20" },
        { name: "Close-grip push-ups (knees fine)", scheme: "4 × 10" },
        { name: "Tricep kickbacks", scheme: "3 × 12/side" },
        { name: "Hammer curls", scheme: "3 × 12" },
        { name: "Lateral raises", scheme: "3 × 12" },
        { name: "Mountain climbers", scheme: "3 × 30" },
        { name: "Hollow hold", scheme: "3 × 30 sec" },
        { name: "Reverse crunches", scheme: "3 × 15" },
      ],
    },
    {
      day: 4,
      name: "Thursday",
      focus: "Glutes + Legs + Core",
      exercises: [
        { name: "Dumbbell hip thrusts (heaviest weight)", scheme: "4 × 12" },
        { name: "Step-ups on chair (lean slightly forward)", scheme: "3 × 12/side" },
        { name: "Sumo squats", scheme: "4 × 15" },
        { name: "Reverse lunges", scheme: "3 × 12/side" },
        { name: "Donkey kicks (ankle weights)", scheme: "3 × 15/side" },
        { name: "Wall sit", scheme: "3 × 45 sec" },
        { name: "Plank hip dips", scheme: "3 × 20" },
        { name: "Flutter kicks", scheme: "3 × 30 sec" },
        { name: "Dead bugs", scheme: "3 × 12/side" },
      ],
    },
    {
      day: 5,
      name: "Friday",
      focus: "Upper Glutes + Arms + Core",
      exercises: [
        { name: "Banded hip thrusts (beat Monday's numbers!)", scheme: "4 × 15" },
        { name: "Frog pumps", scheme: "3 × 25" },
        { name: "Kneeling banded kickback (upward angle)", scheme: "3 × 15/side" },
        { name: "Clamshells", scheme: "3 × 20/side" },
        { name: "Seated abductions", scheme: "3 × 30" },
        { name: "Shoulder press", scheme: "4 × 12" },
        { name: "Skull crushers (lying tricep extension)", scheme: "3 × 12" },
        { name: "Bicep 21s", scheme: "3 sets" },
        { name: "Plank", scheme: "3 × 60 sec" },
        { name: "Leg raises", scheme: "3 × 15" },
        { name: "Russian twists", scheme: "3 × 30" },
      ],
    },
    {
      day: 6,
      name: "Saturday",
      focus: "Full Burn: Glutes + Legs + Arms + Core",
      exercises: [
        { name: "Romanian deadlifts", scheme: "4 × 12" },
        { name: "Hip thrusts", scheme: "4 × 15" },
        { name: "Goblet squats", scheme: "3 × 12" },
        { name: "Curtsy lunges", scheme: "3 × 10/side" },
        { name: "Lateral band walks", scheme: "3 × 20" },
        { name: "Tricep dips", scheme: "3 × 15" },
        { name: "Bicep curls", scheme: "3 × 12" },
        { name: "Overhead press", scheme: "3 × 12" },
        { name: "Core circuit: mtn climbers / rev crunches / plank / bicycles", scheme: "3 rounds × 30 sec each" },
      ],
    },
    {
      day: 7,
      name: "Sunday",
      focus: "Rest day",
      rest: true,
      note: "REST DAY. Stretch, walk, hydrate. You earned it.",
      exercises: [],
    },
  ],
};

/** Just the training days (Mon–Sat) — Sunday rest excluded. */
export const TRAINING_DAYS = GLUTE_PROGRAM.days.filter((d) => !d.rest);

/** Total trackable sessions across the whole program (6 days × 8 weeks = 48). */
export const PROGRAM_TOTAL_SESSIONS = TRAINING_DAYS.length * PROGRAM_WEEKS;

/** Stable key for a (week, day) completion cell in `programProgress`. */
export function programCellKey(week: number, day: number): string {
  return `w${week}d${day}`;
}
